import { MediaItem, PaginatedResponse, FilterParams, IAnimeProvider } from '../../../types/index';
import { normalizeJikanAnime } from '../../models/normalized';
import { isSafeContent } from '../../safety/isSafeContent';
import { CircuitBreaker } from '../circuitBreaker';

const DEFAULT_JIKAN_URL = 'https://api.jikan.moe/v4';
const REQUEST_TIMEOUT_MS = 10000;

export class JikanProvider implements IAnimeProvider {
  private baseUrl: string;
  readonly breaker = new CircuitBreaker({
    name: 'Jikan',
    failureThreshold: 2,
    cooldownMs: 3 * 60 * 1000,
  });

  constructor() {
    this.baseUrl = process.env.JIKAN_API_URL || DEFAULT_JIKAN_URL;
  }

  /**
   * Performs an HTTP GET request to Jikan with timeout and error handling.
   */
  private async get<T>(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    if (this.breaker.isOpen()) {
      throw new Error(
        `Jikan service temporarily unavailable (${this.breaker.getLastError() || 'circuit breaker active'})`
      );
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (response.status === 429) {
        this.breaker.recordFailure('Jikan rate limited', true, 60 * 1000);
        throw new Error('Jikan API rate limited');
      }

      if (!response.ok) {
        let cleanMsg = `Jikan API returned HTTP ${response.status}`;
        try {
          const errJson = await response.json().catch(() => null);
          if (errJson?.message) {
            cleanMsg = `Jikan: ${errJson.message}`;
          }
        } catch {
          // ignore
        }
        if (response.status === 504) {
          cleanMsg = 'Jikan upstream service is temporarily unavailable (HTTP 504 Gateway Timeout)';
        }
        // Force trip if 504 or 500+
        this.breaker.recordFailure(cleanMsg, response.status === 504 || response.status >= 500);
        throw new Error(cleanMsg);
      }

      const json = await response.json();
      this.breaker.recordSuccess();
      return json as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutMsg = `Jikan request timed out after ${REQUEST_TIMEOUT_MS}ms`;
        this.breaker.recordFailure(timeoutMsg);
        throw new Error(timeoutMsg);
      }
      this.breaker.recordFailure(err);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get trending / currently airing anime
   */
  async getTrending(limit = 12, page = 1): Promise<MediaItem[]> {
    let list: any[] = [];
    try {
      const res = await this.get<any>('/top/anime', {
        filter: 'airing',
        limit,
        page,
      });
      list = res.data || [];
    } catch {
      // If MAL has issue with filter=airing, fallback to top anime
      const res = await this.get<any>('/top/anime', { limit, page });
      list = res.data || [];
    }

    return list
      .map(normalizeJikanAnime)
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Get popular anime
   */
  async getPopular(limit = 12, page = 1): Promise<MediaItem[]> {
    const res = await this.get<any>('/top/anime', {
      filter: 'bypopularity',
      limit,
      page,
    });

    const list = res.data || [];
    return list
      .map(normalizeJikanAnime)
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Get latest anime
   */
  async getLatest(limit = 12, page = 1): Promise<MediaItem[]> {
    const res = await this.get<any>('/seasons/now', {
      limit,
      page,
    });

    const list = res.data || [];
    return list
      .map((item: any) => {
        const normalized = normalizeJikanAnime(item);
        normalized.isLatest = true;
        return normalized;
      })
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Search / filtered list
   */
  async getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
    const queryParams: Record<string, any> = {
      page: params.page || 1,
      limit: params.perPage || 18,
    };

    if (params.search && params.search.trim()) {
      queryParams.q = params.search.trim();
    }

    if (params.status) {
      if (params.status.toLowerCase() === 'airing') queryParams.status = 'airing';
      else if (params.status.toLowerCase() === 'completed') queryParams.status = 'complete';
      else if (params.status.toLowerCase() === 'upcoming') queryParams.status = 'upcoming';
    }

    if (params.sort) {
      if (params.sort === 'rating') {
        queryParams.order_by = 'score';
        queryParams.sort = 'desc';
      } else if (params.sort === 'popularity') {
        queryParams.order_by = 'popularity';
        queryParams.sort = 'asc';
      } else if (params.sort === 'title') {
        queryParams.order_by = 'title';
        queryParams.sort = 'asc';
      }
    }

    const res = await this.get<any>('/anime', queryParams);
    const list = res.data || [];
    const items = list
      .map(normalizeJikanAnime)
      .filter((item: MediaItem) => isSafeContent(item));

    const pagination = res.pagination || {};

    return {
      data: items,
      pageInfo: {
        currentPage: pagination.current_page || params.page || 1,
        hasNextPage: pagination.has_next_page || false,
        total: pagination.items?.total,
        perPage: pagination.items?.per_page || params.perPage || 18,
        lastPage: pagination.last_visible_page,
      },
      sourceProvider: 'jikan',
    };
  }

  /**
   * Get single anime details by MAL id
   */
  async getById(id: string): Promise<MediaItem | null> {
    const malId = parseInt(id, 10);
    if (isNaN(malId)) return null;

    try {
      const res = await this.get<any>(`/anime/${malId}/full`);
      if (!res.data) return null;

      const item = normalizeJikanAnime(res.data);
      return isSafeContent(item) ? item : null;
    } catch {
      return null;
    }
  }

  /**
   * Search
   */
  async search(query: string, limit = 10, page = 1): Promise<PaginatedResponse<MediaItem>> {
    return this.getList({
      search: query,
      perPage: limit,
      page,
    });
  }

  /**
   * Check provider health
   */
  async checkHealth(): Promise<boolean> {
    if (this.breaker.isOpen()) {
      return false;
    }
    try {
      const res = await this.get<any>('/top/anime', { limit: 1 });
      return Array.isArray(res.data) && res.data.length > 0;
    } catch {
      return false;
    }
  }
}

export const jikanProvider = new JikanProvider();
