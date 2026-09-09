/**
 * High-performance in-memory cache with TTL and in-flight request deduplication.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    deduped: 0,
  };

  /**
   * Retrieve cached value if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set cache entry with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    // Keep cache bounded (max 1000 items)
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Execute fetcher function with automatic caching and in-flight deduplication.
   * If a matching request is currently pending, subsequent callers wait for the same promise.
   */
  async fetchWithDedupe<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Check existing cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if identical fetch is currently in flight
    const pending = this.inFlight.get(key);
    if (pending) {
      this.stats.deduped++;
      return pending as Promise<T>;
    }

    // Initiate new request
    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== null && result !== undefined) {
          this.set(key, result, ttlSeconds);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Get stats for health check
   */
  getStats() {
    return {
      size: this.cache.size,
      inFlight: this.inFlight.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      deduped: this.stats.deduped,
    };
  }

  /**
   * Clear expired entries
   */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global server singleton
export const globalCache = new MemoryCache();

// Prune expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  const pruneTimer = setInterval(() => globalCache.prune(), 5 * 60 * 1000);
  if (pruneTimer && typeof pruneTimer.unref === 'function') {
    pruneTimer.unref();
  }
}
