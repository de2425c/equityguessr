/**
 * ScenarioCache - Manages preloading and caching of poker scenarios
 * to ensure smooth gameplay without loading delays between hands.
 */

interface CardType {
  rank: string;
  suit: string;
  code: string;
}

interface Scenario {
  hand1: CardType[];
  hand2: CardType[];
  community: CardType[];
  stage: string;
  hand1_equity?: number;
  hand2_equity?: number;
}

interface CacheEntry {
  scenario: Scenario;
  timestamp: number;
  used: boolean;
}

interface FetchRequest {
  streak: number;
  promise: Promise<Scenario | null>;
}

export class ScenarioCache {
  private cache: Map<number, CacheEntry[]> = new Map();
  private activeRequests: Map<number, FetchRequest> = new Map();
  private readonly API_URL: string;
  private readonly CACHE_SIZE_PER_LEVEL = 3; // Number of scenarios to cache per difficulty level
  private readonly PREFETCH_LEVELS_AHEAD = 3; // How many levels ahead to prefetch
  private readonly MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 5 minutes

  constructor(apiUrl: string) {
    this.API_URL = apiUrl;
  }

  /**
   * Get a scenario for the given streak level.
   * First tries cache, then fetches if needed.
   */
  async getScenario(streak: number): Promise<Scenario | null> {
    // Try to get from cache first
    const cached = this.getFromCache(streak);
    if (cached) {
      // Start prefetching more scenarios for this level in background
      this.prefetchForLevel(streak);
      // Also prefetch for upcoming levels
      this.prefetchUpcomingLevels(streak);
      return cached;
    }

    // No cached scenario, need to fetch
    const scenario = await this.fetchScenario(streak);

    // Start prefetching for this and upcoming levels
    if (scenario) {
      this.prefetchForLevel(streak);
      this.prefetchUpcomingLevels(streak);
    }

    return scenario;
  }

