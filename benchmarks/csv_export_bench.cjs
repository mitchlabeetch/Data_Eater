
// Mock browser globals
global.Blob = class Blob {
    constructor(parts, options) {
        this.parts = parts;
        this.options = options;
        this.size = parts.reduce((acc, p) => acc + p.length, 0);
    }
};

global.URL = {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {}
};

// Test Data Generation
function generateData(rowCount, colCount) {
    const rows = [];
    const columns = [];
    for (let j = 0; j < colCount; j++) {
        columns.push({ name: `col_${j}` });
    }

    for (let i = 0; i < rowCount; i++) {
        const row = {};
        for (let j = 0; j < colCount; j++) {
            row[`col_${j}`] = `value_${i}_${j}_${Math.random()}`;
        }
        rows.push(row);
    }
    return { rows, columns };
}

// Original Implementation
function exportCSV_Original(rows, columns, delimiter) {
  const includeHeaders = true;

  const start = performance.now();
  const startMem = process.memoryUsage().heapUsed;

  // 1. Build CSV String
  const headerRow = columns.map(c => `"${c.name}"`).join(delimiter);
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const val = row[col.name];
      const strVal = val === null || val === undefined ? '' : String(val);
      // Escape quotes: simple regex for global replacement
      return `"${strVal.split('"').join('""')}"`;
    }).join(delimiter);
  });

  const csvContent = (includeHeaders ? [headerRow, ...dataRows] : dataRows).join('\n');

  const endMem = process.memoryUsage().heapUsed;
  const end = performance.now();

  // Create Blob (just to mimic the full process)
  const blob = new Blob([csvContent], { type: 'text/csv' });

  return {
      time: end - start,
      memoryDiff: endMem - startMem,
      resultSize: blob.size
  };
}

// Optimized Implementation (Streaming / Chunking)
function exportCSV_Optimized(rows, columns, delimiter) {
  const includeHeaders = true;

  const start = performance.now();
  const startMem = process.memoryUsage().heapUsed;

  const blobParts = [];
  if (includeHeaders) {
    const headerRow = columns.map(c => `"${c.name}"`).join(delimiter);
    blobParts.push(headerRow);
    blobParts.push('\n');
  }

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const chunkStr = chunk.map(row => {
        return columns.map(col => {
          const val = row[col.name];
          const strVal = val === null || val === undefined ? '' : String(val);
          return `"${strVal.split('"').join('""')}"`;
        }).join(delimiter);
      }).join('\n');

      blobParts.push(chunkStr);
      if (i + CHUNK_SIZE < rows.length) {
          blobParts.push('\n');
      }
  }

  const endMem = process.memoryUsage().heapUsed;
  const end = performance.now();

  const blob = new Blob(blobParts, { type: 'text/csv' });

  return {
      time: end - start,
      memoryDiff: endMem - startMem,
      resultSize: blob.size
  };
}


// Run Benchmark
const ROWS = 100000;
const COLS = 10;
console.log(`Generating ${ROWS} rows x ${COLS} cols...`);
const { rows, columns } = generateData(ROWS, COLS);

console.log("Running Original...");
global.gc && global.gc();
const res1 = exportCSV_Original(rows, columns, ',');
console.log(`Original: Time=${res1.time.toFixed(2)}ms, HeapDiff=${(res1.memoryDiff / 1024 / 1024).toFixed(2)} MB`);

console.log("Running Optimized...");
global.gc && global.gc();
const res2 = exportCSV_Optimized(rows, columns, ',');
console.log(`Optimized: Time=${res2.time.toFixed(2)}ms, HeapDiff=${(res2.memoryDiff / 1024 / 1024).toFixed(2)} MB`);

console.log(`Improvement: ${(res1.time / res2.time).toFixed(2)}x Speed`);
