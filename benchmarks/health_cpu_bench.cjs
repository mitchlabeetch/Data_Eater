// benchmarks/health_cpu_bench.cjs
const { performance } = require('perf_hooks');

// Patterns from src/services/healthService.ts
const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  SIRET: /^\d{14}$/,
  NIR: /^[12]\d{12}(\d{2})?$/, // French SSN
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
};

// Generate Sample Data (Force match)
const generateData = () => {
  const rows = [];
  for (let i = 0; i < 1000; i++) {
    const r = Math.random();
    let val = null;
    if (r < 0.1) val = null;
    else if (r < 0.9) val = `user${i}@example.com`; // 80% Email match
    else val = `random_string_${i}`;

    rows.push({ col: val });
  }
  return rows;
};

const sampleRows = generateData();
const col = { name: 'col' };

// Baseline Implementation
const baseline = (rows) => {
  let detectedPattern;
  const values = rows
    .map(row => row[col.name])
    .filter(v => v !== null && v !== undefined)
    .slice(0, 100)
    .map(String);

  for (const [key, regex] of Object.entries(PATTERNS)) {
    const matchCount = values.filter(v => regex.test(v)).length;
    if (values.length > 0 && matchCount > values.length * 0.7) {
      detectedPattern = key;
      break;
    }
  }
  return detectedPattern;
};

// Strategy A: All-at-once
const optimizedA = (rows) => {
  let detectedPattern;
  let validCount = 0;
  const counts = {};
  for (const key in PATTERNS) counts[key] = 0;

  for (const row of rows) {
    const v = row[col.name];
    if (v !== null && v !== undefined) {
      const s = String(v);
      validCount++;

      for (const [key, regex] of Object.entries(PATTERNS)) {
        if (regex.test(s)) counts[key]++;
      }

      if (validCount === 100) break;
    }
  }

  if (validCount > 0) {
    const threshold = validCount * 0.7;
    for (const key of Object.keys(PATTERNS)) {
      if (counts[key] > threshold) {
        detectedPattern = key;
        break;
      }
    }
  }
  return detectedPattern;
};

// Strategy B: Collect then Check
const optimizedB = (rows) => {
  let detectedPattern;
  const values = [];

  // Single pass to collect
  for (const row of rows) {
    const v = row[col.name];
    if (v !== null && v !== undefined) {
      values.push(String(v));
      if (values.length === 100) break;
    }
  }

  // Check patterns lazily
  if (values.length > 0) {
    const threshold = values.length * 0.7;
    for (const [key, regex] of Object.entries(PATTERNS)) {
      let matchCount = 0;
      for (const val of values) {
        if (regex.test(val)) matchCount++;
      }
      if (matchCount > threshold) {
        detectedPattern = key;
        break;
      }
    }
  }

  return detectedPattern;
};


// Verify Correctness
const bRes = baseline(sampleRows);
const aRes = optimizedA(sampleRows);
const bResOpt = optimizedB(sampleRows);

console.log(`Baseline Result: ${bRes}`);
console.log(`OptimizedA Result: ${aRes}`);
console.log(`OptimizedB Result: ${bResOpt}`);

if (bRes !== aRes || bRes !== bResOpt) {
  console.error("MISMATCH!");
  process.exit(1);
}

// Measure Performance
const runBenchmark = (name, fn, iterations = 2000) => {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn(sampleRows);
  }
  return performance.now() - start;
};

console.log("\nRunning Benchmark (2000 iterations)...");
const tBase = runBenchmark("Baseline", baseline);
console.log(`Baseline Time: ${tBase.toFixed(2)}ms`);

const tOptA = runBenchmark("Optimized A (All-at-once)", optimizedA);
console.log(`Optimized A Time: ${tOptA.toFixed(2)}ms`);

const tOptB = runBenchmark("Optimized B (Collect-then-Check)", optimizedB);
console.log(`Optimized B Time: ${tOptB.toFixed(2)}ms`);

console.log(`Speedup A: ${(tBase / tOptA).toFixed(2)}x`);
console.log(`Speedup B: ${(tBase / tOptB).toFixed(2)}x`);
