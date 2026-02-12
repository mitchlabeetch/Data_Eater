
import { performance } from 'perf_hooks';

// --- Mocks ---

// Mock query function
let queryCount = 0;
const mockQuery = async (sql: string) => {
  queryCount++;
  // Simulate network/DB latency
  await new Promise(resolve => setTimeout(resolve, 10)); // 10ms per query

  // Mock response based on SQL
  if (sql.includes('COUNT(*)')) {
    // Stats query
    return [{
      total_rows: 10000,
      count_col1: 9000, dist_col1: 5000,
      count_col2: 10000, dist_col2: 10000,
      count_col3: 8000, dist_col3: 200,
      // ... assume other stats
    }];
  }

  if (sql.includes('LIMIT 10') && sql.includes('IS NOT NULL')) {
      // Sample query for specific column
      // Extract column name from SQL
      const match = sql.match(/"([^"]+)"/);
      const colName = match ? match[1] : 'unknown';
      // Return 10 values
      return Array(10).fill({ [colName]: `sample_value_for_${colName}` });
  }

  if (sql.includes('LIMIT 1000')) {
      // Bulk sample query
      const rows = [];
      for(let i=0; i<1000; i++) {
          rows.push({
              col1: i < 900 ? `value_${i}` : null,
              col2: `email_${i}@example.com`,
              col3: `text_${i}`
          });
      }
      return rows;
  }

  if (sql.includes('LIMIT 500')) { // AS400 sample
      return Array(500).fill({ col1: 'val', col2: 'val' });
  }

  if (sql.includes('SUM(CASE')) { // Outlier query
      return [{ outlier_col1: 0 }];
  }

  return [];
};

// Mock validateForAS400
const mockValidateForAS400 = (rows: any[], columns: any[]) => {
  return { headers: { valid: true, errors: [] }, encoding: { valid: true, errors: [] }, structure: { valid: true, errors: [] } };
};

// Mock detectJaggedRows
const mockDetectJaggedRows = async (file: any) => {
  return [];
};

// --- Original Implementation (Simplified for benchmark) ---

const PATTERNS: Record<string, RegExp> = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  SIRET: /^\d{14}$/,
  NIR: /^[12]\d{12}(\d{2})?$/, // French SSN
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
};

