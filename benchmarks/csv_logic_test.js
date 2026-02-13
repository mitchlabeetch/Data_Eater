import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvUtilsPath = path.resolve(__dirname, '../src/lib/csvUtils.ts');

const content = fs.readFileSync(csvUtilsPath, 'utf-8');

// Strip TypeScript types
// 1. Remove export
// 2. Remove ': any[]'
// 3. Remove ': string'
// 4. Assign to global to be accessible after eval in ESM
let jsScript = content
  .replace('export function generateCsv', 'global.generateCsv = function')
  .replace(': any[]', '')
  .replace(': string', '');

try {
  eval(jsScript);
} catch (e) {
  console.error("Failed to eval script. Might be complex TS syntax.", e);
  console.log("Script content:", jsScript);
  process.exit(1);
}

// Now global.generateCsv is available

// Test Logic
console.log("Verifying generateCsv logic...");

const data = [
  { name: 'Alice', bio: 'Loves "quotes"' },
  { name: 'Bob', bio: 'Simple guy' }
];

const csv = global.generateCsv(data);
console.log("Result:");
console.log(csv);

// Expected:
// name,bio
// "Alice","Loves ""quotes"""
// "Bob","Simple guy"

if (csv.includes('"Alice","Loves ""quotes"""') && csv.includes('"Bob","Simple guy"')) {
    console.log("✅ Logic verification passed.");
} else {
    console.error("❌ Logic verification failed.");
    console.log("Expected to find escaped quotes.");
    process.exit(1);
}

// Performance Test
const BATCH_SIZE = 500;
const NUM_COLS = 20;
const ITERATIONS = 100;

function generatePerfData(rows, cols) {
    const data = [];
    for (let i = 0; i < rows; i++) {
        const row = {};
        for (let j = 0; j < cols; j++) {
            row[`col_${j}`] = `val_${i}_${j}`;
        }
        data.push(row);
    }
    return data;
}

const perfData = generatePerfData(BATCH_SIZE, NUM_COLS);
console.log(`Benchmarking 500 rows * ${NUM_COLS} cols...`);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    global.generateCsv(perfData);
}
const end = performance.now();
const duration = end - start;
console.log(`Total time: ${duration.toFixed(2)}ms`);
console.log(`Avg time per iteration: ${(duration / ITERATIONS).toFixed(2)}ms`);
