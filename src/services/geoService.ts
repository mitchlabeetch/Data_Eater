import { getCache, setCache } from './cacheService';

const API_BASE = 'https://data.geopf.fr/geocodage';

const searchAddressInternal = async (query: string): Promise<{ data: any | null, fromCache: boolean }> => {
  // Check Cache
  const cachedResult = await getCache<any>(query);
  if (cachedResult) {
    return { data: cachedResult, fromCache: true };
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
    
    return { data: bestMatch, fromCache: false };
  } catch (e) {
    console.error("GeoAPI Failed", e);
    return { data: null, fromCache: false };
  }
};

export const searchAddress = async (query: string): Promise<any | null> => {
  const { data } = await searchAddressInternal(query);
  return data;
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
    
    let hasNetworkRequest = false;
    
    const promises = chunk.map(async (q) => {
      const { data, fromCache } = await searchAddressInternal(q);
      if (!fromCache) {
        hasNetworkRequest = true;
      }
      if (data) results.set(q, data);
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
