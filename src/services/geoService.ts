import { getCache, setCache } from './cacheService';

const API_BASE = 'https://data.geopf.fr/geocodage';

export const searchAddressWithStats = async (query: string): Promise<{ result: any | null, networkUsed: boolean }> => {
  // Check Cache
  const cachedResult = await getCache<any>(query);
  if (cachedResult) {
    return { result: cachedResult, networkUsed: false };
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
    await setCache(query, bestMatch);
    
    return { result: bestMatch, networkUsed: true };
  } catch (e) {
    console.error("GeoAPI Failed", e);
    return { result: null, networkUsed: true };
  }
};

export const searchAddress = async (query: string): Promise<any | null> => {
  const { result } = await searchAddressWithStats(query);
  return result;
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
  
  // Global deduplication to avoid processing same query multiple times
  const uniqueQueries = [...new Set(queries)];
  const total = uniqueQueries.length;
  let done = 0;

  // Process in chunks to respect rate limit
  // 40 requests per second max
  const CHUNK_SIZE = 40;
  
  for (let i = 0; i < uniqueQueries.length; i += CHUNK_SIZE) {
    const chunk = uniqueQueries.slice(i, i + CHUNK_SIZE);
    
    // Track if any query in chunk will require network (cache miss)
    let hasNetworkRequest = false;

    const promises = chunk.map(async (q) => {
      const { result, networkUsed } = await searchAddressWithStats(q);
      if (networkUsed) hasNetworkRequest = true;
      if (result) results.set(q, result);
    });

    await Promise.all(promises);
    done += chunk.length;
    onProgress(done, total);
    
    // Wait 1.1s before next chunk to respect 50 req/s limit, but only if we hit the network
    if (hasNetworkRequest && i + CHUNK_SIZE < uniqueQueries.length) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  return results;
};
