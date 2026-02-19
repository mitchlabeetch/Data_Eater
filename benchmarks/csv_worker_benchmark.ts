import { performance } from 'perf_hooks';
import { Buffer } from 'buffer';

// Mock Environment for Worker Import
global.self = {} as any;
global.window = {} as any;
global.window.Buffer = Buffer;

// Mock Blob
class MockBlob {
  content: any[];
  options: any;
  constructor(content: any[], options: any) {
    this.content = content;
    this.options = options;
  }
  get size() {
    return this.content.reduce((acc, item) => acc + (item.length || 0), 0);
  }
}
global.Blob = MockBlob as any;

// Import the logic directly from the worker file
// We use tsx to run this, so imports should work.
import { generateCSV } from '../src/workers/csvExportWorker';

const measureLag = async (fn: () => Promise<void> | void) => {
  let maxLag = 0;
  let last = performance.now();
  const interval = setInterval(() => {
    const now = performance.now();
    const lag = now - last - 10;
    if (lag > maxLag) maxLag = lag;
    last = now;
  }, 10);

  const start = performance.now();
  await fn();
  const end = performance.now();

  // Give the interval a chance to fire if it was blocked
  await new Promise(resolve => setTimeout(resolve, 50));

  clearInterval(interval);
  return { time: end - start, maxLag };
};

const run = async () => {
  console.log("Generating 100,000 rows...");
  const rows = Array.from({ length: 100000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    description: `This is a long description for user ${i} that contains "quotes" and commas.`,
    value: Math.random() * 1000,
  }));
  const columns = [
    { name: 'id' }, { name: 'name' }, { name: 'email' }, { name: 'description' }, { name: 'value' }
  ];

  console.log("\n--- Testing Worker Logic (Pure Computation) ---");
  // This measures the time it takes to generate chunks.
  // In a real worker, this happens off-thread, so Main Thread Lag should be 0 (except for serialization).
  // Here we are running it in the *same* thread to verify it works and measure raw speed.

  let resultChunks: any[] = [];

  const res = await measureLag(() => {
    resultChunks = generateCSV(rows, columns, ',', 'utf-8', true);
  });

  console.log(`Execution Time: ${res.time.toFixed(2)}ms`);
  console.log(`Generated Chunks: ${resultChunks.length}`);

  // Verify content
  const allContent = resultChunks.map(c => c.toString()).join('');

  if (!allContent.includes('"id","name","email"')) {
      console.error("❌ Header check failed");
      process.exit(1);
  }
  if (!allContent.includes('"User 0"')) {
      console.error("❌ Data check failed");
      process.exit(1);
  }

  console.log("✅ Content verification passed");

  // Estimate Blob size
  const totalSize = resultChunks.reduce((acc, c) => acc + c.length, 0);
  console.log(`Total CSV Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
};

run();
