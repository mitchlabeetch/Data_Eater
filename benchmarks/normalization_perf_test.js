// benchmark/normalization_perf_test.js

async function runBenchmark() {
  const updates = [];
  // Create 100 clusters, each with 5 candidates
  for (let i = 0; i < 100; i++) {
    updates.push({
      target: `Target_${i}`,
      sources: [`Source_${i}_A`, `Source_${i}_B`, `Source_${i}_C`, `Source_${i}_D`, `Source_${i}_E`]
    });
  }

  const targetCol = "my_column";
  let queryCount = 0;

  const executeMutation = async (sql) => {
    queryCount++;
    // Simulate latency
    await new Promise(r => setTimeout(r, 1));
  };

  console.log("--- Baseline (Current Code) ---");
  queryCount = 0;
  const startBase = Date.now();
  for (const update of updates) {
    const sourcesSQL = update.sources.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
    await executeMutation(`UPDATE current_dataset SET "${targetCol}" = '${update.target.replace(/'/g, "''")}' WHERE "${targetCol}" IN (${sourcesSQL})`);
  }
  const endBase = Date.now();
  console.log(`Queries: ${queryCount}`);
  console.log(`Time (simulated): ${endBase - startBase}ms`);


  console.log("\n--- Optimized (Batched) ---");
  queryCount = 0;
  const startOpt = Date.now();

  // Optimized Logic
  const pairs = [];
  updates.forEach(update => {
    const targetSafe = update.target.replace(/'/g, "''");
    update.sources.forEach(source => {
       const sourceSafe = source.replace(/'/g, "''");
       pairs.push(`('${sourceSafe}', '${targetSafe}')`);
    });
  });

  if (pairs.length > 0) {
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < pairs.length; i += CHUNK_SIZE) {
       const chunk = pairs.slice(i, i + CHUNK_SIZE).join(',');
       await executeMutation(`
         UPDATE current_dataset
         SET "${targetCol}" = v.tgt
         FROM (VALUES ${chunk}) as v(src, tgt)
         WHERE "${targetCol}" = v.src
       `);
    }
  }

  const endOpt = Date.now();
  console.log(`Queries: ${queryCount}`);
  console.log(`Time (simulated): ${endOpt - startOpt}ms`);
}

runBenchmark();
