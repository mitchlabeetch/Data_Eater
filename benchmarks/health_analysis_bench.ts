
// Mock Dependencies
const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  SIRET: /^\d{14}$/,
  NIR: /^[12]\d{12}(\d{2})?$/, // French SSN
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
};

// Mock query function
let queryCallCount = 0;
const mockQueryDelay = 50; // 50ms per query to simulate DB latency

const mockQuery = async (sql) => {
  queryCallCount++;
  await new Promise(resolve => setTimeout(resolve, mockQueryDelay));

  // Return different results based on the query to simulate somewhat realistic behavior
  if (sql.includes("COUNT(*)")) {
    // Stats query
    return [{
      total_rows: 10000,
      count_col1: 9000, dist_col1: 8000,
      count_col2: 9500, dist_col2: 100,
      count_col3: 10000, dist_col3: 5000,
    }];
  }

  if (sql.includes("LIMIT 10") && sql.includes("IS NOT NULL")) {
      // Pattern matching sample query
      // Return 10 dummy values
      return Array(10).fill(0).map((_, i) => {
          // Check if we are querying for a specific column to return specific patterns
          if (sql.includes('"Email"')) return { Email: `user${i}@example.com` };
          if (sql.includes('"SIRET"')) return { SIRET: "12345678901234" };
          return { [sql.match(/"([^"]+)"/)[1]]: `value${i}` };
      });
  }

  if (sql.includes("LIMIT 1000") || sql.includes("LIMIT 500")) {
      // Full sample query
      // Return 1000 dummy rows
      return Array(1000).fill(0).map((_, i) => ({
          Email: `user${i}@example.com`,
          SIRET: "12345678901234",
          Other: `value${i}`,
          col1: `val${i}`,
          col2: i,
          col3: i * 2
      }));
  }

  return [];
};

// --- Original Implementation (Simplified for benchmark) ---
const analyzeHealthOriginal = async (columns) => {
  queryCallCount = 0;
  const start = Date.now();

  // 1. Stats Query (Mocked result usage)
  const aggs = columns.map(col => `COUNT("${col.name}")`).join(', ');
  await mockQuery(`SELECT COUNT(*) as total_rows, ${aggs} FROM current_dataset`);

  // Loop over columns
  for (const col of columns) {
    if (col.type === 'VARCHAR') {
      // N+1 Query here!
      const sample = await mockQuery(`SELECT "${col.name}" FROM current_dataset WHERE "${col.name}" IS NOT NULL LIMIT 10`);
      const values = sample.map(s => String(s[col.name]));

      // Pattern matching logic
      for (const [key, regex] of Object.entries(PATTERNS)) {
        const matchCount = values.filter(v => regex.test(v)).length;
        if (matchCount > values.length * 0.7) {
          // Detected
          break;
        }
      }
    }
  }

  // AS400 (fetching 500 rows)
  await mockQuery(`SELECT * FROM current_dataset LIMIT 500`);

  const duration = Date.now() - start;
  return { duration, queries: queryCallCount };
};

// --- Optimized Implementation ---
const analyzeHealthOptimized = async (columns) => {
  queryCallCount = 0;
  const start = Date.now();

  // 1. Stats Query
  const aggs = columns.map(col => `COUNT("${col.name}")`).join(', ');
  await mockQuery(`SELECT COUNT(*) as total_rows, ${aggs} FROM current_dataset`);

  // 2. Fetch Single Sample (1000 rows) for all columns
  const sampleRows = await mockQuery(`SELECT * FROM current_dataset LIMIT 1000`);

  // Loop over columns (in-memory)
  for (const col of columns) {
    if (col.type === 'VARCHAR') {
      // Extract values from the sample in memory
      const values = sampleRows
        .map(r => r[col.name])
        .filter(v => v !== null && v !== undefined)
        .slice(0, 10) // Limit to 10 to match original logic, or more if desired
        .map(String);

      // Pattern matching logic
      for (const [key, regex] of Object.entries(PATTERNS)) {
        const matchCount = values.filter(v => regex.test(v)).length;
        if (matchCount > values.length * 0.7) {
          // Detected
          break;
        }
      }
    }
  }

  // AS400 (Reuse sampleRows! No extra query)
  // (In real code, we'd pass sampleRows to validateForAS400)

  const duration = Date.now() - start;
  return { duration, queries: queryCallCount };
};

// Run Benchmark
const run = async () => {
  const columns = [
    { name: 'Email', type: 'VARCHAR' },
    { name: 'SIRET', type: 'VARCHAR' },
    { name: 'Other', type: 'VARCHAR' },
    { name: 'col1', type: 'VARCHAR' },
    { name: 'col2', type: 'INTEGER' },
    { name: 'col3', type: 'VARCHAR' },
    { name: 'col4', type: 'VARCHAR' },
    { name: 'col5', type: 'VARCHAR' },
    { name: 'col6', type: 'VARCHAR' },
    { name: 'col7', type: 'VARCHAR' },
  ]; // 10 columns, 9 VARCHAR

  console.log("Running Baseline (N+1 Queries)...");
  const resOriginal = await analyzeHealthOriginal(columns);
  console.log(`Baseline: ${resOriginal.duration}ms, ${resOriginal.queries} queries`);

  console.log("\nRunning Optimized (Batch Query)...");
  const resOptimized = await analyzeHealthOptimized(columns);
  console.log(`Optimized: ${resOptimized.duration}ms, ${resOptimized.queries} queries`);

  const improvement = (resOriginal.duration / resOptimized.duration).toFixed(1);
  console.log(`\nSpeedup: ~${improvement}x`);
};

run().catch(console.error);