const analyzeHealthOriginal = async (columns: { name: string; type: string }[], file?: any) => {
  const issues = { critical: [], warning: [], info: [] } as any;

  // 1. Core Metrics Query
  const aggs = columns.map(col => {
    const safeName = `"${col.name}"`;
    const base = `COUNT(${safeName}) as "count_${col.name}", COUNT(DISTINCT ${safeName}) as "dist_${col.name}"`;
    if (['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(col.type.toUpperCase())) {
      return `${base}, AVG(${safeName}) as "avg_${col.name}", STDDEV(${safeName}) as "std_${col.name}"`;
    }
    return base;
  }).join(', ');

  const sql = `SELECT COUNT(*) as total_rows, ${aggs} FROM current_dataset`;
  const res = await mockQuery(sql);
  const statsRow = res[0];
  const rowCount = Number(statsRow.total_rows);

  const columnHealth: Record<string, any> = {};

  let totalColumnScore = 0;

  for (const col of columns) {
    const count = Number(statsRow[`count_${col.name}`] || 0);
    const unique = Number(statsRow[`dist_${col.name}`] || 0);
    const nullCount = rowCount - count;
    const nullPercent = rowCount > 0 ? (nullCount / rowCount) * 100 : 0;

    let score = 100;
    if (nullPercent > 10) score -= 10;
    if (nullPercent > 50) score -= 30;

    let outlierCount = 0;
    const colType = col.type.toUpperCase();

    // Pattern Matching (Heuristic) -> THIS IS THE BOTTLENECK
    let detectedPattern: string | undefined;
    if (colType === 'VARCHAR') {
      const sample = await mockQuery(`SELECT "${col.name}" FROM current_dataset WHERE "${col.name}" IS NOT NULL LIMIT 10`);
      const values = sample.map((s: any) => String(s[col.name]));

      for (const [key, regex] of Object.entries(PATTERNS)) {
        const matchCount = values.filter(v => regex.test(v)).length;
        if (matchCount > values.length * 0.7) {
          detectedPattern = key;
          break;
        }
      }
    }

    columnHealth[col.name] = {
      name: col.name,
      patternMatch: detectedPattern
    };

    totalColumnScore += score;
  }

  // 3. AS400 Validation
  const sampleRows = await mockQuery(`SELECT * FROM current_dataset LIMIT 500`);
  const as400 = mockValidateForAS400(sampleRows, columns);

  return { columnHealth };
};

// --- Optimized Implementation ---

const analyzeHealthOptimized = async (columns: { name: string; type: string }[], file?: any) => {
  const issues = { critical: [], warning: [], info: [] } as any;

  // 1. Core Metrics Query
  const aggs = columns.map(col => {
    const safeName = `"${col.name}"`;
    const base = `COUNT(${safeName}) as "count_${col.name}", COUNT(DISTINCT ${safeName}) as "dist_${col.name}"`;
    if (['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(col.type.toUpperCase())) {
      return `${base}, AVG(${safeName}) as "avg_${col.name}", STDDEV(${safeName}) as "std_${col.name}"`;
    }
    return base;
  }).join(', ');

  const sql = `SELECT COUNT(*) as total_rows, ${aggs} FROM current_dataset`;
  const res = await mockQuery(sql);
  const statsRow = res[0];
  const rowCount = Number(statsRow.total_rows);

  const columnHealth: Record<string, any> = {};

  // OPTIMIZATION: Fetch sample rows ONCE
  const sampleRows = await mockQuery(`SELECT * FROM current_dataset LIMIT 1000`);
  const samples = sampleRows as any[];

  let totalColumnScore = 0;

  for (const col of columns) {
    const count = Number(statsRow[`count_${col.name}`] || 0);
    const unique = Number(statsRow[`dist_${col.name}`] || 0);
    const nullCount = rowCount - count;
    const nullPercent = rowCount > 0 ? (nullCount / rowCount) * 100 : 0;

    let score = 100;
    if (nullPercent > 10) score -= 10;
    if (nullPercent > 50) score -= 30;

    let outlierCount = 0;
    const colType = col.type.toUpperCase();

    // Pattern Matching (Heuristic)
    let detectedPattern: string | undefined;
    if (colType === 'VARCHAR') {
      // Filter in memory from the fetched samples
      const values = [];
      for (const row of samples) {
        const val = row[col.name];
        if (val !== null && val !== undefined && val !== '') {
           values.push(String(val));
        }
        if (values.length >= 10) break;
      }

      for (const [key, regex] of Object.entries(PATTERNS)) {
        const matchCount = values.filter(v => regex.test(v)).length;
        if (values.length > 0 && matchCount > values.length * 0.7) {
          detectedPattern = key;
          break;
        }
      }
    }

    columnHealth[col.name] = {
      name: col.name,
      patternMatch: detectedPattern
    };

    totalColumnScore += score;
  }

  // 3. AS400 Validation (Uses the same sampleRows if valid, or fetch if 1000 is too much?
  // Original fetched 500. We fetched 1000. So we can just reuse it.)
  // const sampleRows = await mockQuery(`SELECT * FROM current_dataset LIMIT 500`); <-- REMOVED
  const as400 = mockValidateForAS400(samples.slice(0, 500), columns);

  return { columnHealth };
};

// --- Benchmark Runner ---

async function runBenchmark() {
    const columns = [];
    // Create 50 VARCHAR columns to simulate N+1 impact
    for(let i=0; i<50; i++) {
        columns.push({ name: `col${i}`, type: 'VARCHAR' });
    }

    console.log(`Running benchmark with ${columns.length} columns...`);

    // Run Original
    queryCount = 0;
    const startOrig = performance.now();
    await analyzeHealthOriginal(columns);
    const endOrig = performance.now();
    const timeOrig = endOrig - startOrig;
    const queriesOrig = queryCount;
    console.log(`Original: ${timeOrig.toFixed(2)}ms (${queriesOrig} queries)`);

    // Run Optimized
    queryCount = 0;
    const startOpt = performance.now();
    await analyzeHealthOptimized(columns);
    const endOpt = performance.now();
    const timeOpt = endOpt - startOpt;
    const queriesOpt = queryCount;
    console.log(`Optimized: ${timeOpt.toFixed(2)}ms (${queriesOpt} queries)`);

    console.log(`Improvement: ${(timeOrig - timeOpt).toFixed(2)}ms`);
    console.log(`Query Reduction: ${queriesOrig - queriesOpt}`);
}

runBenchmark();
