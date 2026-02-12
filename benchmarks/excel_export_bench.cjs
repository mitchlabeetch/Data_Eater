
const { performance } = require('perf_hooks');

class MockWorksheet {
  constructor() {
    this.rowCount = 0;
  }
  addRow(row) {
    this.rowCount++;
    return { commit: () => {} };
  }
  addRows(rows) {
    this.rowCount += rows.length;
  }
}

class MockWorkbook {
  addWorksheet(name) {
    return new MockWorksheet();
  }
  get xlsx() {
    return {
      writeBuffer: async () => Buffer.from('mock excel data')
    };
  }
}

const generateRows = (count) => {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      score: Math.random() * 100,
      active: i % 2 === 0
    });
  }
  return rows;
};

// Mock LazyArrowResult Proxy
const createLazyArrowResult = (rows) => {
  return new Proxy(rows, {
    get(target, prop) {
      // Pass through everything as array for now, simulating array behavior
      return Reflect.get(target, prop);
    }
  });
};


const runBenchmark = async () => {
  const ROW_COUNT = 100000;
  const rawRows = generateRows(ROW_COUNT);
  const rows = createLazyArrowResult(rawRows);

  const columns = [
    { name: 'id' }, { name: 'name' }, { name: 'email' }, { name: 'score' }, { name: 'active' }
  ];

  console.log(`\nStarting benchmark with ${ROW_COUNT} rows (Proxied)...`);

  // --- Baseline ---
  const baselineStart = performance.now();
  const baselineMemoryStart = process.memoryUsage().heapUsed;

  const workbook1 = new MockWorkbook();
  const sheet1 = workbook1.addWorksheet('Data');
  sheet1.columns = columns.map(c => ({ header: c.name, key: c.name }));

  const plainRows = rows.map(row => {
    const obj = {};
    columns.forEach(col => {
        obj[col.name] = row[col.name];
    });
    return obj;
  });
  sheet1.addRows(plainRows);

  const baselineEnd = performance.now();
  const baselineMemoryEnd = process.memoryUsage().heapUsed;
  const baselineTime = baselineEnd - baselineStart;
  const baselineMemory = (baselineMemoryEnd - baselineMemoryStart) / 1024 / 1024;

  console.log(`Baseline (Map + addRows):`);
  console.log(`  Time: ${baselineTime.toFixed(2)} ms`);
  console.log(`  Memory Delta: ${baselineMemory.toFixed(2)} MB`);


  // --- Optimization ---
  const optStart = performance.now();
  const optMemoryStart = process.memoryUsage().heapUsed;

  const workbook2 = new MockWorkbook();
  const sheet2 = workbook2.addWorksheet('Data');
  sheet2.columns = columns.map(c => ({ header: c.name, key: c.name }));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowValues = columns.map(col => row[col.name]);
    sheet2.addRow(rowValues);

    if (i % 2000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }

  const optEnd = performance.now();
  const optMemoryEnd = process.memoryUsage().heapUsed;

  const optTime = optEnd - optStart;
  const optMemory = (optMemoryEnd - optMemoryStart) / 1024 / 1024;

  console.log(`Optimization (Iterative + Chunking):`);
  console.log(`  Time: ${optTime.toFixed(2)} ms`);
  console.log(`  Memory Delta: ${optMemory.toFixed(2)} MB`);

  console.log(`\nComparison:`);
  console.log(`  Time Impact: ${((optTime - baselineTime) / baselineTime * 100).toFixed(2)}%`);
  console.log(`  Memory Savings: ${(baselineMemory - optMemory).toFixed(2)} MB`);
};

runBenchmark();
