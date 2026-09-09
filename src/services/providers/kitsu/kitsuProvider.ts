import { MediaItem, PaginatedResponse, FilterParams, IAnimeProvider } from '../../../types/index';
import { normalizeKitsuAnime } from '../../models/normalized';
import { isSafeContent } from '../../safety/isSafeContent';
import { CircuitBreaker } from '../circuitBreaker';

const DEFAULT_KITSU_URL = 'https://kitsu.io/api/edge';
const REQUEST_TIMEOUT_MS = 12000;

export class KitsuAnimeProvider implements IAnimeProvider {
  private baseUrl: string;
  readonly breaker = new CircuitBreaker({
    name: 'Kitsu',
    failureThreshold: 3,
    cooldownMs: 3 * 60 * 1000,
  });

  constructor() {
    this.baseUrl = process.env.KITSU_API_URL || DEFAULT_KITSU_URL;
  }

  /**
   * Performs an HTTP GET request to Kitsu with timeout and error handling.
   */
  private async get<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    if (this.breaker.isOpen()) {
      throw new Error(
        `Kitsu service temporarily unavailable (${this.breaker.getLastError() || 'circuit breaker active'})`
      );
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
        signal: controller.signal,
      });

      if (response.status === 429) {
        this.breaker.recordFailure('Kitsu rate limited', true, 60 * 1000);
        throw new Error('Kitsu API rate limit reached');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let cleanMsg = `Kitsu API returned HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.errors?.[0]?.detail) {
            cleanMsg = `Kitsu: ${parsed.errors[0].detail}`;
          }
        } catch {
          // ignore parse error
        }
        this.breaker.recordFailure(cleanMsg, response.status >= 500);
        throw new Error(cleanMsg);
      }

      const json = await response.json();
      this.breaker.recordSuccess();
      return json as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutMsg = `Kitsu request timed out after ${REQUEST_TIMEOUT_MS}ms`;
        this.breaker.recordFailure(timeoutMsg);
        throw new Error(timeoutMsg);
      }
      this.breaker.recordFailure(err.message || 'Kitsu request failed');
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get trending anime
   */
  async getTrending(limit = 12, page = 1): Promise<MediaItem[]> {
    if (page === 1) {
      try {
        const res = await this.get<any>('/trending/anime', { limit });
        const list = res.data || [];
        const items = list
          .map((raw: any) => {
            const item = normalizeKitsuAnime(raw, res.included);
            item.isTrending = true;
            return item;
          })
          .filter((item: MediaItem) => isSafeContent(item));

        if (items.length > 0) return items;
      } catch (err: any) {
        console.warn(`[AnimeHub] Kitsu trending endpoint error: ${err.message}`);
      }
    }

    // Fallback or paginated: sort by popularity/user count
    const offset = (page - 1) * limit;
    const res = await this.get<any>('/anime', {
      sort: '-userCount',
      'page[limit]': limit,
      'page[offset]': offset,
      include: 'categories',
    });

    const list = res.data || [];
    return list
      .map((raw: any) => {
        const item = normalizeKitsuAnime(raw, res.included);
        item.isTrending = true;
        return item;
      })
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Get popular anime
   */
  async getPopular(limit = 12, page = 1): Promise<MediaItem[]> {
    const offset = (page - 1) * limit;
    const res = await this.get<any>('/anime', {
      sort: '-userCount',
      'page[limit]': limit,
      'page[offset]': offset,
      include: 'categories',
    });

    const list = res.data || [];
    return list
      .map((raw: any) => normalizeKitsuAnime(raw, res.included))
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Get latest anime
   */
  async getLatest(limit = 12, page = 1): Promise<MediaItem[]> {
    const offset = (page - 1) * limit;
    let list: any[] = [];
    let included: any[] | undefined;

    try {
      const res = await this.get<any>('/anime', {
        'filter[status]': 'current',
        sort: '-startDate',
        'page[limit]': limit,
        'page[offset]': offset,
        include: 'categories',
      });
      list = res.data || [];
      included = res.included;
    } catch {
      // Fallback without status filter
      const res = await this.get<any>('/anime', {
        sort: '-startDate',
        'page[limit]': limit,
        'page[offset]': offset,
        include: 'categories',
      });
      list = res.data || [];
      included = res.included;
    }

    return list
      .map((raw: any) => {
        const item = normalizeKitsuAnime(raw, included);
        item.isLatest = true;
        return item;
      })
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Paginated & filtered anime catalog list
   */
  async getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
    const page = params.page || 1;
    const perPage = params.perPage || 18;
    const offset = (page - 1) * perPage;

    const queryParams: Record<string, any> = {
      'page[limit]': perPage,
      'page[offset]': offset,
      include: 'categories',
    };

    if (params.search && params.search.trim()) {
      queryParams['filter[text]'] = params.search.trim();
    }

    if (params.genre && params.genre !== 'All') {
      queryParams['filter[categories]'] = params.genre.toLowerCase().trim();
    }

    if (params.status && params.status !== 'All') {
      const s = params.status.toLowerCase();
      if (s === 'airing') queryParams['filter[status]'] = 'current';
      else if (s === 'completed') queryParams['filter[status]'] = 'finished';
      else if (s === 'upcoming') queryParams['filter[status]'] = 'upcoming';
    }

    if (params.format && params.format !== 'All') {
      const f = params.format.toLowerCase();
      if (f.includes('tv')) queryParams['filter[subtype]'] = 'TV';
      else if (f.includes('movie')) queryParams['filter[subtype]'] = 'movie';
      else if (f.includes('ova')) queryParams['filter[subtype]'] = 'OVA';
      else if (f.includes('ona')) queryParams['filter[subtype]'] = 'ONA';
      else if (f.includes('special')) queryParams['filter[subtype]'] = 'special';
    }

    if (params.year) {
      queryParams['filter[seasonYear]'] = params.year;
    }

    if (params.season && params.season !== 'All') {
      queryParams['filter[season]'] = params.season.toLowerCase();
    }

    // Sort mapping
    if (params.sort) {
      if (params.sort === 'rating') {
        queryParams.sort = '-averageRating';
      } else if (params.sort === 'popularity') {
        queryParams.sort = '-userCount';
      } else if (params.sort === 'title') {
        queryParams.sort = 'canonicalTitle';
      } else if (params.sort === 'latest') {
        queryParams.sort = '-startDate';
      }
    } else if (!queryParams['filter[text]']) {
      // Default to popularity when not searching
      queryParams.sort = '-userCount';
    }

    const res = await this.get<any>('/anime', queryParams);
    const list = res.data || [];
    const items = list
      .map((raw: any) => normalizeKitsuAnime(raw, res.included))
      .filter((item: MediaItem) => isSafeContent(item, params.genre));

    const total = typeof res.meta?.count === 'number' ? res.meta.count : items.length;
    const lastPage = Math.ceil(total / perPage);
    const hasNextPage = page < lastPage || Boolean(res.links?.next);

    return {
      data: items,
      pageInfo: {
        currentPage: page,
        hasNextPage,
        total,
        perPage,
        lastPage,
      },
      sourceProvider: 'kitsu',
    };
  }

  /**
   * Fetch single anime details by Kitsu ID or slug
   */
  async getById(id: string): Promise<MediaItem | null> {
    const isNumeric = /^\d+$/.test(id.trim());

    // 1. Try by numeric ID
    if (isNumeric) {
      try {
        const res = await this.get<any>(`/anime/${id.trim()}`, {
          include: 'categories,mediaRelationships.destination',
        });
        if (res.data) {
          const item = normalizeKitsuAnime(res.data, res.included);
          if (isSafeContent(item)) return item;
        }
      } catch (err: any) {
        console.warn(`[AnimeHub] Kitsu getById(${id}) by numeric ID failed: ${err.message}`);
      }
    }

    // 2. Try by slug filter
    try {
      const slug = id.trim().toLowerCase().replace(/\s+/g, '-');
      const res = await this.get<any>('/anime', {
        'filter[slug]': slug,
        'page[limit]': 1,
        include: 'categories,mediaRelationships.destination',
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const item = normalizeKitsuAnime(res.data[0], res.included);
        if (isSafeContent(item)) return item;
      }
    } catch {
      // ignore
    }

    // 3. Fallback: Search by text query
    try {
      const cleanQuery = id.replace(/[-_]/g, ' ').trim();
      const res = await this.get<any>('/anime', {
        'filter[text]': cleanQuery,
        'page[limit]': 1,
        include: 'categories,mediaRelationships.destination',
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const item = normalizeKitsuAnime(res.data[0], res.included);
        if (isSafeContent(item)) return item;
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Quick search
   */
  async search(query: string, limit = 10, page = 1): Promise<PaginatedResponse<MediaItem>> {
    return this.getList({
      search: query,
      perPage: limit,
      page,
      sort: 'popularity',
    });
  }

  /**
   * Health check
   */
  async checkHealth(): Promise<boolean> {
    if (this.breaker.isOpen()) {
      return false;
    }
    try {
      const res = await this.get<any>('/trending/anime', { limit: 1 });
      return Array.isArray(res.data) && res.data.length > 0;
    } catch {
      return false;
    }
  }
}

export const kitsuProvider = new KitsuAnimeProvider();
