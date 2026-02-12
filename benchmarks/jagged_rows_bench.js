
import { performance } from 'perf_hooks';

const safeDelimiter = ',';

// Current implementation
const getColCountOld = (line) => {
   const stripped = line.replace(/"[^"]*"/g, '""');
   return stripped.split(safeDelimiter).length;
};

// Optimized implementation
const getColCountNew = (line) => {
    let count = 1;
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inQuote = !inQuote;
        } else if (line[i] === safeDelimiter && !inQuote) {
            count++;
        }
    }
    return count;
};

// Test cases
const testCases = [
    { input: 'val1,val2,val3', expectedOld: 3, expectedNew: 3 },
    { input: 'val1,"val2",val3', expectedOld: 3, expectedNew: 3 },
    { input: 'val1,"val,2",val3', expectedOld: 3, expectedNew: 3 },
    { input: 'val1,"val""2",val3', expectedOld: 3, expectedNew: 3 },
    { input: 'val1,"val""2,val3",val4', expectedOld: 3, expectedNew: 3 },
    { input: 'val1,"broken,val2', expectedOld: 3, expectedNew: 2 }, // Unbalanced quote behavior difference
    { input: 'broken",val2,val3', expectedOld: 3, expectedNew: 1 }, // Unbalanced quote behavior difference
    { input: '', expectedOld: 1, expectedNew: 1 },
    { input: ',,', expectedOld: 3, expectedNew: 3 },
    { input: '"","",""', expectedOld: 3, expectedNew: 3 }
];

console.log("--- Correctness Check ---");
let mismatchCount = 0;
let errors = 0;

for (const tc of testCases) {
    const oldRes = getColCountOld(tc.input);
    const newRes = getColCountNew(tc.input);

    if (newRes !== tc.expectedNew) {
        console.error(`ERROR: "${tc.input}" -> Expected New: ${tc.expectedNew}, Got: ${newRes}`);
        errors++;
    }

    if (oldRes !== newRes) {
        console.log(`Note: difference in behavior for "${tc.input}" -> Old: ${oldRes}, New: ${newRes}`);
        mismatchCount++;
    }
}

if (errors > 0) {
    console.error(`\nFAILED: Found ${errors} errors in expected behavior.`);
    process.exit(1);
}

console.log(`\nFound ${mismatchCount} known behavioral differences (unbalanced quotes).`);
console.log("All explicit expectations passed.");

console.log("\n--- Performance Benchmark ---");

// Generate large dataset
const lines = [];
const N = 100000;
for (let i = 0; i < N; i++) {
    const type = i % 5;
    if (type === 0) lines.push('1,2,3,4,5,6,7,8,9,10');
    else if (type === 1) lines.push('1,"2,3",4,"5,6",7,8,9,10');
    else if (type === 2) lines.push('"long string with commas, and, more, commas",2,3');
    else if (type === 3) lines.push('1,2,3,"val""4",5,6');
    else lines.push('1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'); // longer
}

const runBenchmark = (name, fn) => {
    const start = performance.now();
    let total = 0;
    for (const line of lines) {
        total += fn(line);
    }
    const end = performance.now();
    const duration = end - start;
    console.log(`${name}: ${duration.toFixed(2)}ms (Total: ${total})`);
    return duration;
};

// Warmup
runBenchmark("Old (Warmup)", getColCountOld);
runBenchmark("New (Warmup)", getColCountNew);

console.log("\nRunning...");
const oldTime = runBenchmark("Old Implementation", getColCountOld);
const newTime = runBenchmark("New Implementation", getColCountNew);

const improvement = oldTime / newTime;
console.log(`\nImprovement: ${improvement.toFixed(2)}x faster`);

if (newTime > oldTime) {
    console.error("FAILED: New implementation is slower than old implementation.");
    process.exit(1);
}

if (improvement < 1.1) {
    console.warn("WARNING: Improvement is marginal (< 1.1x).");
}

console.log("SUCCESS: Optimization verified.");
