import fuzzysort from 'fuzzysort';

self.onmessage = (e: MessageEvent<string[]>) => {
  try {
    const values = e.data;

    if (!Array.isArray(values)) {
      throw new Error("Input must be an array of strings");
    }

    // Sort by length descending to use longer strings as cluster centers
    const sortedValues = [...values].sort((a, b) => b.length - a.length);

    const clusters: Array<{ center: string, candidates: string[] }> = [];
    const used = new Set<string>();

    sortedValues.forEach(val => {
      if (used.has(val)) return;

      // Fix Threshold Logic for fuzzysort v3 (0..1 scores)
      // Original code used negative thresholds (e.g., -200) which are incompatible with v3's 0..1 positive scores.
      // Using negative thresholds with v3 would result in ineffective filtering (matching everything > -200, i.e., everything).
      //
      // We implement a dynamic positive threshold to respect the original intent:
      // "Shorter strings need stricter matching (higher score), longer strings can be more lenient."
      // Example: Length 5 -> 0.90, Length 20 -> 0.75. Min 0.6.
      const dynamicThreshold = Math.max(0.6, 0.95 - (val.length * 0.01));

      const fuzzyResults = fuzzysort.go(val, sortedValues, { threshold: dynamicThreshold });

      const candidates = fuzzyResults
        .filter(result => {
          const c = result.target;
          // Don't include self or already used items
          if (c === val || used.has(c)) return false;

          // Secondary safety check to mimic original 'SIMILARITY_SCORE_THRESHOLD' intent.
          // Original check was: score / max_len > -15.
          // With v3 scores (0..1), we ensure a minimum absolute quality.
          // Since we already used 'threshold' in go(), this is mostly redundant but ensures safety.
          if (result.score < 0.5) return false;

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
