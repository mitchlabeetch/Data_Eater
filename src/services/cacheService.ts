const CACHE_PREFIX = 'geocache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const getCache = <T>(key: string): T | null => {
  const item = localStorage.getItem(CACHE_PREFIX + key);
  if (!item) {
    return null;
  }

  const entry: CacheEntry<T> = JSON.parse(item);
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  }

  return entry.data;
};

export const setCache = <T>(key: string, data: T) => {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
};

export const clearCache = () => {
  for (const key in localStorage) {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
};
