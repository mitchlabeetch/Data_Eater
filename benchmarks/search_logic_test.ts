
const columns = [
  { name: 'id', type: 'INTEGER' },
  { name: 'email', type: 'VARCHAR' },
  { name: 'is_active', type: 'BOOLEAN' },
  { name: 'created_at', type: 'TIMESTAMP' },
  { name: 'score', type: 'DOUBLE' },
  { name: 'description', type: 'TEXT' },
  { name: 'metadata', type: 'VARCHAR' }
];

// Original Logic
function generateOriginal(q: string, cols: typeof columns) {
  const conditions = cols
    .map(col => `CAST("${col.name}" AS VARCHAR) ILIKE '%${q}%'`);
  return conditions.length;
}

// Proposed Logic (simplified for benchmark)
function generateOptimized(q: string, cols: typeof columns) {
  const relevant = cols.filter(col => {
    const type = col.type.toUpperCase();

    // Numeric
    if (['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'FLOAT'].includes(type)) {
      return /\d/.test(q);
    }

    // Boolean
    if (['BOOLEAN', 'BOOL'].includes(type)) {
      const lower = q.toLowerCase();
      return "true".includes(lower) || "false".includes(lower);
    }

    // Date
    if (['DATE', 'TIMESTAMP', 'TIME'].includes(type)) {
      return /[\d\-\/\:\s]/.test(q);
    }

    return true; // Text/Other
  });

  return relevant.length;
}

const scenarios = [
  { name: "Text Search", query: "alice" },
  { name: "Numeric Search", query: "42" },
  { name: "Boolean Search", query: "tru" },
  { name: "Complex Text", query: "test-data" }
];

console.log("--- Search Query Benchmark ---");
console.log(`Total Columns: ${columns.length} (Integer, Varchar, Boolean, Timestamp, Double, Text, Varchar)`);

scenarios.forEach(s => {
  const original = generateOriginal(s.query, columns);
  const optimized = generateOptimized(s.query, columns);

  const reduction = original - optimized;
  const percent = ((reduction / original) * 100).toFixed(1);

  console.log(`\nScenario: ${s.name} ("${s.query}")`);
  console.log(`  Original Clauses:  ${original}`);
  console.log(`  Optimized Clauses: ${optimized}`);
  console.log(`  Reduction:         ${reduction} clauses (-${percent}%)`);

  if (optimized < original) {
      console.log(`  ✅ Optimized SQL shorter/faster`);
  } else {
      console.log(`  ⚠️ No reduction`);
  }
});
