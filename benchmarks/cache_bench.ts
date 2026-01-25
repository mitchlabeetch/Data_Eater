import { getCache, setCache } from '../src/services/cacheService';
import localforage from 'localforage';

// Polyfill localStorage for environments where it's missing (Node.js)
// This ensures localforage can fallback or initialize if needed,
// though standard drivers usually require browser APIs.
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0,
  };
}

async function runBenchmark() {
  // In a real environment with localforage installed and configured (e.g. using memory driver or mocked),
  // this script measures the performance of the async cache service.

  // Note: For this to run in Node without browser APIs, localforage must be configured with a compatible driver
  // or mocked.

  console.log("Generating large dataset...");
  const data = Array(10000).fill(0).map((_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: "This is a long description to make the object larger and test the parsing speed effectively.",
    tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
    meta: { created: Date.now() }
  }));

  console.log("Populating cache (async)...");
  await setCache("large_dataset", data);

  console.log("Starting Read Benchmark...");

  const start = performance.now();
  const result = await getCache("large_dataset");
  const end = performance.now();

  if (!result) {
    throw new Error("Cache miss!");
  }

  console.log(`Async Read Time: ${(end - start).toFixed(4)} ms`);
}

runBenchmark().catch(console.error);
