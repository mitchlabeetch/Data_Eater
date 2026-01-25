
// Helper to simulate the logic
interface Column {
  name: string;
  type: string;
}

const mockColumns: Column[] = [
  { name: 'id', type: 'INTEGER' },
  { name: 'name', type: 'VARCHAR' },
  { name: 'description', type: 'TEXT' },
  { name: 'price', type: 'DOUBLE' },
  { name: 'quantity', type: 'BIGINT' },
  { name: 'created_at', type: 'TIMESTAMP' },
  { name: 'is_active', type: 'BOOLEAN' },
  { name: 'category', type: 'VARCHAR' },
  { name: 'metadata', type: 'JSON' }, // JSON is often treated as text or struct
  { name: 'uuid', type: 'UUID' }
];

function originalLogic(columns: Column[], query: string): number {
  const q = query.replace(/'/g, "''");
  const conditions = columns
    .map(col => `CAST("${col.name}" AS VARCHAR) ILIKE '%${q}%'`);
  return conditions.length;
}

function getRelevantColumns(columns: Column[], query: string): Column[] {
  const q = query.trim().toLowerCase();
  const isBoolean = q.length > 0 && ('true'.includes(q) || 'false'.includes(q));
  const hasNumericChar = /[\d\.\,\-]/.test(q);
  const hasDateChar = /[\d\-\:\/]/.test(q);

  return columns.filter(col => {
    const type = col.type.toUpperCase();

    // 1. Text types: Always search
    if (['VARCHAR', 'TEXT', 'STRING', 'CHAR', 'BPCHAR', 'UUID', 'JSON'].some(t => type.includes(t))) return true;

    // 2. Numeric types
    if (hasNumericChar) {
      if (['INT', 'DOUBLE', 'FLOAT', 'DECIMAL', 'REAL', 'NUMERIC'].some(t => type.includes(t))) return true;
    }

    // 3. Date/Time types
    if (hasDateChar) {
      if (['DATE', 'TIME', 'TIMESTAMP', 'INTERVAL'].some(t => type.includes(t))) return true;
    }

    // 4. Boolean types
    if (isBoolean) {
      if (['BOOL'].some(t => type.includes(t))) return true;
    }

    return false;
  });
}

function optimizedLogic(columns: Column[], query: string): number {
    const relevant = getRelevantColumns(columns, query);
    const q = query.replace(/'/g, "''");
    const conditions = relevant
      .map(col => `CAST("${col.name}" AS VARCHAR) ILIKE '%${q}%'`);
    return conditions.length;
}

const testQueries = [
  "Apple",          // Pure text
  "123",            // Number / Text / Date year
  "2023-01",        // Date / Text
  "true",           // Boolean / Text
  "Apple Pie",      // Pure text
  "3.14",           // Number / Text
  "e",              // Boolean (in true/false) / Text
  "tru",            // Boolean / Text
  ".",              // Number (decimal point)
  "al"              // Boolean (false) / Text
];

console.log("Running Search Logic Benchmark (Refined)...\n");

console.log(`Schema: ${mockColumns.length} columns (${mockColumns.map(c => c.type).join(', ')})`);

for (const q of testQueries) {
  const base = originalLogic(mockColumns, q);
  const opt = optimizedLogic(mockColumns, q);
  const saved = base - opt;
  const pct = ((saved / base) * 100).toFixed(1);

  console.log(`Query: "${q}"`);
  console.log(`  Original Clauses: ${base}`);
  console.log(`  Optimized Clauses: ${opt}`);
  console.log(`  Reduction: -${saved} (${pct}%)`);

  if (opt === 0) {
      console.warn("  WARNING: 0 columns selected!");
  }
}
