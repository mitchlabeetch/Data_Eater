
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

(async () => {
    try {
        const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
        const worker = new Worker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        const conn = await db.connect();

        console.log("DuckDB Initialized");

        const extensions = await conn.query("SELECT * FROM duckdb_extensions()");
        console.log("Extensions:", extensions.toArray().map((r: any) => r.extension_name));

        try {
            await conn.query("INSTALL spatial; LOAD spatial;");
            console.log("Spatial extension loaded successfully");
        } catch (e) {
            console.error("Failed to load spatial extension:", e);
        }

        await conn.close();
        await db.terminate();
    } catch (e) {
        console.error(e);
    }
})();
