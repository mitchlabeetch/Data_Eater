
const duckdb = require('duckdb');
const { performance } = require('perf_hooks');
const fs = require('fs');

const runBenchmark = async () => {
  console.log('Running benchmark...');
  const db = new duckdb.Database(':memory:');

  // Wrap db run/all in promises
  const run = (sql) => new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const all = (sql) => new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  // Setup Data
  await run(`CREATE TABLE current_dataset (id INTEGER, phone VARCHAR)`);

  // Generate 10k rows
  let insertValues = [];
  for(let i=0; i<10000; i++) {
    insertValues.push(`(${i}, '060000${String(i).padStart(4, '0')}')`);
  }
  // Insert in chunks to avoid max sql length issues if any
  await run(`INSERT INTO current_dataset VALUES ${insertValues.join(',')}`);

  console.log('Dataset initialized (10k rows).');

  // Generate 2000 mappings
  const mappings = [];
  for(let i=0; i<2000; i++) {
    const oldVal = `060000${String(i).padStart(4, '0')}`;
    const newVal = `+3360000${String(i).padStart(4, '0')}`;
    mappings.push({ old: oldVal, new: newVal });
  }

  // --- Baseline: Batched Updates ---
  console.log('Starting Baseline (Batched Updates)...');
  await run(`CREATE TABLE dataset_baseline AS SELECT * FROM current_dataset`);

  const startBaseline = performance.now();
  const BATCH_SIZE = 200;
  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const chunk = mappings.slice(i, i + BATCH_SIZE);
    const caseBlocks = chunk.map(m => `WHEN '${m.old}' THEN '${m.new}'`).join(' ');
    // In original code: WHERE col IN (...)
    const inClause = chunk.map(m => `'${m.old}'`).join(',');

    const sql = `UPDATE dataset_baseline SET phone = CASE phone ${caseBlocks} ELSE phone END WHERE phone IN (${inClause})`;
    await run(sql);
  }
  const endBaseline = performance.now();
  console.log(`Baseline Time: ${(endBaseline - startBaseline).toFixed(2)}ms`);


  // --- Optimization: Single Join Update ---
  console.log('Starting Optimization (Join Update)...');
  await run(`CREATE TABLE dataset_optimized AS SELECT * FROM current_dataset`);

  const startOpt = performance.now();

  // 1. Create temp table from JSON (simulated here by creating table and inserting,
  // since node duckdb might not handle read_json_auto from string as easily as wasm virtual file)
  // Actually, let's write to a file to simulate fully.
  const jsonPath = 'mappings.json';
  fs.writeFileSync(jsonPath, JSON.stringify(mappings));

  await run(`CREATE TABLE phone_mappings AS SELECT * FROM read_json_auto('${jsonPath}')`);

  await run(`
    UPDATE dataset_optimized
    SET phone = phone_mappings.new
    FROM phone_mappings
    WHERE dataset_optimized.phone = phone_mappings.old
  `);

  await run(`DROP TABLE phone_mappings`);

  const endOpt = performance.now();
  console.log(`Optimization Time: ${(endOpt - startOpt).toFixed(2)}ms`);

  // Cleanup
  fs.unlinkSync(jsonPath);

  // Validation
  const count1 = await all(`SELECT COUNT(*) as c FROM dataset_baseline WHERE phone LIKE '+33%'`);
  const count2 = await all(`SELECT COUNT(*) as c FROM dataset_optimized WHERE phone LIKE '+33%'`);

  console.log(`Baseline updated rows: ${count1[0].c}`);
  console.log(`Optimized updated rows: ${count2[0].c}`);

  if (count1[0].c !== count2[0].c || count1[0].c !== 2000) {
    console.error("Mismatch in results!");
  } else {
    console.log("Results match!");
  }

};

runBenchmark().catch(console.error);
