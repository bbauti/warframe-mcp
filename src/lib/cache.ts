interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry>();

export function get<T>(key: string): T | null {
  const entry = cacheStore.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlMs: number): void {
  const expiresAt = Date.now() + Math.max(0, ttlMs);
  cacheStore.set(key, { value, expiresAt });
}

export function invalidate(pattern: string): void {
  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  }
}

export function clear(): void {
  cacheStore.clear();
}

const cache = {
  get,
  set,
  invalidate,
  clear,
};

export default cache;
