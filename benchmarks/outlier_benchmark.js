import { performance } from 'perf_hooks';

// Mock Data
const COL_COUNT = 50;
const columns = Array.from({ length: COL_COUNT }, (_, i) => ({
  name: `col_${i}`,
  type: i % 2 === 0 ? 'INTEGER' : 'VARCHAR' // 25 numeric columns
}));

const statsRow = {};
columns.forEach(col => {
  if (col.type === 'INTEGER') {
    statsRow[`avg_${col.name}`] = 50;
    statsRow[`std_${col.name}`] = 10;
  }
});

// Mock Query Function
let queryCount = 0;
const QUERY_DELAY_MS = 10; // Simulate DB latency

const mockQuery = async (sql) => {
  queryCount++;
  await new Promise(resolve => setTimeout(resolve, QUERY_DELAY_MS));

  // Return dummy result structure
  if (sql.includes('SELECT COUNT(*) as cnt')) {
      return [{ cnt: 5 }];
  }
  if (sql.includes('CASE WHEN')) {
      const res = {};
      columns.filter(c => c.type === 'INTEGER').forEach(c => {
          res[`outlier_${c.name}`] = 5;
      });
      return [res];
  }
  return [{}];
};

// Original Logic
async function runOriginal() {
  queryCount = 0;
  const start = performance.now();

  // Logic from healthService.ts
  for (const col of columns) {
    const colType = col.type;
    if (['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(colType)) {
      const avg = Number(statsRow[`avg_${col.name}`]);
      const std = Number(statsRow[`std_${col.name}`]);

      if (std > 0) {
        const outlierSql = `SELECT COUNT(*) as cnt FROM current_dataset WHERE ABS("${col.name}" - ${avg}) > ${3 * std}`;
        const outlierRes = await mockQuery(outlierSql);
        const outlierCount = Number(outlierRes[0].cnt);
      }
    }
  }

  const end = performance.now();
  return { time: end - start, queries: queryCount };
}

// Optimized Logic
async function runOptimized() {
  queryCount = 0;
  const start = performance.now();

  const outlierChecks = [];
  const outlierCols = [];

  for (const col of columns) {
    const colType = col.type;
    if (['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(colType)) {
      const avg = Number(statsRow[`avg_${col.name}`]);
      const std = Number(statsRow[`std_${col.name}`]);

      if (std > 0) {
        // Construct the sum case statement
        outlierChecks.push(`SUM(CASE WHEN ABS("${col.name}" - ${avg}) > ${3 * std} THEN 1 ELSE 0 END) as "outlier_${col.name}"`);
        outlierCols.push(col.name);
      }
    }
  }

  if (outlierChecks.length > 0) {
    const outlierSql = `SELECT ${outlierChecks.join(', ')} FROM current_dataset`;
    const outlierRes = await mockQuery(outlierSql);
    const row = outlierRes[0];

    // Process results
    outlierCols.forEach(name => {
        const count = row[`outlier_${name}`];
    });
  }

  const end = performance.now();
  return { time: end - start, queries: queryCount };
}

console.log(`Running benchmark with ${COL_COUNT} columns (${COL_COUNT/2} numeric)...`);

const original = await runOriginal();
console.log(`Original: ${original.time.toFixed(2)}ms, Queries: ${original.queries}`);

const optimized = await runOptimized();
console.log(`Optimized: ${optimized.time.toFixed(2)}ms, Queries: ${optimized.queries}`);

if (optimized.time < original.time) {
  console.log(`Speedup: ${(original.time / optimized.time).toFixed(2)}x`);
}
