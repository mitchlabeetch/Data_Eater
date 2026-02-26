
import fuzzysort from 'fuzzysort';
import { performance } from 'perf_hooks';

// Generate dummy data
const words = [
  "apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew",
  "kiwi", "lemon", "mango", "nectarine", "orange", "papaya", "quince", "raspberry",
  "strawberry", "tangerine", "ugli", "vanilla", "watermelon", "xigua", "yam", "zucchini",
  "apricot", "blackberry", "cantaloupe", "dragonfruit", "eggplant", "grapefruit",
  "huckleberry", "jackfruit", "kumquat", "lime", "mulberry", "olive", "peach", "pear",
  "plum", "pomegranate", "pumpkin", "rhubarb", "spinach", "tomato", "turnip"
];

// Create a larger dataset
const dataset = [];
for (let i = 0; i < 20; i++) {
  words.forEach(w => dataset.push(w + "_" + i));
}
// 45 * 20 = 900 items, close to the 1000 limit in the worker code.

const sortedValues = [...dataset].sort((a, b) => b.length - a.length);
const used = new Set();
const MIN_THRESHOLD = 0.6;
const BASE_THRESHOLD = 0.95;
const LENGTH_PENALTY = 0.01;

console.log(`Dataset size: ${sortedValues.length}`);

// Baseline
function runBaseline() {
  const start = performance.now();
  let count = 0;

  sortedValues.forEach(val => {
    // Mimic the worker logic (simplified)
    const dynamicThreshold = Math.max(MIN_THRESHOLD, BASE_THRESHOLD - (val.length * LENGTH_PENALTY));

    // Original: pass array of strings
    const fuzzyResults = fuzzysort.go(val, sortedValues, { threshold: dynamicThreshold });
    count += fuzzyResults.length;
  });

  const end = performance.now();
  return { time: end - start, count };
}

// Optimized
function runOptimized() {
  const start = performance.now();
  let count = 0;

  // Prepare targets once
  // fuzzysort.prepare(string) returns a prepared object { target: "string", ... }
  // Wait, does fuzzysort.go accept an array of prepared objects?
  // According to docs/source, yes.

  const preparedTargets = sortedValues.map(v => fuzzysort.prepare(v));

  sortedValues.forEach(val => {
    const dynamicThreshold = Math.max(MIN_THRESHOLD, BASE_THRESHOLD - (val.length * LENGTH_PENALTY));

    // Optimized: pass prepared targets
    const fuzzyResults = fuzzysort.go(val, preparedTargets, { threshold: dynamicThreshold });
    count += fuzzyResults.length;
  });

  const end = performance.now();
  return { time: end - start, count };
}

console.log("Running baseline...");
const baseline = runBaseline();
console.log(`Baseline: ${baseline.time.toFixed(2)}ms, Count: ${baseline.count}`);

console.log("Running optimized...");
const optimized = runOptimized();
console.log(`Optimized: ${optimized.time.toFixed(2)}ms, Count: ${optimized.count}`);

console.log(`Speedup: ${(baseline.time / optimized.time).toFixed(2)}x`);

if (baseline.count !== optimized.count) {
  console.error("MISMATCH IN RESULTS!");
}
