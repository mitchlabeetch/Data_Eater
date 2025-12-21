const API_BASE = 'https://data.geopf.fr/geocodage';

interface CacheEntry {
  query: string;
  result: any;
  timestamp: number;
}

// Simple in-memory cache for the session (could be persisted to localStorage)
const geoCache = new Map<string, CacheEntry>();

export const searchAddress = async (query: string): Promise<any | null> => {
  // Check Cache
  if (geoCache.has(query)) {
    return geoCache.get(query)?.result;
  }

  try {
    const params = new URLSearchParams({
      q: query,
      limit: '1'
    });
    
    const response = await fetch(`${API_BASE}/search?${params}`);
    
    if (!response.ok) throw new Error(`GeoAPI Error: ${response.statusText}`);
    
    const data = await response.json();
    const bestMatch = data.features && data.features.length > 0 ? data.features[0] : null;

    // Cache result
    geoCache.set(query, { query, result: bestMatch, timestamp: Date.now() });
    
    return bestMatch;
  } catch (e) {
    console.error("GeoAPI Failed", e);
    return null;
  }
};

export const autocompleteAddress = async (text: string): Promise<string[]> => {
  try {
    const params = new URLSearchParams({
      text: text,
      type: 'PositionOfInterest,StreetAddress',
      maximumResponses: '5'
    });
    
    const response = await fetch(`${API_BASE}/completion?${params}`);
    const data = await response.json();
    
    return data.results ? data.results.map((r: any) => r.full_text) : [];
  } catch (e) {
    return [];
  }
};

// Queue Processor for Batching
export const batchGeocode = async (
  queries: string[], 
  onProgress: (done: number, total: number) => void
): Promise<Map<string, any>> => {
  const results = new Map<string, any>();
  const total = queries.length;
  let done = 0;

  // Process in chunks to respect rate limit
  // 40 requests per second max
  const CHUNK_SIZE = 40;
  
  for (let i = 0; i < queries.length; i += CHUNK_SIZE) {
    const chunk = queries.slice(i, i + CHUNK_SIZE);
    
    const promises = chunk.map(async (q) => {
      const res = await searchAddress(q);
      if (res) results.set(q, res);
      done++;
    });

    await Promise.all(promises);
    onProgress(done, total);
    
    // Wait 1 second before next chunk to respect 50 req/s limit
    if (i + CHUNK_SIZE < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  return results;
};
