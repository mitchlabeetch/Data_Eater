const { Worker } = require('worker_threads');
const path = require('path');

const NUM_ITERATIONS = 50;
const DATA_SIZE = 10000; // Array of 10000 simple objects
const data = Array.from({ length: DATA_SIZE }, (_, i) => ({ id: i, value: `test-${i}` }));

async function runNewWorkerTest() {
  const start = performance.now();
  for (let i = 0; i < NUM_ITERATIONS; i++) {
    await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'mock_json_worker.cjs'));
      worker.on('message', (msg) => {
        worker.terminate();
        resolve();
      });
      worker.on('error', reject);
      worker.postMessage(data);
    });
  }
  const end = performance.now();
  return end - start;
}

async function runReusedWorkerTest() {
  const start = performance.now();

  // Create worker once
  const worker = new Worker(path.join(__dirname, 'mock_json_worker.cjs'));

  // We need to manage the async flow manually since worker is reused
  // This mimics a queue or sequential processing
  for (let i = 0; i < NUM_ITERATIONS; i++) {
    await new Promise((resolve, reject) => {
      const onMessage = (msg) => {
        worker.off('message', onMessage);
        worker.off('error', onError);
        resolve();
      };
      const onError = (err) => {
        worker.off('message', onMessage);
        worker.off('error', onError);
        reject(err);
      };

      worker.on('message', onMessage);
      worker.on('error', onError);
      worker.postMessage(data);
    });
  }

  worker.terminate();
  const end = performance.now();
  return end - start;
}

async function main() {
  console.log(`Running benchmark with ${NUM_ITERATIONS} iterations on data size ${DATA_SIZE}...`);

  // Run new worker test first
  const newWorkerTime = await runNewWorkerTest();
  console.log(`New Worker per request: ${newWorkerTime.toFixed(2)}ms`);

  // Run reused worker test
  const reusedWorkerTime = await runReusedWorkerTest();
  console.log(`Reused Worker: ${reusedWorkerTime.toFixed(2)}ms`);

  const improvement = newWorkerTime / reusedWorkerTime;
  console.log(`Speedup: ${improvement.toFixed(2)}x`);
}

main().catch(console.error);
