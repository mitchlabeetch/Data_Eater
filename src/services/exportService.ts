import ExcelJS from 'exceljs';
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';
import { getDB } from './duckdb';

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

export interface ExportOptions {
  filename: string;
  format: 'csv' | 'xlsx' | 'json' | 'parquet' | 'pbip_theme';
  encoding: 'utf-8' | 'windows-1252';
  delimiter: ',' | ';' | '\t';
  includeHeaders: boolean;
  tableName?: string; // For direct DB export
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  filename: 'export_data',
  format: 'csv',
  encoding: 'utf-8',
  delimiter: ',',
  includeHeaders: true,
};

export const PRESETS: Record<string, ExportOptions> = {
  'AS400_Standard': {
    filename: 'export_as400',
    format: 'csv',
    encoding: 'windows-1252',
    delimiter: ';',
    includeHeaders: false,
  },
  'Excel_Clean': {
    filename: 'export_clean',
    format: 'xlsx',
    encoding: 'utf-8',
    delimiter: ',',
    includeHeaders: true,
  },
  'Web_JSON': {
    filename: 'export_api',
    format: 'json',
    encoding: 'utf-8',
    delimiter: ',',
    includeHeaders: true,
  },
  'PowerBI_Parquet': {
    filename: 'export_powerbi',
    format: 'parquet',
    encoding: 'utf-8',
    delimiter: ',',
    includeHeaders: true,
  }
};

export const generateExport = async (rows: any[] | null, columns: { name: string }[], options: ExportOptions) => {
  const { filename, format, encoding, delimiter, includeHeaders, tableName } = options;
  
  if (format === 'pbip_theme') {
    exportPowerBITheme(`${filename}.json`);
    return;
  }

  const fullFilename = `${filename}.${format}`;

  // Priority: Direct DB Export (Zero-Copy / Low Memory) when tableName is provided
  if (tableName) {
    if (format === 'parquet') {
      await exportParquetFromDB(fullFilename, tableName);
      return;
    }
    // Only support CSV from DB if UTF-8 (DuckDB COPY outputs UTF-8)
    if (format === 'csv' && encoding === 'utf-8') {
      await exportCSVFromDB(tableName, columns, fullFilename, delimiter, includeHeaders);
      return;
    }
    // JSON from DB
    if (format === 'json') {
      await exportJSONFromDB(tableName, fullFilename);
      return;
    }
  }

  // Fallback: JS-based Export (requires rows)
  const safeRows = rows || [];

  if (format === 'xlsx') {
    await exportExcel(safeRows, columns, fullFilename);
  } else if (format === 'json') {
    exportJSON(safeRows, fullFilename);
  } else if (format === 'parquet') {
    // If no tableName but format is parquet, use current_dataset
    await exportParquetFromDB(fullFilename, 'current_dataset');
  } else {
    await exportCSV(safeRows, columns, fullFilename, encoding, delimiter, includeHeaders);
  }
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportPowerBITheme = (filename: string) => {
  const theme = {
    "name": "Data Eater Neon",
    "dataColors": ["#13ec5b", "#0fa640", "#9db9a6", "#55695e", "#28392e", "#1c2a21"],
    "background": "#FFFFFF",
    "foreground": "#1a1a1a",
    "tableAccent": "#13ec5b",
    "visualStyles": {
        "*": {
            "*": {
                "background": [{ "show": true, "color": { "solid": { "color": "#1a1a1a" } } }],
                "visualHeader": [
                    {
                        "background": { "solid": { "color": "#1a1a1a" } },
                        "foreground": { "solid": { "color": "#ffffff" } }
                    }
                ],
                "outspace": [{ "color": { "solid": { "color": "#1a1a1a" } } }]
            }
        }
    }
  };
  const jsonStr = JSON.stringify(theme, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerDownload(blob, filename);
};

const exportParquetFromDB = async (filename: string, tableName: string) => {
  const { db, conn } = getDB();
  if (!db || !conn) return;

  // Use a simple unique filename to avoid collisions
  const tempFile = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.parquet`;
  try {
    await conn.query(`COPY ${tableName} TO '${tempFile}' (FORMAT PARQUET)`);
    const buffer = await db.copyFileToBuffer(tempFile);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    triggerDownload(blob, filename);
  } finally {
    await db.dropFile(tempFile).catch(() => {});
  }
};

const exportCSVFromDB = async (
  tableName: string,
  columns: { name: string }[],
  filename: string,
  delimiter: string,
  includeHeaders: boolean
) => {
  const { db, conn } = getDB();
  if (!db || !conn) return;

  const tempFile = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.csv`;
  
  // Construct SELECT to ensure column order
  const colsSelect = columns.map(c => `"${c.name}"`).join(', ');

  try {
    const optionsParts = [`FORMAT CSV`, `DELIMITER '${delimiter}'`];
    if (includeHeaders) optionsParts.push('HEADER');
    const optionsStr = optionsParts.join(', ');

    // DuckDB COPY statement
    await conn.query(`
      COPY (SELECT ${colsSelect} FROM ${tableName})
      TO '${tempFile}'
      (${optionsStr})
    `);

    const buffer = await db.copyFileToBuffer(tempFile);
    // DuckDB exports UTF-8. Add BOM for Excel compatibility.
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, buffer], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, filename);
  } finally {
    await db.dropFile(tempFile).catch(() => {});
  }
};