  /**
   * Prefetch scenarios for multiple upcoming difficulty levels
   */
  async prefetchMultipleLevels(startStreak: number, count: number = 3): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const targetStreak = startStreak + i;
      promises.push(this.fillCacheForLevel(targetStreak));
    }

    // Wait for all prefetching to complete
    await Promise.all(promises);
  }

  /**
   * Get a scenario from cache if available
   */
  private getFromCache(streak: number): Scenario | null {
    const entries = this.cache.get(streak) || [];

    // Find an unused, non-stale entry
    const validEntry = entries.find(entry =>
      !entry.used &&
      (Date.now() - entry.timestamp) < this.MAX_CACHE_AGE_MS
    );

    if (validEntry) {
      validEntry.used = true;
      return validEntry.scenario;
    }

    return null;
  }

  /**
   * Fetch a single scenario from the API
   */
  private async fetchScenario(streak: number): Promise<Scenario | null> {
    // Check if there's already a request in progress for this streak
    const existing = this.activeRequests.get(streak);
    if (existing) {
      return existing.promise;
    }

    // Create new fetch request
    const promise = this.doFetch(streak);
    this.activeRequests.set(streak, { streak, promise });

    try {
      const result = await promise;
      return result;
    } finally {
      this.activeRequests.delete(streak);
    }
  }

  /**
   * Actual fetch implementation
   */
  private async doFetch(streak: number): Promise<Scenario | null> {
    try {
      const response = await fetch(`${this.API_URL}/scenario?streak=${streak}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scenario: ${response.statusText}`);
      }
      const data = await response.json();

      // Add to cache
      this.addToCache(streak, data);

      return data;
    } catch (error) {
      console.error(`Error fetching scenario for streak ${streak}:`, error);
      return null;
    }
  }

  /**
   * Add a scenario to the cache
   */
  private addToCache(streak: number, scenario: Scenario): void {
    const entries = this.cache.get(streak) || [];

    // Remove old/stale entries
    const validEntries = entries.filter(entry =>
      (Date.now() - entry.timestamp) < this.MAX_CACHE_AGE_MS
    );

    // Add new entry
    validEntries.push({
      scenario,
      timestamp: Date.now(),
      used: false
    });

    // Keep only the most recent entries up to cache size
    if (validEntries.length > this.CACHE_SIZE_PER_LEVEL * 2) {
      validEntries.splice(0, validEntries.length - this.CACHE_SIZE_PER_LEVEL * 2);
    }

    this.cache.set(streak, validEntries);
  }

  /**
   * Prefetch scenarios for a specific level
   */
  private async prefetchForLevel(streak: number): Promise<void> {
    const entries = this.cache.get(streak) || [];
    const unusedCount = entries.filter(e => !e.used && (Date.now() - e.timestamp) < this.MAX_CACHE_AGE_MS).length;

    // Only prefetch if we're running low on unused scenarios
    if (unusedCount < 2) {
      // Fetch multiple scenarios in parallel
      const fetchCount = this.CACHE_SIZE_PER_LEVEL - unusedCount;
      const promises: Promise<Scenario | null>[] = [];

      for (let i = 0; i < fetchCount; i++) {
        // Stagger the requests slightly to avoid overwhelming the server
        promises.push(
          new Promise(resolve => setTimeout(() => resolve(this.fetchScenario(streak)), i * 50))
        );
      }

      // Fire and forget - we don't wait for these
      Promise.all(promises).catch(error =>
        console.error(`Error prefetching for streak ${streak}:`, error)
      );
    }
  }

  /**
   * Prefetch scenarios for upcoming difficulty levels
   */
  private prefetchUpcomingLevels(currentStreak: number): void {
    // Prefetch for the next few levels
    for (let i = 1; i <= this.PREFETCH_LEVELS_AHEAD; i++) {
      const targetStreak = currentStreak + i;

      // Check if we already have enough cached for this level
      const entries = this.cache.get(targetStreak) || [];
      const validCount = entries.filter(e =>
        !e.used && (Date.now() - e.timestamp) < this.MAX_CACHE_AGE_MS
      ).length;

      if (validCount < 2) {
        // Start prefetching in background (fire and forget)
        this.fillCacheForLevel(targetStreak).catch(error =>
          console.error(`Error prefetching level ${targetStreak}:`, error)
        );
      }
    }
  }

  /**
   * Fill the cache for a specific level
   */
  private async fillCacheForLevel(streak: number): Promise<void> {
    const entries = this.cache.get(streak) || [];
    const validCount = entries.filter(e =>
      !e.used && (Date.now() - e.timestamp) < this.MAX_CACHE_AGE_MS
    ).length;

    const needed = Math.max(0, this.CACHE_SIZE_PER_LEVEL - validCount);
    if (needed === 0) return;

    const promises: Promise<Scenario | null>[] = [];

    for (let i = 0; i < needed; i++) {
      // Stagger requests by 50ms each
      promises.push(
        new Promise(resolve =>
          setTimeout(async () => {
            try {
              const response = await fetch(`${this.API_URL}/scenario?streak=${streak}`);
              if (response.ok) {
                const data = await response.json();
                this.addToCache(streak, data);
                resolve(data);
              } else {
                resolve(null);
              }
            } catch (error) {
              console.error(`Error fetching scenario: ${error}`);
              resolve(null);
            }
          }, i * 50)
        )
      );
    }

    await Promise.all(promises);
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific streak level
   */
  clearCacheForLevel(streak: number): void {
    this.cache.delete(streak);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { [key: number]: { total: number; unused: number; valid: number } } {
    const stats: { [key: number]: { total: number; unused: number; valid: number } } = {};

    this.cache.forEach((entries, streak) => {
      const now = Date.now();
      const validEntries = entries.filter(e => (now - e.timestamp) < this.MAX_CACHE_AGE_MS);
      const unusedEntries = validEntries.filter(e => !e.used);

      stats[streak] = {
        total: entries.length,
        valid: validEntries.length,
        unused: unusedEntries.length
      };
    });

    return stats;
  }
}