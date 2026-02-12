const { performance } = require('perf_hooks');

// Mock data generation
const OPERATORS = [
    'equals', 'not_equals', 'contains', 'not_contains',
    'greater_than', 'less_than', 'starts_with', 'ends_with',
    'is_empty', 'is_not_empty'
];

function generateRules(count) {
    const rules = [];
    for (let i = 0; i < count; i++) {
        rules.push({
            column: `col_${i % 10}`,
            operator: OPERATORS[i % OPERATORS.length],
            value: `some_value_with_'quotes'_${i}`,
            active: true,
            priority: i
        });
    }
    return rules;
}

const activeRules = generateRules(100000); // 100k rules to make it measurable

function originalImplementation() {
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

function optimizedImplementation() {
    const clauses = [];
    activeRules.forEach(rule => {
        const col = `"${rule.column}"`;

        if (rule.operator === 'is_empty') {
             clauses.push(`(${col} IS NULL OR CAST(${col} AS VARCHAR) = '')`);
             return;
        }
        if (rule.operator === 'is_not_empty') {
             clauses.push(`(${col} IS NOT NULL AND CAST(${col} AS VARCHAR) != '')`);
             return;
        }

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
        }
    });
    return clauses;
}

// Warmup
originalImplementation();
optimizedImplementation();

// Measure Original
const startOrig = performance.now();
for(let i=0; i<100; i++) originalImplementation();
const endOrig = performance.now();
const timeOrig = endOrig - startOrig;

// Measure Optimized
const startOpt = performance.now();
for(let i=0; i<100; i++) optimizedImplementation();
const endOpt = performance.now();
const timeOpt = endOpt - startOpt;

console.log(`Original: ${timeOrig.toFixed(2)}ms`);
console.log(`Optimized: ${timeOpt.toFixed(2)}ms`);
console.log(`Improvement: ${((timeOrig - timeOpt) / timeOrig * 100).toFixed(2)}%`);

// Verify Correctness
const resOrig = originalImplementation();
const resOpt = optimizedImplementation();
if (JSON.stringify(resOrig) !== JSON.stringify(resOpt)) {
    console.error("Mismatch in results!");
    // Find first mismatch
    for(let i=0; i<resOrig.length; i++) {
        if(resOrig[i] !== resOpt[i]) {
            console.error(`Index ${i}: Expected "${resOrig[i]}", got "${resOpt[i]}"`);
            break;
        }
    }
} else {
    console.log("Results match!");
}
