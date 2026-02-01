
const { performance } = require('perf_hooks');

const ROWS = 100000;
const COLS = 20;

// Create a large "Table" source (simulating Arrow Table)
// We use a class to simulate Proxy behavior or just access pattern
class MockRow {
    constructor(idx) {
        this.idx = idx;
        this.data = {};
        for (let i = 0; i < COLS; i++) {
            this.data[`col_${i}`] = `val_${idx}_${i}`;
        }
    }

    toJSON() {
        // Simulate extraction cost
        return { ...this.data };
    }

    get(col) {
        return this.data[col];
    }
}

// Simulate Arrow Table as array of MockRows
console.log(`Generating ${ROWS} mock rows...`);
const table = [];
for (let i = 0; i < ROWS; i++) {
    table.push(new MockRow(i));
}
console.log("Generation complete.");

const measure = (name, fn) => {
    const startHeap = process.memoryUsage().heapUsed;
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const endHeap = process.memoryUsage().heapUsed;

    console.log(`[${name}] Time: ${(end - start).toFixed(2)}ms`);
    console.log(`[${name}] Heap Change: ${((endHeap - startHeap) / 1024 / 1024).toFixed(2)} MB`);
    return result;
};

// 1. Current Implementation: Materialize everything to JSON objects
measure('Materialize All (map toJSON)', () => {
    return table.map(row => row.toJSON());
});

// Force GC (if possible) - in JS we can't easily, but subsequent allocations will show
if (global.gc) { global.gc(); }

// 2. Proposed Implementation: Zero-Copy (return array of rows)
// We simulate this by just returning the array (simulating toArray() which returns references)
measure('Zero-Copy (toArray)', () => {
    return table.slice(); // slice to simulate creating a new array container, but elements are same
});

// 3. Simulated Access (e.g. iterate and read 1 column)
measure('Iterate & Read 1 Column (Zero-Copy)', () => {
    let count = 0;
    for (const row of table) {
        if (row.get('col_0')) count++;
    }
    return count;
});
