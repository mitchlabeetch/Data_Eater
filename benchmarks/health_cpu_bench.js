
const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  SIRET: /^\d{14}$/,
  NIR: /^[12]\d{12}(\d{2})?$/, // French SSN
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
};

// Generate sample data
const rows = [];
for (let i = 0; i < 1000; i++) {
  if (i % 2 === 0) {
    rows.push({
      email: `user${i}@example.com`,
      siret: `1234567890123${i % 10}`,
      random: `random${i}`,
      mixed: i % 3 === 0 ? `test@test.com` : `not-email`
    });
  } else {
    rows.push({
      email: null,
      siret: null,
      random: `random${i}`,
      mixed: null
    });
  }
}

// Baseline: Replicates the current logic in src/services/healthService.ts
function baseline(colName) {
  const values = rows
    .map(row => row[colName])
    .filter(v => v !== null && v !== undefined)
    .slice(0, 100)
    .map(String);

  let detectedPattern;
  for (const [key, regex] of Object.entries(PATTERNS)) {
    const matchCount = values.filter(v => regex.test(v)).length;
    if (values.length > 0 && matchCount > values.length * 0.7) { // 70% match in sample
      detectedPattern = key;
      break;
    }
  }
  return detectedPattern;
}

// Optimized: Single pass extraction, then pattern check
function optimized(colName) {
  const values = [];
  // 1. Single pass to extract up to 100 valid string values
  // This avoids iterating the full 1000 rows if we find 100 valid ones early.
  // It also avoids creating intermediate arrays for map/filter.
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][colName];
    if (val !== null && val !== undefined) {
      values.push(String(val));
      if (values.length >= 100) break;
    }
  }

  if (values.length === 0) return undefined;

  // 2. Iterate patterns (same as baseline logic, but on the extracted array)
  let detectedPattern;
  for (const [key, regex] of Object.entries(PATTERNS)) {
    let matchCount = 0;
    // Manual loop is faster than filter for counting
    for (let i = 0; i < values.length; i++) {
      if (regex.test(values[i])) {
        matchCount++;
      }
    }

    if (matchCount > values.length * 0.7) {
      detectedPattern = key;
      break;
    }
  }
  return detectedPattern;
}

// Warmup
console.log("Warming up...");
for (let i = 0; i < 100; i++) {
  baseline('email');
  optimized('email');
}

// Measure
console.log("Benchmarking...");
const iterations = 10000;

console.time('Baseline (email)');
for (let i = 0; i < iterations; i++) {
  baseline('email');
}
console.timeEnd('Baseline (email)');

console.time('Optimized (email)');
for (let i = 0; i < iterations; i++) {
  optimized('email');
}
console.timeEnd('Optimized (email)');

// Correctness check
const checks = ['email', 'siret', 'random', 'mixed'];
for (const col of checks) {
  const b = baseline(col);
  const o = optimized(col);
  if (b !== o) {
    console.error(`Mismatch for ${col}: ${b} vs ${o}`);
    process.exit(1);
  } else {
    console.log(`Result match for ${col}: ${b}`);
  }
}
