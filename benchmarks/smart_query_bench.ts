import { runSmartQuery } from '../src/services/smartQueryService.ts';
import { performance } from 'perf_hooks';

// Simulate a dataset
const TOTAL_ROWS = 5000; // 5000 rows. With CHUNK_SIZE=500, that's 10 chunks.
const data = Array.from({ length: TOTAL_ROWS }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
  value: Math.random() * 100
}));

const query = "Analyze this data";

async function runBenchmark() {
  console.log(`Starting benchmark with ${TOTAL_ROWS} rows...`);
  const start = performance.now();

  try {
    const result = await runSmartQuery(query, data, (progress) => {
        process.stdout.write(`\rProgress: ${progress}%`);
    });
    console.log(); // Newline

    const end = performance.now();
    const duration = end - start;

    console.log(`Benchmark completed in ${duration.toFixed(2)}ms`);
    console.log(`Processed ${result.length} rows.`);

    // Validate simple correctness
    if (result.length !== TOTAL_ROWS) {
        console.error(`ERROR: Output length mismatch. Expected ${TOTAL_ROWS}, got ${result.length}`);
    }

    // Check order
    // The mock returns: ...row, _llm_comment: ...
    // So 'id' should be preserved.
    const isOrderCorrect = result.every((row, i) => row.id === i);
    if (!isOrderCorrect) {
        console.error("ERROR: Output order mismatch.");
    } else {
        console.log("Output order correct.");
    }

  } catch (error) {
    console.error("Benchmark failed:", error);
  }
}

runBenchmark();
