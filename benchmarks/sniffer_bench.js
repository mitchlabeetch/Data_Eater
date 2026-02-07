// Benchmark for sniffing logic optimization
// This script compares the performance of the original 'split' approach vs. 'indexOf'

// --- Original Implementation ---
const detectDelimiterOriginal = (text) => {
  const candidates = [',', ';', '\t', '|'];
  const lines = text.split(/\r?\n/).filter(line => line.length > 0).slice(0, 10);

  if (lines.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = 0;

  for (const delim of candidates) {
    const counts = lines.map(line => line.split(delim).length);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

    if (avg <= 1) continue;

    const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;

    const score = (avg * 10) - (variance * 100);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
};

// --- Optimized Implementation ---
const detectDelimiterOptimized = (text) => {
  const candidates = [',', ';', '\t', '|'];

  const lines = [];
  let startIndex = 0;
  while (lines.length < 10 && startIndex < text.length) {
    let endIndex = text.indexOf('\n', startIndex);
    if (endIndex === -1) endIndex = text.length;

    let line = text.substring(startIndex, endIndex);
    if (line.endsWith('\r')) line = line.slice(0, -1);

    if (line.length > 0) {
      lines.push(line);
    }

    startIndex = endIndex + 1;
  }

  if (lines.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = 0;

  for (const delim of candidates) {
    const counts = lines.map(line => line.split(delim).length);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

    if (avg <= 1) continue;

    const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;

    const score = (avg * 10) - (variance * 100);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
};


// --- Benchmark Setup ---
const generateLargeCSV = (rows) => {
  const header = 'col1,col2,col3,col4,col5';
  let content = header + '\n';
  for (let i = 0; i < rows; i++) {
    content += `val1_${i},val2_${i},val3_${i},val4_${i},val5_${i}\n`;
  }
  return content;
};

// Generate a large CSV (~5MB)
const rows = 100000;
console.log(`Generating CSV with ${rows} rows...`);
const largeText = generateLargeCSV(rows);
console.log(`Generated text length: ${(largeText.length / 1024 / 1024).toFixed(2)} MB`);

// --- Correctness Check ---
console.log('Verifying correctness...');
const resOrig = detectDelimiterOriginal(largeText);
const resOpt = detectDelimiterOptimized(largeText);

if (resOrig !== resOpt) {
  console.error(`Mismatch! Original: ${resOrig}, Optimized: ${resOpt}`);
  process.exit(1);
}
console.log('Correctness verified: Both implementations return same delimiter.');

// --- Performance Measurement ---
const ITERATIONS = 100;

console.log(`Starting benchmark (${ITERATIONS} iterations)...`);

const startOriginal = process.hrtime();
for (let i = 0; i < ITERATIONS; i++) {
  detectDelimiterOriginal(largeText);
}
const endOriginal = process.hrtime(startOriginal);
const timeOriginal = (endOriginal[0] * 1000 + endOriginal[1] / 1e6);

console.log(`Original Time: ${timeOriginal.toFixed(2)} ms`);

const startOptimized = process.hrtime();
for (let i = 0; i < ITERATIONS; i++) {
  detectDelimiterOptimized(largeText);
}
const endOptimized = process.hrtime(startOptimized);
const timeOptimized = (endOptimized[0] * 1000 + endOptimized[1] / 1e6);

console.log(`Optimized Time: ${timeOptimized.toFixed(2)} ms`);

const speedup = timeOriginal / timeOptimized;
console.log(`Speedup: ${speedup.toFixed(2)}x`);

if (timeOptimized >= timeOriginal) {
    console.warn("WARNING: Optimization is slower or same speed as original!");
}
