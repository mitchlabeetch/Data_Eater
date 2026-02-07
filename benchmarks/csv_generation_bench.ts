
import { performance } from 'perf_hooks';

const generateData = (rows: number, cols: number) => {
  const data = [];
  for (let i = 0; i < rows; i++) {
    const row: any = {};
    for (let j = 0; j < cols; j++) {
      // Larger strings
      row[`col_${j}`] = `val_${i}_${j}_${"x".repeat(100)}`;
    }
    data.push(row);
  }
  return data;
};

const runBenchmark = () => {
  const sizes = [1000, 5000];
  const cols = 10;

  console.log('--- CSV Generation Benchmark (Large Strings) ---');

  for (const size of sizes) {
    const data = generateData(size, cols);

    // Measure Sync CSV Generation
    const start = performance.now();

    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;

    const end = performance.now();
    const csvTime = end - start;
    console.log(`Rows: ${size}, Sync CSV Time: ${csvTime.toFixed(3)} ms`);

    // Measure JSON.stringify (approx lower bound for serialization)
    const startJson = performance.now();
    JSON.stringify(data);
    const endJson = performance.now();
    const jsonTime = endJson - startJson;

    console.log(`Rows: ${size}, JSON.stringify Time: ${jsonTime.toFixed(3)} ms`);

    // Measure Clone (Structure Clone approx)
    const startClone = performance.now();
    try {
        // structuredClone is available in Node 17+ and modern browsers
        structuredClone(data);
    } catch (e) {
        // Fallback for older environments
        JSON.parse(JSON.stringify(data));
    }
    const endClone = performance.now();
    const cloneTime = endClone - startClone;

    console.log(`Rows: ${size}, structuredClone Time: ${cloneTime.toFixed(3)} ms`);
    console.log(`Rows: ${size}, Improvement Potential (CSV - Clone): ${(csvTime - cloneTime).toFixed(3)} ms`);
    console.log('--------------------------------');
  }
};

runBenchmark();
