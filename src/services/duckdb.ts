import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { sniffFile } from '../lib/sniffer';

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_eh,
        mainWorker: eh_worker,
    },
};

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;
let initPromise: Promise<{ db: duckdb.AsyncDuckDB; conn: duckdb.AsyncDuckDBConnection }> | null = null;

export const initDuckDB = async () => {
    if (db && conn) return { db, conn };
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // Select bundle based on browser capability
            const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
            const worker = new Worker(bundle.mainWorker!);

            const logger = new duckdb.ConsoleLogger();
            db = new duckdb.AsyncDuckDB(logger, worker);

            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            conn = await db.connect();

            console.log("🦆 Glouton Engine (DuckDB) Initialized");
            return { db, conn };
        } catch (e) {
            initPromise = null;
            throw e;
        }
    })();

    return initPromise;
};

export const getDB = () => {
    if (!db || !conn) throw new Error("DuckDB not initialized. Call initDuckDB() first.");
    return { db, conn };
};

export const query = async (sql: string) => {
    const { conn } = getDB();
    if (!conn) throw new Error("Connection lost");
    
    const result = await conn.query(sql);
    return result.toArray();
};

// Helper to check for magic bytes (Zip signature: PK\x03\x04)
const isZipFile = async (file: File): Promise<boolean> => {
    if (file.size < 4) return false;
    const slice = file.slice(0, 4);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
};

export const registerFile = async (file: File): Promise<string> => {
    const { db } = getDB();
    if (!db) throw new Error("DB not ready");

    const isExcelExtension = /\.xlsx$/i.test(file.name);
    let isExcel = false;

    if (isExcelExtension) {
        // Only check magic bytes if extension matches to avoid unnecessary reads for every file
        isExcel = await isZipFile(file);
    }

    if (isExcel) {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1); // Load first sheet
      
      if (!worksheet) throw new Error("Excel file is empty or has no sheets");

      // Use ExcelJS native buffer write (much more memory efficient)
      const csvBuffer = await workbook.csv.writeBuffer();
      const blob = new Blob([csvBuffer], { type: 'text/csv' });
      
      const tempName = `converted_${file.name.replace(/\s/g, '_')}.csv`;
      
      // Register the Blob directly, avoiding string allocation
      await db.registerFileHandle(tempName, blob, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
      return tempName;
    } else {
      await db.registerFileHandle(file.name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
      return file.name;
    }
};

export const ingestCSV = async (file: File) => {
    const { conn } = getDB();
    if (!conn) return;

    const tableName = 'current_dataset';
    const fileNameToLoad = await registerFile(file);
    
    await conn.query(`DROP TABLE IF EXISTS ${tableName}`);

    // Detect if the file was converted to CSV or if it was processed as a raw file.
    // registerFile returns a temp CSV filename (starting with 'converted_') if it processed an Excel file.
    const isConverted = fileNameToLoad.startsWith('converted_') && fileNameToLoad.endsWith('.csv');

    // Use read_csv_auto if:
    // 1. The file was converted to CSV by registerFile.
    // 2. The original file has an .xlsx extension (case-insensitive).
    //    Note: If registerFile did NOT convert it (e.g., fake .xlsx), it's likely a raw CSV.
    //    DuckDB's read_csv_auto handles CSVs robustly, even with .xlsx extension.
    if (isConverted || /\.xlsx$/i.test(file.name)) {
         await conn.query(`CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${fileNameToLoad}')`);
    } else {
        // Sniff for Encoding and Delimiter
        let delimiter = ',';
        let encoding = 'UTF-8';
        let format = 'CSV';
        
        try {
            const sniff = await sniffFile(file);
            delimiter = sniff.delimiter;
            encoding = sniff.encoding;
            format = sniff.format || 'CSV';
            console.log("🕵️‍♀️ Sniffer Result:", sniff);
        } catch (e) {
            console.warn("Sniff failed, falling back to defaults", e);
        }

        const encodingParam = encoding === 'WINDOWS-1252' ? ", encoding='latin-1'" : "";
        
        let readSql = '';
        if (format === 'JSON') {
             readSql = `read_json_auto('${fileNameToLoad}')`;
        } else {
             readSql = `read_csv('${fileNameToLoad}', 
                header=true,
                delim='${delimiter}',
                normalize_names=true,
                ignore_errors=true
                ${encodingParam}
            )`;
        }

        try {
            console.log("Attempting to materialize table into memory...");
            await conn.query(`CREATE TABLE ${tableName} AS SELECT * FROM ${readSql}`);
        } catch (e) {
            console.warn("Memory limit exceeded or creation failed. Falling back to ZERO-COPY VIEW mode.", e);
            // Fallback: Create a View (Zero-Copy)
            // This reads directly from the file handle on every query. Slower, but infinite scale.
            await conn.query(`DROP TABLE IF EXISTS ${tableName}`); // Cleanup partial
            await conn.query(`CREATE VIEW ${tableName} AS SELECT * FROM ${readSql}`);
        }
    }
    
    // Get Schema
    const schema = await conn.query(`PRAGMA table_info('${tableName}')`);
    
    // Get Stats (Count)
    const count = await conn.query(`SELECT COUNT(*) as total FROM ${tableName}`);
    
    return {
        tableName,
        rowCount: Number(count.toArray()[0].total),
        columns: schema.toArray().map((col) => ({
            name: col.name,
            type: col.type
        }))
    };
};
