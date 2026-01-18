import { performance } from 'perf_hooks';

// Mock data and functions
const state = {
  columns: [
    { name: 'col1', type: 'INTEGER' },
    { name: 'col2', type: 'VARCHAR' }
  ]
};

const query = async (sql) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([{ val: 1, cnt: 10, sum_val: 100, avg_val: 10, null_count: 0, distinct_count: 5, min_val: 1, max_val: 10 }]);
    }, 100); // 100ms delay per query
  });
};

async function originalSelectColumn(colName) {
  const start = performance.now();

  const basicSql = "SELECT ...";
  const basicRes = await query(basicSql);
  const stats = basicRes[0];

  const colDef = state.columns.find(c => c.name === colName);

  if (colDef?.type === 'DOUBLE' || colDef?.type === 'BIGINT' || colDef?.type === 'INTEGER') {
    const numSql = "SELECT SUM...";
    const numRes = await query(numSql);
  } else {
    const topSql = "SELECT TOP...";
    const topRes = await query(topSql);
  }

  return performance.now() - start;
}

async function optimizedSelectColumn(colName) {
  const start = performance.now();

  const colDef = state.columns.find(c => c.name === colName);
  const basicSql = "SELECT ...";

  // Start queries in parallel
  const basicPromise = query(basicSql);
  let extendedPromise;

  if (colDef?.type === 'DOUBLE' || colDef?.type === 'BIGINT' || colDef?.type === 'INTEGER') {
    const numSql = "SELECT SUM...";
    extendedPromise = query(numSql);
  } else {
    const topSql = "SELECT TOP...";
    extendedPromise = query(topSql);
  }

  const [basicRes, extendedRes] = await Promise.all([basicPromise, extendedPromise]);
  const stats = basicRes[0];

  return performance.now() - start;
}

console.log("Running Benchmark...");

const timeOriginal = await originalSelectColumn('col1');
console.log(`Original: ${timeOriginal.toFixed(2)}ms`);

const timeOptimized = await optimizedSelectColumn('col1');
console.log(`Optimized: ${timeOptimized.toFixed(2)}ms`);

if (timeOptimized < timeOriginal) {
  console.log(`Improvement: ${(timeOriginal - timeOptimized).toFixed(2)}ms`);
} else {
  console.log("No improvement observed.");
}
