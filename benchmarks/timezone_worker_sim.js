// Mock Worker environment
const self = {
  postMessage: (data) => {
    console.log("Worker sent message:", JSON.stringify(data, null, 2));
  },
  onmessage: null
};

// Mock city-timezones
const cityTimezones = {
  cityMapping: [
    { city: "Paris", timezone: "Europe/Paris" },
    { city: "New York", timezone: "America/New_York" },
    { city: "Tokyo", timezone: "Asia/Tokyo" }
  ],
  findFromCityStateProvince: (loc) => {
    // Exact match simulation (case-insensitive for this mock)
    const found = cityTimezones.cityMapping.find(c => c.city.toLowerCase() === loc.toLowerCase());
    return found ? [{ timezone: found.timezone }] : [];
  }
};

// Mock fuzzysort
const fuzzysort = {
  go: (loc, targets, options) => {
    // Simple substring match simulation for fuzzy search
    // Using a very simple heuristic: if target contains loc
    const matches = targets.filter(t => t.name.toLowerCase().includes(loc.toLowerCase()));
    if (matches.length > 0) {
      return [{
        obj: { tz: matches[0].tz },
        score: -10 // dummy score > -1000
      }];
    }
    return [];
  }
};

// Worker Logic (to be copied to src/workers/timezoneWorker.ts)
const workerLogic = (e) => {
  try {
    const distinctLocs = e.data;
    if (!Array.isArray(distinctLocs)) throw new Error("Input must be an array of strings");

    const newMappings = []; // Using array of entries instead of Map for transfer
    const newUnresolved = [];
    const cityIndex = cityTimezones.cityMapping.map(c => ({ name: c.city, tz: c.timezone }));

    distinctLocs.forEach(loc => {
      let matches = cityTimezones.findFromCityStateProvince(loc);
      if (matches.length > 0) {
        newMappings.push([loc, matches[0].timezone]);
        return;
      }

      // Fuzzy search fallback
      const fuzzyResult = fuzzysort.go(loc, cityIndex, { key: 'name', limit: 1 });
      // Logic from original component: score > -1000
      if (fuzzyResult.length > 0 && fuzzyResult[0].score > -1000) {
         newMappings.push([loc, fuzzyResult[0].obj.tz]);
         return;
      }

      newUnresolved.push(loc);
    });

    self.postMessage({
      mappings: newMappings,
      unresolved: newUnresolved
    });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};

self.onmessage = workerLogic;

// Test Execution
console.log("Starting simulation...");
// "Paris" -> Exact match
// "Tok" -> Fuzzy match (contains in "Tokyo")
// "Unknown" -> Unresolved
const testData = ["Paris", "Tok", "Unknown"];
self.onmessage({ data: testData });
