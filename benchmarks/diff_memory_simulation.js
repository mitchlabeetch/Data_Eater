
import { performance } from 'perf_hooks';

// Force GC if possible
if (global.gc) {
  global.gc();
}

function simulateDiffLoad(rowCount) {
  const start = performance.now();
  const rows = [];
  // Simulate row object
  const rowTemplate = {
    id: 1,
    name: "Test Name",
    email: "test@example.com",
    address: "123 Test St, Some City, Country",
    score: 95.5,
    active: true,
    description: "Some long description text to simulate data volume..."
  };

  for (let i = 0; i < rowCount; i++) {
    rows.push({ ...rowTemplate, id: i });
  }

  const end = performance.now();
  const memory = process.memoryUsage().heapUsed / 1024 / 1024;

  return {
    time: end - start,
    memory: memory,
    rows: rows.length
  };
}

const baselineMemory = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`Baseline Memory: ${baselineMemory.toFixed(2)} MB`);

console.log("\n--- Scenario A: Full Load (100,000 rows) ---");
const fullLoad = simulateDiffLoad(100000);
console.log(`Time: ${fullLoad.time.toFixed(2)} ms`);
console.log(`Memory after load: ${fullLoad.memory.toFixed(2)} MB`);
console.log(`Memory Delta from Baseline: ${(fullLoad.memory - baselineMemory).toFixed(2)} MB`);

// Clear references to help GC (if it runs)
// fullLoad.rows = null;
// In JS we can't force GC easily without --expose-gc, but let's just run B separately or accept accumulated memory.

console.log("\n--- Scenario B: Preview Load (100 rows) ---");
const previewLoad = simulateDiffLoad(100);
console.log(`Time: ${previewLoad.time.toFixed(2)} ms`);
console.log(`Memory after load: ${previewLoad.memory.toFixed(2)} MB`);
console.log(`Memory Delta from Baseline: ${(previewLoad.memory - baselineMemory).toFixed(2)} MB`);
