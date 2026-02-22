import cityTimezones from 'city-timezones';
import fuzzysort from 'fuzzysort';

self.onmessage = (e: MessageEvent<string[]>) => {
  try {
    const distinctLocs = e.data;
    if (!Array.isArray(distinctLocs)) throw new Error("Input must be an array of strings");

    const newMappings: [string, string][] = [];
    const newUnresolved: string[] = [];

    // Create index once
    const cityIndex = cityTimezones.cityMapping.map(c => ({ name: c.city, tz: c.timezone }));

    distinctLocs.forEach(loc => {
      let matches = cityTimezones.findFromCityStateProvince(loc);
      if (matches.length > 0) {
        newMappings.push([loc, matches[0].timezone]);
        return;
      }

      // Fuzzy search fallback
      const fuzzyResult = fuzzysort.go(loc, cityIndex, { key: 'name', limit: 1 });
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
