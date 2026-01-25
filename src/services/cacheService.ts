import localforage from 'localforage';

const CACHE_PREFIX = 'geocache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const getCache = async <T>(key: string): Promise<T | null> => {
  const entry = await localforage.getItem<CacheEntry<T>>(CACHE_PREFIX + key);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    await localforage.removeItem(CACHE_PREFIX + key);
    return null;
  }

  return entry.data;
};

export const setCache = async <T>(key: string, data: T): Promise<void> => {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  await localforage.setItem(CACHE_PREFIX + key, entry);
};

export const clearCache = async (): Promise<void> => {
  const keys = await localforage.keys();
  const tasks = keys
    .filter(key => key.startsWith(CACHE_PREFIX))
    .map(key => localforage.removeItem(key));
  await Promise.all(tasks);
};
