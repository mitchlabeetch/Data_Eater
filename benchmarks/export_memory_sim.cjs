const { format } = require('util');
const ROW_COUNT = 1000000;
const gc = global.gc || (() => {});

function getMemory() {
  const m = process.memoryUsage();
  return Math.round(m.heapUsed / 1024 / 1024);
}

console.log(`Starting Benchmark for ${ROW_COUNT} rows...`);
console.log(`Initial Memory: ${getMemory()} MB`);

// Scenario 1: Object Array (Current)
console.log('\n--- Scenario 1: Array of Objects (Current) ---');
gc();
const startMem1 = getMemory();
const rows = [];
for (let i = 0; i < ROW_COUNT; i++) {
  rows.push({
    id: i,
    name: `User Number ${i}`,
    email: `user${i}@example.com`,
    active: true,
    score: 123.45,
    description: "Some long text description to simulate real data payload"
  });
}
const midMem1 = getMemory();
console.log(`Rows Loaded Memory: ${midMem1} MB (Delta: ${midMem1 - startMem1} MB)`);

// Simulate CSV Generation
const header = Object.keys(rows[0]).join(',');
const csvLines = rows.map(r => Object.values(r).join(','));
const csvContent = [header, ...csvLines].join('\n');

const endMem1 = getMemory();
console.log(`CSV Generated Memory: ${endMem1} MB (Delta: ${endMem1 - midMem1} MB)`);
console.log(`Total Peak Memory Impact: ${endMem1 - startMem1} MB`);

// Cleanup
rows.length = 0;
// csvContent is kept to measure its size for Scenario 2
gc();

// Scenario 2: Buffer (Simulated DuckDB COPY)
console.log('\n--- Scenario 2: Direct Buffer (Proposed) ---');
gc();
const startMem2 = getMemory();

// Simulate just having the CSV content in a buffer (simulating reading from file)
// We assume DuckDB writes to file, then we read file to Buffer.
// The cost is roughly the size of the CSV file.
// We'll create a Buffer of the same size as the CSV string above.
const csvLength = Buffer.byteLength(csvContent);
const buffer = Buffer.alloc(csvLength);

const endMem2 = getMemory();
console.log(`Buffer Loaded Memory: ${endMem2} MB`);
console.log(`Total Peak Memory Impact: ${endMem2 - startMem2} MB`);

console.log(`\nComparison: Saved ~${(endMem1 - startMem1) - (endMem2 - startMem2)} MB of Heap`);
