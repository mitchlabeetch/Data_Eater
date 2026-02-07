import { performance } from 'perf_hooks';

// Simulate LazyArrowResult (mocking DuckDB Arrow Table behavior)
class MockLazyResult {
  length: number;
  private _data: any[];

  constructor(size: number) {
    this.length = size;
    // Pre-allocate data but access via proxy or index
    this._data = Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      value: i * 1.5
    }));
  }

  // Iterator implementation to allow for..of
  [Symbol.iterator]() {
    let index = 0;
    return {
      next: () => {
        if (index < this.length) {
          return { value: this._data[index++], done: false };
        } else {
          return { done: true };
        }
      }
    };
  }

  // map implementation (naive)
  map(callback: (row: any, index: number) => any) {
    const result = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      result[i] = callback(this._data[i], i);
    }
    return result;
  }
}

// Mock ExcelJS Sheet
class MockSheet {
  rows: any[] = [];

  addRow(row: any) {
    this.rows.push(row); // Simulate storing row data
  }

  addRows(rows: any[]) {
    // ExcelJS likely iterates and pushes
    for (const row of rows) {
      this.rows.push(row);
    }
  }

  reset() {
    this.rows = [];
    if (global.gc) global.gc();
  }
}

const runBenchmark = () => {
  const ROW_COUNT = 500_000;
  console.log(`Benchmarking with ${ROW_COUNT} rows...`);

  const rows = new MockLazyResult(ROW_COUNT);
  const columns = [{ name: 'id' }, { name: 'name' }, { name: 'email' }, { name: 'value' }];
  const sheet = new MockSheet();

  // Force GC before start if possible
  if (global.gc) global.gc();

  // 1. Measure Baseline (map -> addRows)
  sheet.reset();
  const startHeap1 = process.memoryUsage().heapUsed;
  const startTime1 = performance.now();

  const plainRows = rows.map((row: any) => {
    const obj: any = {};
    columns.forEach(col => {
        obj[col.name] = row[col.name];
    });
    return obj;
  });
  sheet.addRows(plainRows);

  const endTime1 = performance.now();
  const endHeap1 = process.memoryUsage().heapUsed;
  const time1 = endTime1 - startTime1;
  const heap1 = endHeap1 - startHeap1;

  console.log(`Baseline (map + addRows):`);
  console.log(`  Time: ${time1.toFixed(2)}ms`);
  console.log(`  Heap Usage Increase: ${(heap1 / 1024 / 1024).toFixed(2)} MB`);

  // Force GC between runs
  if (global.gc) global.gc();

  // 2. Measure Optimization (loop -> addRow)
  sheet.reset();
  const startHeap2 = process.memoryUsage().heapUsed;
  const startTime2 = performance.now();

  // Optimization: Loop and add directly
  // Note: rows supports iteration
  for (const row of rows as any) {
     const obj: any = {};
     columns.forEach(col => {
         obj[col.name] = row[col.name];
     });
     sheet.addRow(obj);
  }

  const endTime2 = performance.now();
  const endHeap2 = process.memoryUsage().heapUsed;
  const time2 = endTime2 - startTime2;
  const heap2 = endHeap2 - startHeap2;

  console.log(`Optimized (loop + addRow):`);
  console.log(`  Time: ${time2.toFixed(2)}ms`);
  console.log(`  Heap Usage Increase: ${(heap2 / 1024 / 1024).toFixed(2)} MB`);

  console.log(`Improvement:`);
  console.log(`  Time: ${(time1 - time2).toFixed(2)}ms faster`);
  console.log(`  Heap: ${((heap1 - heap2) / 1024 / 1024).toFixed(2)} MB saved`);

  // Force GC between runs
  if (global.gc) global.gc();

  // 3. Measure Array Optimization (loop -> addRow(array))
  sheet.reset();
  const startHeap3 = process.memoryUsage().heapUsed;
  const startTime3 = performance.now();

  // Optimization: Loop and add array of values
  for (const row of rows as any) {
     const values = new Array(columns.length);
     for(let i=0; i<columns.length; i++) {
         values[i] = row[columns[i].name];
     }
     sheet.addRow(values);
  }

  const endTime3 = performance.now();
  const endHeap3 = process.memoryUsage().heapUsed;
  const time3 = endTime3 - startTime3;
  const heap3 = endHeap3 - startHeap3;

  console.log(`Array Optimized (loop + addRow array):`);
  console.log(`  Time: ${time3.toFixed(2)}ms`);
  console.log(`  Heap Usage Increase: ${(heap3 / 1024 / 1024).toFixed(2)} MB`);

  console.log(`Improvement vs Baseline:`);
  console.log(`  Time: ${(time1 - time3).toFixed(2)}ms faster`);
  console.log(`  Heap: ${((heap1 - heap3) / 1024 / 1024).toFixed(2)} MB saved`);
};

runBenchmark();
