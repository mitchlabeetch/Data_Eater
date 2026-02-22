import { runSmartQuery } from '../src/services/smartQueryService';
import { performance } from 'perf_hooks';

// Simulate a large dataset
// 500,000 items, CHUNK_SIZE=500 -> 1000 chunks.
const TOTAL_ROWS = 500000;
const data = Array.from({ length: TOTAL_ROWS }, (_, i) => ({ id: i }));

// Even faster mock: 0ms delay (resolve immediate) to test pure overhead
const fastMockProcessor = async (query: string, batch: any[], instr: string) => {
    return batch;
};

async function runBenchmark() {
  console.log(`Starting concurrency benchmark with ${TOTAL_ROWS} rows (approx 1000 chunks)...`);

  // Warmup
  await runSmartQuery("warmup", data.slice(0, 1000), () => {}, fastMockProcessor);

  const start = performance.now();
  await runSmartQuery("test", data, () => {}, fastMockProcessor);
  const end = performance.now();

  console.log(`Total time: ${(end - start).toFixed(2)}ms`);
}

runBenchmark();
