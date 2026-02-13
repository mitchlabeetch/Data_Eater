
// Simulate Apache Arrow Table
class MockTable {
  constructor(size) {
    this.size = size;
    this.data = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      this.data[i] = i;
    }
  }

  get numRows() {
    return this.size;
  }

  get(i) {
    // Simulate returning a proxy row
    return { id: this.data[i], value: `val-${this.data[i]}` };
  }

  toArray() {
    const arr = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      arr[i] = this.get(i);
    }
    return arr;
  }
}

// Lazy Wrapper Implementation (Prototype)
class LazyWrapper {
  constructor(table) {
    this.table = table;
    this.length = table.numRows;
    return new Proxy(this, {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          const index = Number(prop);
          if (Number.isInteger(index)) {
             return target.table.get(index);
          }
        }
        return target[prop];
      }
    });
  }

  map(callback) {
    const res = [];
    for (let i = 0; i < this.length; i++) {
      res.push(callback(this.table.get(i), i));
    }
    return res;
  }
}

// Benchmark
const SIZE = 1_000_000;
const table = new MockTable(SIZE);

console.log(`Benchmark running with ${SIZE} rows...`);

global.gc && global.gc();
const startMem = process.memoryUsage().heapUsed;

// 1. Baseline: toArray()
const t0 = performance.now();
const arr = table.toArray();
const t1 = performance.now();
const mem1 = process.memoryUsage().heapUsed;

console.log(`\n--- Baseline: toArray() ---`);
console.log(`Time: ${(t1 - t0).toFixed(2)} ms`);
console.log(`Memory Delta: ${((mem1 - startMem) / 1024 / 1024).toFixed(2)} MB`);

// Cleanup
// arr = null; // Can't null const
global.gc && global.gc();

const startMem2 = process.memoryUsage().heapUsed;

// 2. Optimization: LazyWrapper
const t2 = performance.now();
const lazy = new LazyWrapper(table);
const t3 = performance.now();
const mem2 = process.memoryUsage().heapUsed;

console.log(`\n--- Optimization: LazyWrapper ---`);
console.log(`Time: ${(t3 - t2).toFixed(2)} ms`);
console.log(`Memory Delta: ${((mem2 - startMem2) / 1024 / 1024).toFixed(2)} MB`);

// 3. Iteration Speed check
// Measure random access sum
const t4 = performance.now();
let sum = 0;
for(let i=0; i<SIZE; i+=100) {
    sum += arr[i].id;
}
const t5 = performance.now();
console.log(`\nArray Access (10k samples): ${(t5-t4).toFixed(2)} ms`);

const t6 = performance.now();
let sum2 = 0;
for(let i=0; i<SIZE; i+=100) {
    sum2 += lazy[i].id;
}
const t7 = performance.now();
console.log(`Lazy Access (10k samples): ${(t7-t6).toFixed(2)} ms`);

console.log(`\nConclusion: LazyWrapper Init is ${(t1-t0) / (t3-t2)}x faster`);
