
// Simplified mock of getRelevantColumns from src/lib/searchUtils.ts
const getRelevantColumns = (columns, query) => {
  const q = query.trim();
  if (!q) return [];

  const hasDigits = /\d/.test(q);
  const lowerQ = q.toLowerCase();
  const isBooleanLike = lowerQ.includes("true") || lowerQ.includes("false");

  return columns.filter(col => {
    const type = col.type.toUpperCase();

    if (type.includes('CHAR') || type.includes('TEXT') || type.includes('STRING')) return true;

    if (
      type.includes('INT') || type.includes('DOUBLE') || type.includes('FLOAT') ||
      type.includes('DECIMAL') || type.includes('REAL') || type.includes('NUMERIC')
    ) {
      if (hasDigits || /[\-\.]/.test(q)) return true;
      if (lowerQ.includes("infinity") || lowerQ.includes("nan")) return true;
      return false;
    }

    if (type.includes('BOOL')) return isBooleanLike;

    if (type.includes('DATE') || type.includes('TIME')) {
        return hasDigits || /[\-\/\:\.]/.test(q);
    }

    return true;
  });
};

const columns = [
  { name: 'id', type: 'INTEGER' },
  { name: 'first_name', type: 'VARCHAR' },
  { name: 'last_name', type: 'VARCHAR' },
  { name: 'email', type: 'VARCHAR' },
  { name: 'is_active', type: 'BOOLEAN' },
  { name: 'created_at', type: 'TIMESTAMP' },
  { name: 'score', type: 'DOUBLE' },
  { name: 'bio', type: 'TEXT' },
  { name: 'metadata', type: 'VARCHAR' },
  { name: 'col with "quotes"', type: 'VARCHAR' }
];

function generateOriginal(q, cols) {
    const relevantCols = getRelevantColumns(cols, q);
    if (relevantCols.length === 0) return "(1=0)";

    const conditions = relevantCols
      .map(col => `CAST("${col.name.replace(/"/g, '""')}" AS VARCHAR) ILIKE '%${q.replace(/'/g, "''")}%'`)
      .join(' OR ');
    return `(${conditions})`;
}

function generateOptimized(q, cols) {
    const relevantCols = getRelevantColumns(cols, q);
    const safeQ = q.replace(/'/g, "''");

    if (relevantCols.length === 0) return "(1=0)";

    const args = relevantCols
        .map(col => `CAST("${col.name.replace(/"/g, '""')}" AS VARCHAR)`)
        .join(', ');

    return `(concat_ws(' ', ${args}) ILIKE '%${safeQ}%')`;
}

const scenarios = [
  { name: "Text Search", query: "alice" },
  { name: "Numeric Search", query: "42" },
  { name: "Mixed Search", query: "test 123" },
  { name: "Quote Search", query: "O'Reilly" },
  { name: "Double Quote Column", query: "foo" }
];

console.log("--- Search Query Optimization Test (Verification) ---");

scenarios.forEach(s => {
  console.log(`\nScenario: ${s.name} ("${s.query}")`);

  const originalSQL = generateOriginal(s.query, columns);
  const optimizedSQL = generateOptimized(s.query, columns);

  console.log(`Original Length: ${originalSQL.length} chars`);
  const originalOps = (originalSQL.match(/ILIKE/g) || []).length;
  const optimizedOps = (optimizedSQL.match(/ILIKE/g) || []).length;

  console.log(`Original Ops (ILIKE): ${originalOps}`);
  console.log(`Optimized Ops (ILIKE): ${optimizedOps}`);

  console.log("Original SQL snippet: ", originalSQL.substring(0, 100) + "...");
  console.log("Optimized SQL snippet:", optimizedSQL.substring(0, 100) + "...");

  if (optimizedOps < originalOps || (originalOps === 1 && optimizedOps === 1 && optimizedSQL.length < originalSQL.length)) {
      console.log("✅ Optimization reduces operations/complexity");
  } else if (originalOps === 0) {
      console.log("ℹ️ No relevant columns found (empty query)");
  } else {
      console.log("⚠️ No reduction in operations (maybe only 1 column relevant?)");
  }
});
