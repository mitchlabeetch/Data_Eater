const { performance } = require('perf_hooks');

const operators = [
  'equals', 'not_equals', 'contains', 'not_contains',
  'greater_than', 'less_than', 'starts_with', 'ends_with',
  'is_empty', 'is_not_empty'
];

const rules = [];
// 1000 rules
for (let i = 0; i < 1000; i++) {
  rules.push({
    column: `col_${i % 10}`,
    operator: operators[i % operators.length],
    value: `some'value ${i}`,
    active: true,
    priority: i
  });
}

function baseline(activeRules) {
  const clauses = [];
  activeRules.forEach(rule => {
    const col = `"${rule.column}"`;
    const val = rule.value.replace(/'/g, "''");

    switch (rule.operator) {
      case 'equals': clauses.push(`${col} = '${val}'`); break;
      case 'not_equals': clauses.push(`${col} != '${val}'`); break;
      case 'contains': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '%${val}%'`); break;
      case 'not_contains': clauses.push(`CAST(${col} AS VARCHAR) NOT ILIKE '%${val}%'`); break;
      case 'greater_than': clauses.push(`${col} > '${val}'`); break;
      case 'less_than': clauses.push(`${col} < '${val}'`); break;
      case 'starts_with': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '${val}%'`); break;
      case 'ends_with': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '%${val}%'`); break;
      case 'is_empty': clauses.push(`(${col} IS NULL OR CAST(${col} AS VARCHAR) = '')`); break;
      case 'is_not_empty': clauses.push(`(${col} IS NOT NULL AND CAST(${col} AS VARCHAR) != '')`); break;
    }
  });
  return clauses;
}

function optimized(activeRules) {
  const clauses = [];

  activeRules.forEach(rule => {
    const col = `"${rule.column}"`;
    let val;

    if (rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty') {
        val = rule.value.replace(/'/g, "''");
    }

    switch (rule.operator) {
      case 'equals': clauses.push(`${col} = '${val}'`); break;
      case 'not_equals': clauses.push(`${col} != '${val}'`); break;
      case 'contains': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '%${val}%'`); break;
      case 'not_contains': clauses.push(`CAST(${col} AS VARCHAR) NOT ILIKE '%${val}%'`); break;
      case 'greater_than': clauses.push(`${col} > '${val}'`); break;
      case 'less_than': clauses.push(`${col} < '${val}'`); break;
      case 'starts_with': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '${val}%'`); break;
      case 'ends_with': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '%${val}%'`); break;
      case 'is_empty': clauses.push(`(${col} IS NULL OR CAST(${col} AS VARCHAR) = '')`); break;
      case 'is_not_empty': clauses.push(`(${col} IS NOT NULL AND CAST(${col} AS VARCHAR) != '')`); break;
    }
  });
  return clauses;
}

// Correctness check
const baseRes = baseline(rules);
const optRes = optimized(rules);
if (JSON.stringify(baseRes) !== JSON.stringify(optRes)) {
    console.error("MISMATCH!");
    console.log("Base:", baseRes[0]);
    console.log("Opt:", optRes[0]);
    process.exit(1);
} else {
    console.log("Correctness check passed.");
}

// Benchmark
console.log("Running benchmark with 1000 rules, 1000 iterations...");

console.time('Baseline');
for(let i=0; i<1000; i++) baseline(rules);
console.timeEnd('Baseline');

console.time('Optimized');
for(let i=0; i<1000; i++) optimized(rules);
console.timeEnd('Optimized');
