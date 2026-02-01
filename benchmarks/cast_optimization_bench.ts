
import { getRelevantColumns } from '../src/lib/searchUtils';

const columns = [
  { name: 'id', type: 'INTEGER' },
  { name: 'email', type: 'VARCHAR' }, // Text
  { name: 'is_active', type: 'BOOLEAN' },
  { name: 'bio', type: 'TEXT' }, // Text
  { name: 'score', type: 'DOUBLE' }
];

const searchQuery = "alice";

// The OPTIMIZED logic (copied from src/stores/dataStore.ts)
function generateOptimizedSql(columns: any[], query: string) {
  const q = query.replace(/'/g, "''");
  const relevantCols = getRelevantColumns(columns, query);

  const conditions = relevantCols
    .map(col => {
      const isText = ['VARCHAR', 'TEXT', 'STRING', 'CHAR'].some(t => col.type.toUpperCase().includes(t));
      return isText
        ? `"${col.name}" ILIKE '%${q}%'`
        : `CAST("${col.name}" AS VARCHAR) ILIKE '%${q}%'`;
    })
    .join(' OR ');

  return conditions;
}

console.log("--- Cast Optimization Benchmark (Verification) ---");
const sql = generateOptimizedSql(columns, searchQuery);
console.log("Generated SQL Fragment:");
console.log(sql);

const castCount = (sql.match(/CAST\(/g) || []).length;
console.log(`\nCAST count: ${castCount}`);

// Analysis
const relevantCols = getRelevantColumns(columns, searchQuery);
console.log(`Relevant Columns: ${relevantCols.map(c => c.name + '(' + c.type + ')').join(', ')}`);

if (castCount === 0) {
    console.log("✅ SUCCESS: No unnecessary CASTs found.");
} else {
    console.log("❌ FAILURE: CASTs still present.");
    process.exit(1);
}
