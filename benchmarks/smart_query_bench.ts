
import { runSmartQuery } from '../src/services/smartQueryService';

async function runBenchmark() {
  console.log("Starting Smart Query Benchmark...");

  // Generate mock data: 2000 items
  // Chunk size is 500, so 4 chunks.
  const data = Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  const start = performance.now();
  try {
    const result = await runSmartQuery(
      "Test Query",
      data,
      (p) => {
        // Simple progress log, overwriting line
        // process.stdout.write(`\rProgress: ${p}%`);
      }
    );
    const end = performance.now();
    console.log(`\nSuccess. Processed ${result.length} items.`);
    console.log(`Time Taken: ${(end - start).toFixed(2)}ms`);
  } catch (e) {
    console.error("Benchmark failed", e);
  }
}

runBenchmark();
