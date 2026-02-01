import ExcelJS from 'exceljs';
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

  // Add Rows - Explicit mapping to handle potential Arrow Proxies
  const plainRows = rows.map(row => {
    const obj: any = {};
    columns.forEach(col => {
        obj[col.name] = row[col.name];
    });
    return obj;
  });

  sheet.addRows(plainRows);

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
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/csvExportWorker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e) => {
      const { status, blob, error } = e.data;
      if (status === 'success') {
        triggerDownload(blob, filename);
        worker.terminate();
        resolve();
      } else {
        worker.terminate();
        reject(new Error(error));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(e);
    };

    worker.postMessage({
      rows,
      columns,
      delimiter,
      encoding,
      includeHeaders,
    });
  });
};
