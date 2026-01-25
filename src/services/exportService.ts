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

export const exportFromDB = async (sql: string, options: ExportOptions) => {
  const { filename, format, encoding, delimiter, includeHeaders } = options;
  const { db, conn } = getDB();
  if (!db || !conn) throw new Error("Database not ready");

  if (format === 'pbip_theme') {
      exportPowerBITheme(`${filename}.json`);
      return;
  }

  // Parquet
  if (format === 'parquet') {
     const fullFilename = `${filename}.parquet`;
     const tempFile = 'export_internal.parquet';
     await conn.query(`COPY (${sql}) TO '${tempFile}' (FORMAT PARQUET)`);
     const buffer = await db.copyFileToBuffer(tempFile);
     const blob = new Blob([buffer], { type: 'application/octet-stream' });
     triggerDownload(blob, fullFilename);
     await db.dropFile(tempFile);
     return;
  }

  // JSON
  if (format === 'json') {
     const fullFilename = `${filename}.json`;
     const tempFile = 'export_internal.json';
     await conn.query(`COPY (${sql}) TO '${tempFile}' (FORMAT JSON, ARRAY TRUE)`);
     const buffer = await db.copyFileToBuffer(tempFile);
     const blob = new Blob([buffer], { type: 'application/json' });
     triggerDownload(blob, fullFilename);
     await db.dropFile(tempFile);
     return;
  }

  // CSV
  if (format === 'csv') {
     const fullFilename = `${filename}.csv`;
     const tempFile = 'export_internal.csv';
     const headerParam = includeHeaders ? 'HEADER, ' : '';
     // Ensure delimiter is safe
     await conn.query(`COPY (${sql}) TO '${tempFile}' (${headerParam}DELIMITER '${delimiter}')`);

     const buffer = await db.copyFileToBuffer(tempFile); // Uint8Array
     await db.dropFile(tempFile);

     let blob: Blob;
     if (encoding === 'windows-1252') {
         // Convert UTF-8 buffer to Windows-1252
         const str = new TextDecoder().decode(buffer);
         const winBuffer = iconv.encode(str, 'win1252');
         blob = new Blob([winBuffer], { type: 'text/csv;charset=windows-1252' });
     } else {
         // UTF-8 with BOM
         const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
         blob = new Blob([bom, buffer], { type: 'text/csv;charset=utf-8' });
     }
     triggerDownload(blob, fullFilename);
     return;
  }

  // Fallback for others if any (XLSX not supported here)
  throw new Error(`Format ${format} not supported in exportFromDB`);
};

export const generateExport = async (rows: any[], columns: { name: string }[], options: ExportOptions) => {
  const { filename, format, encoding, delimiter, includeHeaders } = options;
  
  if (format === 'pbip_theme') {
    exportPowerBITheme(`${filename}.json`);
    return;
  }

  const fullFilename = `${filename}.${format}`;

  if (format === 'xlsx') {
    await exportExcel(rows, columns, fullFilename);
  } else if (format === 'json') {
    exportJSON(rows, fullFilename);
  } else if (format === 'parquet') {
    await exportParquet(fullFilename);
  } else {
    exportCSV(rows, columns, fullFilename, encoding, delimiter, includeHeaders);
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

const exportParquet = async (filename: string) => {
  const { db, conn } = getDB();
  if (!db || !conn) return;

  const tempFile = 'export_internal.parquet';
  await conn.query(`COPY current_dataset TO '${tempFile}' (FORMAT PARQUET)`);
  
  const buffer = await db.copyFileToBuffer(tempFile);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  triggerDownload(blob, filename);
  
  await db.dropFile(tempFile);
};

const exportExcel = async (rows: any[], columns: { name: string }[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');

  // Add Headers
  sheet.columns = columns.map(c => ({ header: c.name, key: c.name }));

  // Add Rows
  sheet.addRows(rows);

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

const exportCSV = (
  rows: any[], 
  columns: { name: string }[], 
  filename: string, 
  encoding: 'utf-8' | 'windows-1252', 
  delimiter: string,
  includeHeaders: boolean
) => {
  // 1. Build CSV String
  const headerRow = columns.map(c => `"${c.name}"`).join(delimiter);
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const val = row[col.name];
      const strVal = val === null || val === undefined ? '' : String(val);
      // Escape quotes: simple regex for global replacement
      return `"${strVal.split('"').join('""')}"`;
    }).join(delimiter);
  });

  const csvContent = (includeHeaders ? [headerRow, ...dataRows] : dataRows).join('\n');

  // 2. Handle Encoding
  let blob: Blob;
  if (encoding === 'windows-1252') {
    // Use iconv-lite to encode
    const buffer = iconv.encode(csvContent, 'win1252');
    blob = new Blob([buffer], { type: 'text/csv;charset=windows-1252' });
  } else {
    // UTF-8 with BOM for Excel compatibility
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
  }

  triggerDownload(blob, filename);
};
