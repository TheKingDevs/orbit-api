interface CacheEntry<T> {
  data: T;
  updatedAt: number;
}

const MAX_ENTRIES = 100;
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export interface CachedQuery<T> {
  data: T;
  fresh: boolean;
}

export function peekQuery<T>(key: string, ttlMs: number): CachedQuery<T> | null {
  const entry = cache.get(key);

  if (!entry) return null;

  return {
    data: entry.data as T,
    fresh: Date.now() - entry.updatedAt < ttlMs
  };
}

export function fetchQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.updatedAt < ttlMs) {
    return Promise.resolve(cached.data as T);
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const request = fetcher()
    .then((data) => {
      cache.delete(key);
      cache.set(key, { data, updatedAt: Date.now() });

      while (cache.size > MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }

      return data;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);

  return request;
}

export function invalidateQuery(key: string): void {
  cache.delete(key);
  inflight.delete(key);
}

export function clearQueryCache(): void {
  cache.clear();
  inflight.clear();
}
