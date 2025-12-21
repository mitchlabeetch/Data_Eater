import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

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

export const initDuckDB = async () => {
    if (db) return { db, conn };

    // Select bundle based on browser capability
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    const worker = new Worker(bundle.mainWorker!);
    
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    conn = await db.connect();
    
    console.log("🦆 Glouton Engine (DuckDB) Initialized");
    return { db, conn };
};

export const getDB = () => {
    if (!db || !conn) throw new Error("DuckDB not initialized. Call initDuckDB() first.");
    return { db, conn };
};

export const query = async (sql: string) => {
    const { conn } = getDB();
    if (!conn) throw new Error("Connection lost");
    
    const result = await conn.query(sql);
    return result.toArray().map((row) => row.toJSON());
};

export const registerFile = async (file: File): Promise<string> => {
    const { db } = getDB();
    if (!db) throw new Error("DB not ready");

    if (file.name.endsWith('.xlsx')) {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1); // Load first sheet
      
      if (!worksheet) throw new Error("Excel file is empty or has no sheets");

      // Convert to CSV String
      const rows: string[] = [];
      worksheet.eachRow((row, _rowNumber) => {
        const rowValues = (row.values as any[]).slice(1);
        const csvLine = rowValues.map(v => {
          if (v === null || v === undefined) return '';
          const str = String(v).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',');
        rows.push(csvLine);
      });
      
      const csvContent = rows.join('\n');
      const tempName = `converted_${file.name.replace(/\s/g, '_')}.csv`;
      await db.registerFileText(tempName, csvContent);
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
    
    // Create the table automatically
    await conn.query(`DROP TABLE IF EXISTS ${tableName}`);
    await conn.query(`CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${fileNameToLoad}')`);
    
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