const exportJSONFromDB = async (tableName: string, filename: string) => {
  const { db, conn } = getDB();
  if (!db || !conn) return;

  const tempFile = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`;
  try {
    await conn.query(`COPY ${tableName} TO '${tempFile}' (FORMAT JSON, ARRAY true)`);
    const buffer = await db.copyFileToBuffer(tempFile);
    const blob = new Blob([buffer], { type: 'application/json' });
    triggerDownload(blob, filename);
  } finally {
    await db.dropFile(tempFile).catch(() => {});
  }
};

const exportExcel = async (rows: any[], columns: { name: string }[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');

  // Add Headers
  sheet.columns = columns.map(c => ({ header: c.name, key: c.name }));

  // Add Rows - Iterate to avoid memory spike and support Arrow Proxies
  // Using arrays for rows is more efficient than objects for ExcelJS
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowValues = columns.map(col => row[col.name]);
    sheet.addRow(rowValues);

    // Yield to event loop every 2000 rows to keep UI responsive
    if (i % 2000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Write
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, filename);
};

const exportJSON = (rows: any[], filename: string) => {
  const jsonStr = JSON.stringify(rows, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerDownload(blob, filename);
};

const exportCSV = async (
  rows: any[], 
  columns: { name: string }[], 
  filename: string, 
  encoding: 'utf-8' | 'windows-1252', 
  delimiter: string,
  includeHeaders: boolean
) => {
  const CHUNK_SIZE = 2000;
  const chunks: (string | Uint8Array | Buffer)[] = [];

  // 1. Header
  if (includeHeaders) {
    const headerRow = columns.map(c => `"${c.name}"`).join(delimiter);
    if (encoding === 'windows-1252') {
       chunks.push(iconv.encode(headerRow, 'win1252'));
    } else {
       chunks.push(headerRow);
    }
  }

  // 2. Data Rows (Chunked)
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunkRows = rows.slice(i, i + CHUNK_SIZE);

    const chunkStr = chunkRows.map(row => {
      return columns.map(col => {
        const val = row[col.name];
        const strVal = val === null || val === undefined ? '' : String(val);
        // Escape quotes: simple regex for global replacement
        return `"${strVal.split('"').join('""')}"`;
      }).join(delimiter);
    }).join('\n');

    // Add newline separator if needed
    if (chunks.length > 0) {
        if (encoding === 'windows-1252') {
            chunks.push(iconv.encode('\n', 'win1252'));
        } else {
            chunks.push('\n');
        }
    }

    if (encoding === 'windows-1252') {
       chunks.push(iconv.encode(chunkStr, 'win1252'));
    } else {
       chunks.push(chunkStr);
    }

    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // 3. Create Blob
  let blob: Blob;
  if (encoding === 'windows-1252') {
    blob = new Blob(chunks, { type: 'text/csv;charset=windows-1252' });
  } else {
    // UTF-8 with BOM for Excel compatibility
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    blob = new Blob([bom, ...chunks], { type: 'text/csv;charset=utf-8' });
  }

  triggerDownload(blob, filename);
};
