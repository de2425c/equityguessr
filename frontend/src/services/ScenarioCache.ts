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

interface EquityResult {
  equities: number[];
  wins: number[];
  ties: number[];
  hands_evaluated: number;
  speed: number;
  enumerated_all: boolean;
}

interface CacheEntry {
  scenario: Scenario;
  timestamp: number;
  used: boolean;
  equityResult?: EquityResult;
}

interface FetchRequest {
  streak: number;
  promise: Promise<Scenario | null>;
}

export class ScenarioCache {
  private cache: Map<number, CacheEntry[]> = new Map();
  private activeRequests: Map<number, FetchRequest> = new Map();
  private readonly API_URL: string;
  private readonly CACHE_SIZE_PER_LEVEL = 2; // Number of scenarios to cache per difficulty level
  private readonly PREFETCH_LEVELS_AHEAD = 1; // How many levels ahead to prefetch
  private readonly MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 5 minutes

  constructor(apiUrl: string) {
    this.API_URL = apiUrl;
  }

  /**
   * Get a scenario for the given streak level with pre-calculated equity if available.
   * First tries cache, then fetches if needed.
   */
  async getScenario(streak: number): Promise<{ scenario: Scenario | null; equityResult?: EquityResult }> {
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

    return { scenario, equityResult: undefined };
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
   * Get a scenario from cache if available (with pre-calculated equity if available)
   */
  getFromCache(streak: number): { scenario: Scenario; equityResult?: EquityResult } | null {
    const entries = this.cache.get(streak) || [];

    // Find an unused, non-stale entry
    const validEntry = entries.find(entry =>
      !entry.used &&
      (Date.now() - entry.timestamp) < this.MAX_CACHE_AGE_MS
    );

    if (validEntry) {
      validEntry.used = true;
      return {
        scenario: validEntry.scenario,
        equityResult: validEntry.equityResult
      };
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
   * Add a scenario to the cache with equity from scenario response
   */
  private addToCache(streak: number, scenario: Scenario): void {
    const entries = this.cache.get(streak) || [];

    // Remove old/stale entries
    const validEntries = entries.filter(entry =>
      (Date.now() - entry.timestamp) < this.MAX_CACHE_AGE_MS
    );

    // Create equity result from scenario's embedded equity values
    const equityResult: EquityResult | undefined =
      (scenario.hand1_equity !== undefined && scenario.hand2_equity !== undefined)
        ? {
            equities: [scenario.hand1_equity, scenario.hand2_equity],
            wins: [0, 0],
            ties: [0],
            hands_evaluated: 0,
            speed: 0,
            enumerated_all: true
          }
        : undefined;

    // Create new entry
    const newEntry: CacheEntry = {
      scenario,
      timestamp: Date.now(),
      used: false,
      equityResult
    };

    // Add new entry
    validEntries.push(newEntry);

    // Keep only the most recent entries up to cache size
    if (validEntries.length > this.CACHE_SIZE_PER_LEVEL * 2) {
      validEntries.splice(0, validEntries.length - this.CACHE_SIZE_PER_LEVEL * 2);
    }

    this.cache.set(streak, validEntries);
  }

  /**
   * Prefetch scenarios for a specific level - ensures at least 1 scenario is cached
   */
  private async prefetchForLevel(streak: number): Promise<void> {
    const entries = this.cache.get(streak) || [];
    const unusedCount = entries.filter(e => !e.used && (Date.now() - e.timestamp) < this.MAX_CACHE_AGE_MS).length;

    // Only fetch if cache is empty for this level
    if (unusedCount === 0) {
      this.fetchScenario(streak).catch(error =>
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

      if (validCount < 5) {
        // Start prefetching in background (fire and forget)
        this.fillCacheForLevel(targetStreak).catch(error =>
          console.error(`Error prefetching level ${targetStreak}:`, error)
        );
      }
    }
  }

  /**
   * Fill the cache for a specific level - fetches 1 scenario if cache is empty
   */
  private async fillCacheForLevel(streak: number): Promise<void> {
    const entries = this.cache.get(streak) || [];
    const validCount = entries.filter(e =>
      !e.used && (Date.now() - e.timestamp) < this.MAX_CACHE_AGE_MS
    ).length;

    // Only fetch if we have nothing for this level
    if (validCount > 0) return;

    // Fetch single scenario directly (no stagger needed)
    await this.fetchScenario(streak);
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