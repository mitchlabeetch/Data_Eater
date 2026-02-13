
const fs = require('fs');

// Original implementation
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

// Optimized implementation
const detectDelimiterOptimized = (text) => {
  const candidates = [',', ';', '\t', '|'];

  const lines = [];
  let start = 0;
  // We need up to 10 non-empty lines
  while (lines.length < 10 && start < text.length) {
    let end = text.indexOf('\n', start);
    let line;

    if (end === -1) {
        line = text.substring(start);
        start = text.length; // End loop next time
    } else {
        line = text.substring(start, end);
        if (line.endsWith('\r')) {
            line = line.substring(0, line.length - 1);
        }
        start = end + 1;
    }

    if (line.length > 0) {
        lines.push(line);
    }
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

// Benchmark function
function runBenchmark() {
    console.log("Generating large CSV data...");

    // Generate a large CSV content: ~16KB (sniffFile uses 16KB chunk)
    // 500 lines should be around 16KB
    let csvContent = "";
    for (let i = 0; i < 500; i++) {
        csvContent += `${i},User${i},${Math.random() * 100}\n`;
    }

    // Also test with \r\n
    let csvContentCRLF = "";
    for (let i = 0; i < 500; i++) {
        csvContentCRLF += `${i},User${i},${Math.random() * 100}\r\n`;
    }

    // Test with semicolon
    let semiContent = "";
    for (let i = 0; i < 500; i++) {
        semiContent += `${i};User${i};${Math.random() * 100}\n`;
    }

    console.log(`Generated CSV size: ${csvContent.length} chars`);

    // Verification
    console.log("Verifying correctness...");
    const resOrig = detectDelimiterOriginal(csvContent);
    const resOpt = detectDelimiterOptimized(csvContent);
    if (resOrig !== resOpt) {
        console.error(`Mismatch on CSV! Original: ${resOrig}, Optimized: ${resOpt}`);
        process.exit(1);
    }

    const resOrigCRLF = detectDelimiterOriginal(csvContentCRLF);
    const resOptCRLF = detectDelimiterOptimized(csvContentCRLF);
    if (resOrigCRLF !== resOptCRLF) {
        console.error(`Mismatch on CRLF! Original: ${resOrigCRLF}, Optimized: ${resOptCRLF}`);
        process.exit(1);
    }

     const resOrigSemi = detectDelimiterOriginal(semiContent);
    const resOptSemi = detectDelimiterOptimized(semiContent);
    if (resOrigSemi !== resOptSemi) {
        console.error(`Mismatch on Semi! Original: ${resOrigSemi}, Optimized: ${resOptSemi}`);
        process.exit(1);
    }
    console.log("Correctness verified.");

    // Performance Test
    const iterations = 5000;

    console.log(`Running benchmark (${iterations} iterations)...`);

    const startOrig = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        detectDelimiterOriginal(csvContent);
    }
    const endOrig = process.hrtime.bigint();
    const durationOrig = Number(endOrig - startOrig) / 1e6; // ms

    const startOpt = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        detectDelimiterOptimized(csvContent);
    }
    const endOpt = process.hrtime.bigint();
    const durationOpt = Number(endOpt - startOpt) / 1e6; // ms

    console.log(`Original: ${durationOrig.toFixed(2)} ms`);
    console.log(`Optimized: ${durationOpt.toFixed(2)} ms`);
    console.log(`Speedup: ${(durationOrig / durationOpt).toFixed(2)}x`);
}

runBenchmark();
