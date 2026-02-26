/**
 * Simple in-memory LRU cache for server-side use.
 * Intended for short-lived data like product lists and categories.
 *
 * Key design decisions:
 * - TTL-based expiry: entries expire after `ttlMs` milliseconds
 * - LRU eviction: when maxSize is reached, oldest-accessed entry is evicted
 * - No external dependencies (Redis-free for small deployments)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Update LRU timestamp
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    // Evict LRU entry if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      let oldestKey = '';
      let oldestTime = Infinity;

      for (const [k, v] of this.store) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      lastAccessed: Date.now(),
    });
  }

  /** Invalidate all entries whose key starts with `prefix` */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/** Singleton shared across the entire process */
export const cache = new MemoryCache(200);

// TTL presets (milliseconds)
export const TTL = {
  /** Short-lived: product listings that change frequently */
  PRODUCTS: 2 * 60 * 1000,          // 2 minutes
  /** Medium: categories rarely change */
  CATEGORIES: 10 * 60 * 1000,       // 10 minutes
  /** Single product detail */
  PRODUCT_DETAIL: 5 * 60 * 1000,    // 5 minutes
} as const;
