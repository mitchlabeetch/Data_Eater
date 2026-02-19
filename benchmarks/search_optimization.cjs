
// Note: This benchmark requires the 'duckdb' node module to be installed.
// Run `npm install duckdb` before executing this script.
const duckdb = require('duckdb');
const { performance } = require('perf_hooks');

const db = new duckdb.Database(':memory:');
const conn = db.connect();

function runQuery(query) {
    return new Promise((resolve, reject) => {
        conn.all(query, (err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
    });
}

async function setup() {
    console.log("Creating table with 50 columns...");

    let schema = ['id INTEGER'];
    for (let k = 0; k < 50; k++) {
        schema.push(`col_${k} VARCHAR`);
    }

    await runQuery(`CREATE TABLE test_data (${schema.join(',')})`);

    // Insert 50k rows
    const chunkSize = 1000;
    const totalRows = 50000;

    console.log("Generating data...");
    for (let i = 0; i < totalRows; i += chunkSize) {
        let values = [];
        for (let j = 0; j < chunkSize; j++) {
            let row = [`${i+j}`];
            for (let k = 0; k < 50; k++) {
                row.push(`'Value_${k}_${i+j}_${Math.random()}'`);
            }
            values.push(`(${row.join(',')})`);
        }
        await runQuery(`INSERT INTO test_data VALUES ${values.join(',')}`);
        if (i % 10000 === 0) process.stdout.write('.');
    }
    console.log("\nData generation complete.");
}

async function benchmark() {
    const term = 'Value_25_100';
    const cols = [];
    for(let k=0; k<50; k++) cols.push({ name: `col_${k}`, type: 'VARCHAR' });

    console.log(`\n--- Benchmarking Search Term: "${term}" with 50 Columns ---`);

    // Warmup
    for(let i=0; i<2; i++) {
        await runQuery(`SELECT count(*) FROM test_data WHERE "col_0" ILIKE '%warmup%'`);
    }

    // Optimized: SMART CAST (No CAST for VARCHAR)
    // Run multiple times to average out variance
    let optTimes = [];
    for (let r = 0; r < 5; r++) {
        const startOpt = performance.now();
        for (let i = 0; i < 5; i++) {
            const conditions = cols
                .map(col => {
                     // Smart logic simulation
                     if (['VARCHAR', 'TEXT'].includes(col.type)) {
                         return `"${col.name}" ILIKE '%${term}%'`;
                     }
                     return `CAST("${col.name}" AS VARCHAR) ILIKE '%${term}%'`;
                })
                .join(' OR ');
            const sql = `SELECT count(*) FROM test_data WHERE ${conditions}`;
            await runQuery(sql);
        }
        const endOpt = performance.now();
        optTimes.push(endOpt - startOpt);
    }
    const avgOpt = optTimes.reduce((a, b) => a + b, 0) / optTimes.length;
    console.log(`Optimized (No CAST) Avg: ${avgOpt.toFixed(2)}ms`);

    // Baseline: CAST ALL
    let baseTimes = [];
    for (let r = 0; r < 5; r++) {
        const startBase = performance.now();
        for (let i = 0; i < 5; i++) {
            const conditions = cols
                .map(col => `CAST("${col.name}" AS VARCHAR) ILIKE '%${term}%'`)
                .join(' OR ');
            const sql = `SELECT count(*) FROM test_data WHERE ${conditions}`;
            await runQuery(sql);
        }
        const endBase = performance.now();
        baseTimes.push(endBase - startBase);
    }
    const avgBase = baseTimes.reduce((a, b) => a + b, 0) / baseTimes.length;
    console.log(`Baseline (CAST) Avg: ${avgBase.toFixed(2)}ms`);

    const improvement = avgBase - avgOpt;
    console.log(`Improvement: ${improvement.toFixed(2)}ms (${(improvement / avgBase * 100).toFixed(1)}%)`);
}

setup().then(() => benchmark()).catch(console.error);
