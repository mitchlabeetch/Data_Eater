import { runSmartQuery } from '../src/services/smartQueryService';

async function runBenchmark() {
  console.log("Starting Smart Query Benchmark...");

  // Generate mock data: 2000 items -> 4 chunks of 500
  const data = Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  const start = performance.now();
  const result = await runSmartQuery("Test Query", data, (p) => {
     // Optional: print progress
  });
  const end = performance.now();

  console.log(`Time Taken: ${(end - start).toFixed(2)}ms`);
  console.log(`Input Length: ${data.length}`);
  console.log(`Output Length: ${result.length}`);

  if (result.length !== data.length) {
      console.error("MISMATCH! Test Failed.");
      process.exit(1);
  } else {
      console.log("Verification Passed.");
  }
}

runBenchmark();
