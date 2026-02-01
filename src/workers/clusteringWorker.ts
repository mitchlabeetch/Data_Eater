import fuzzysort from 'fuzzysort';

// Fuzzy clustering threshold configuration
// MIN_THRESHOLD: Minimum similarity score required (0.6 = 60% match)
// BASE_THRESHOLD: Starting threshold for short strings (0.95 = 95% match)
// LENGTH_PENALTY: How much to relax threshold per character (0.01 per char)
const MIN_THRESHOLD = 0.6;
const BASE_THRESHOLD = 0.95;
const LENGTH_PENALTY = 0.01;
const MIN_QUALITY_SCORE = 0.5;

self.onmessage = (e: MessageEvent<string[]>) => {
  try {
    const values = e.data;

    if (!Array.isArray(values)) {
      throw new Error("Input must be an array of strings");
    }

    // Limit to 1000 distinct values to prevent O(N²) complexity hangs
    const limitedValues = values.slice(0, 1000);

    // Sort by length descending to use longer strings as cluster centers
    const sortedValues = [...limitedValues].sort((a, b) => b.length - a.length);

    const clusters: Array<{ center: string, candidates: string[] }> = [];
    const used = new Set<string>();

    sortedValues.forEach(val => {
      if (used.has(val)) return;

      // Dynamic threshold: shorter strings need stricter matching
      // Example: Length 5 -> 0.90, Length 20 -> 0.75, Min 0.6
      const dynamicThreshold = Math.max(MIN_THRESHOLD, BASE_THRESHOLD - (val.length * LENGTH_PENALTY));

      const fuzzyResults = fuzzysort.go(val, sortedValues, { threshold: dynamicThreshold });

      const candidates = fuzzyResults
        .filter(result => {
          const c = result.target;
          // Don't include self or already used items
          if (c === val || used.has(c)) return false;

          // Ensure minimum quality score
          if (result.score < MIN_QUALITY_SCORE) return false;

          return true;
        })
        .map(result => result.target);

      if (candidates.length > 0) {
        clusters.push({ center: val, candidates });
        used.add(val);
        candidates.forEach(c => used.add(c));
      }
    });

    self.postMessage(clusters);
  } catch (error) {
    console.error("Worker error:", error);
    self.postMessage({ error: String(error) });
  }
};
