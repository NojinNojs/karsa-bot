const MAX_CACHE_ENTRIES = 64;
const pngCache = new Map<string, Buffer>();
let cacheHits = 0;
let cacheMisses = 0;

export function getCachedOrRenderPng(key: string, renderFn: () => Buffer): Buffer {
  const existing = pngCache.get(key);
  if (existing) {
    cacheHits += 1;
    pngCache.delete(key);
    pngCache.set(key, existing);
    return existing;
  }
  cacheMisses += 1;
  const buf = renderFn();
  if (pngCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = pngCache.keys().next().value;
    if (oldestKey !== undefined) pngCache.delete(oldestKey);
  }
  pngCache.set(key, buf);
  return buf;
}

export function getRenderCacheStats() {
  return { size: pngCache.size, hits: cacheHits, misses: cacheMisses };
}
