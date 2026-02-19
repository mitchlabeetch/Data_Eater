
import { LazyArrowResult } from '../src/lib/LazyArrowResult.ts';
import { performance } from 'perf_hooks';

// Mock Arrow Table
const createMockTable = (size: number) => ({
    numRows: size,
    get: (i: number) => ({
        toJSON: () => ({ id: i, value: `val_${i}` })
    }),
    toArray: () => [] // Not used by LazyArrowResult
});

const SIZE = 1_000_000;
const table = createMockTable(SIZE);

console.log(`Testing LazyArrowResult with size: ${SIZE}`);

const start = performance.now();
// @ts-ignore
const lazy = new LazyArrowResult(table);
const initTime = performance.now() - start;
console.log(`Initialization time: ${initTime.toFixed(4)}ms`);

if (initTime > 10) {
    console.error("FAIL: Initialization took too long (should be instant)");
    process.exit(1);
}

// Access random index
const startAccess = performance.now();
const row = lazy[500_000];
const accessTime = performance.now() - startAccess;
console.log(`Random access time: ${accessTime.toFixed(4)}ms`, row);

if (row.id !== 500_000) {
    console.error("FAIL: Index access mismatch");
    process.exit(1);
}

// Slice
const startSlice = performance.now();
const sliced = lazy.slice(100, 110);
const sliceTime = performance.now() - startSlice;
console.log(`Slice(100, 110) time: ${sliceTime.toFixed(4)}ms`);
console.log(`Sliced length: ${sliced.length}`);

if (sliced.length !== 10) {
    console.error("FAIL: Slice length mismatch");
    process.exit(1);
}
if (sliced[0].id !== 100) {
    console.error("FAIL: Slice content mismatch");
    process.exit(1);
}

// Test Iterator
let count = 0;
for (const item of lazy) {
    if (count > 5) break;
    if (item.id !== count) {
        console.error("FAIL: Iterator mismatch");
        process.exit(1);
    }
    count++;
}
console.log("Iterator works.");

// Test Slice Clamping
const clampedSlice = lazy.slice(0, SIZE + 100);
if (clampedSlice.length !== SIZE) {
    console.error(`FAIL: Slice clamping failed. Expected ${SIZE}, got ${clampedSlice.length}`);
    process.exit(1);
}
console.log("Slice clamping works.");

// Test JSON.stringify
const smallTable = createMockTable(5);
// @ts-ignore
const smallLazy = new LazyArrowResult(smallTable);
const smallJson = JSON.stringify(smallLazy);
const expectedJson = '[{"id":0,"value":"val_0"},{"id":1,"value":"val_1"},{"id":2,"value":"val_2"},{"id":3,"value":"val_3"},{"id":4,"value":"val_4"}]';

if (smallJson !== expectedJson) {
    console.error(`FAIL: JSON.stringify mismatch.\nExpected: ${expectedJson}\nGot:      ${smallJson}`);
    process.exit(1);
}
console.log("JSON.stringify works.");

// Test indexOf/includes
const row0 = smallLazy[0];
if (smallLazy.indexOf(row0) !== -1) {
    console.log("WARNING: indexOf found object! Caching might be active?");
} else {
    console.log("indexOf correctly returns -1 for new object references (no caching).");
}

// Test Sort (should throw)
try {
    smallLazy.sort();
    console.error("FAIL: sort() did not throw.");
    process.exit(1);
} catch (e) {
    console.log("sort() threw error as expected.");
}

console.log("LazyArrowResult passed all checks.");
