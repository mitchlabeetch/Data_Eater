import { batchGeocode } from '../src/services/geoService';

// Mock fetch globally just in case logic fails and tries to fetch
const fetchMock = async (url: string) => {
  // Should not be called in this benchmark if cache hits 100%
  // But if called, return success
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

async function runBenchmark() {
  console.log("Running GeoService Optimization Benchmark (Warm Cache)...");

  // Generate 80 unique queries
  const queries = Array.from({ length: 80 }, (_, i) => `Address ${i}`);

  const start = performance.now();
  await batchGeocode(queries, (done, total) => {
      // no-op
  });
  const end = performance.now();

  const duration = end - start;
  console.log(`Processed ${queries.length} queries.`);
  console.log(`Time Taken: ${duration.toFixed(2)}ms`);
}

runBenchmark();
