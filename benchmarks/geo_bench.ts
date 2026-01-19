
import { batchGeocode } from '../src/services/geoService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
let fetchCallCount = 0;
const fetchMock = async (url: string) => {
  fetchCallCount++;
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 10));
  return {
    ok: true,
    json: async () => ({
      features: [{ type: 'Feature', geometry: {}, properties: { label: 'Paris' } }]
    })
  };
};

Object.defineProperty(global, 'fetch', {
  value: fetchMock
});

// Benchmark
async function runBenchmark() {
  console.log("Running GeoService Benchmark...");

  // Generate a list of queries with duplicates
  const queries = [];
  for (let i = 0; i < 100; i++) {
    queries.push('Paris'); // All duplicates
  }

  fetchCallCount = 0;
  localStorage.clear();

  const start = performance.now();
  await batchGeocode(queries, (done, total) => {});
  const end = performance.now();

  console.log(`Total Queries: ${queries.length}`);
  console.log(`Fetch Calls: ${fetchCallCount}`);
  console.log(`Time Taken: ${(end - start).toFixed(2)}ms`);
}

runBenchmark();
