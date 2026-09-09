import { MediaItem, MediaType, PaginatedResponse, FilterParams } from '../../../types/index';
import { normalizeMangaDexMedia, MangaDexMangaItem, MangaDexStats } from './mangadexNormalizer';
import { getMangaDexTagId } from './mangadexTags';
import { isSafeContent } from '../../safety/isSafeContent';

const DEFAULT_MANGADEX_URL = 'https://api.mangadex.org';
const REQUEST_TIMEOUT_MS = 10000;

export interface IMangaDexProvider {
  getTrending(limit?: number, page?: number, type?: 'MANGA' | 'MANHWA' | 'ALL'): Promise<MediaItem[]>;
  getPopular(limit?: number, page?: number, type?: 'MANGA' | 'MANHWA' | 'ALL'): Promise<MediaItem[]>;
  getLatest(limit?: number, page?: number, type?: 'MANGA' | 'MANHWA' | 'ALL'): Promise<MediaItem[]>;
  getList(params: FilterParams, type?: 'MANGA' | 'MANHWA' | 'ALL'): Promise<PaginatedResponse<MediaItem>>;
  getById(id: string): Promise<MediaItem | null>;
  search(query: string, limit?: number, page?: number, type?: 'MANGA' | 'MANHWA' | 'ALL'): Promise<PaginatedResponse<MediaItem>>;
  checkHealth(): Promise<boolean>;
}

export class MangaDexProvider implements IMangaDexProvider {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.MANGADEX_API_URL || DEFAULT_MANGADEX_URL;
  }

  /**
   * Universal fetch helper with timeout, status handling, and rate limit handling.
   */
  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val === undefined || val === null) continue;
        if (Array.isArray(val)) {
          for (const item of val) {
            url.searchParams.append(key, String(item));
          }
        } else {
          url.searchParams.append(key, String(val));
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AnimeHub/1.0',
        },
        signal: controller.signal,
      });

      if (res.status === 429) {
        throw new Error('MangaDex API rate limit reached. Please try again in a moment.');
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`MangaDex API error ${res.status}: ${errorText.slice(0, 100)}`);
      }

      return (await res.json()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`MangaDex request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fetches batch statistics for multiple manga IDs.
   */
  private async fetchBatchStats(ids: string[]): Promise<Record<string, MangaDexStats>> {
    if (ids.length === 0) return {};
    try {
      const queryParams: Record<string, any> = {
        'manga[]': ids,
      };
      const res = await this.request<{
        result: string;
        statistics?: Record<string, MangaDexStats>;
      }>('/statistics/manga', queryParams);

      return res.statistics || {};
    } catch (err: any) {
      console.info(`[MangaDexProvider] Batch statistics unavailable: ${err.message}`);
      return {};
    }
  }

  /**
   * Maps client sort parameter to MangaDex order query params.
   */
  private mapSort(sort?: string): Record<string, string> {
    switch (sort) {
      case 'popularity':
        return { 'order[followedCount]': 'desc' };
      case 'rating':
        return { 'order[rating]': 'desc' };
      case 'release':
      case 'latest':
        return { 'order[latestUploadedChapter]': 'desc' };
      case 'title':
        return { 'order[title]': 'asc' };
      case 'trending':
      default:
        return { 'order[followedCount]': 'desc', 'order[rating]': 'desc' };
    }
  }

  /**
   * Maps client status parameter to MangaDex status query params.
   */
  private mapStatus(status?: string): string[] | undefined {
    if (!status || status === 'All') return undefined;
    const s = status.toLowerCase();
    if (s === 'publishing' || s === 'airing') return ['ongoing'];
    if (s === 'completed') return ['completed'];
    if (s === 'hiatus') return ['hiatus'];
    return undefined;
  }

  /**
   * Fetch trending titles from MangaDex
   */
  async getTrending(limit = 12, page = 1, type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'): Promise<MediaItem[]> {
    const offset = (page - 1) * limit;
    const queryParams: Record<string, any> = {
      limit,
      offset,
      'includes[]': ['cover_art', 'author', 'artist'],
      'contentRating[]': ['safe', 'suggestive'],
      'order[followedCount]': 'desc',
      'order[rating]': 'desc',
    };

    if (type === 'MANHWA') {
      queryParams['originalLanguage[]'] = ['ko'];
    } else if (type === 'MANGA') {
      queryParams['originalLanguage[]'] = ['ja'];
    }

    const res = await this.request<{ data: MangaDexMangaItem[] }>('/manga', queryParams);
    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);

    return mangaList
      .map((m) =>
        normalizeMangaDexMedia(
          m,
          statsMap[m.id],
          type === 'MANHWA' ? 'MANHWA' : type === 'MANGA' ? 'MANGA' : undefined
        )
      )
      .filter((item) => isSafeContent(item));
  }

  /**
   * Fetch popular titles from MangaDex
   */
  async getPopular(limit = 12, page = 1, type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'): Promise<MediaItem[]> {
    const offset = (page - 1) * limit;
    const queryParams: Record<string, any> = {
      limit,
      offset,
      'includes[]': ['cover_art', 'author', 'artist'],
      'contentRating[]': ['safe', 'suggestive'],
      'order[followedCount]': 'desc',
    };

    if (type === 'MANHWA') {
      queryParams['originalLanguage[]'] = ['ko'];
    } else if (type === 'MANGA') {
      queryParams['originalLanguage[]'] = ['ja'];
    }

    const res = await this.request<{ data: MangaDexMangaItem[] }>('/manga', queryParams);
    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);

    return mangaList
      .map((m) =>
        normalizeMangaDexMedia(
          m,
          statsMap[m.id],
          type === 'MANHWA' ? 'MANHWA' : type === 'MANGA' ? 'MANGA' : undefined
        )
      )
      .filter((item) => isSafeContent(item));
  }

  /**
   * Fetch latest releases from MangaDex
   */
  async getLatest(limit = 12, page = 1, type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'): Promise<MediaItem[]> {
    const offset = (page - 1) * limit;
    const queryParams: Record<string, any> = {
      limit,
      offset,
      'includes[]': ['cover_art', 'author', 'artist'],
      'contentRating[]': ['safe', 'suggestive'],
      'order[latestUploadedChapter]': 'desc',
    };

    if (type === 'MANHWA') {
      queryParams['originalLanguage[]'] = ['ko'];
    } else if (type === 'MANGA') {
      queryParams['originalLanguage[]'] = ['ja'];
    }

    const res = await this.request<{ data: MangaDexMangaItem[] }>('/manga', queryParams);
    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);

    return mangaList
      .map((m) =>
        normalizeMangaDexMedia(
          m,
          statsMap[m.id],
          type === 'MANHWA' ? 'MANHWA' : type === 'MANGA' ? 'MANGA' : undefined
        )
      )
      .filter((item) => isSafeContent(item));
  }

  /**
   * Filtered & paginated query from MangaDex
   */
  async getList(
    params: FilterParams,
    type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'
  ): Promise<PaginatedResponse<MediaItem>> {
    const page = params.page || 1;
    const limit = params.perPage || 18;
    const offset = (page - 1) * limit;

    const queryParams: Record<string, any> = {
      limit,
      offset,
      'includes[]': ['cover_art', 'author', 'artist'],
      'contentRating[]': ['safe', 'suggestive'],
      ...this.mapSort(params.sort),
    };

    if (params.search && params.search.trim()) {
      queryParams.title = params.search.trim();
    }

    if (params.genre && params.genre !== 'All') {
      const tagId = getMangaDexTagId(params.genre);
      if (tagId) {
        queryParams['includedTags[]'] = [tagId];
      }
    }

    const statusList = this.mapStatus(params.status);
    if (statusList && statusList.length > 0) {
      queryParams['status[]'] = statusList;
    }

    if (params.year) {
      queryParams.year = params.year;
    }

    if (type === 'MANHWA') {
      queryParams['originalLanguage[]'] = ['ko'];
    } else if (type === 'MANGA') {
      queryParams['originalLanguage[]'] = ['ja'];
    }

    const res = await this.request<{
      data: MangaDexMangaItem[];
      total: number;
      limit: number;
      offset: number;
    }>('/manga', queryParams);

    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);

    const data = mangaList
      .map((m) =>
        normalizeMangaDexMedia(
          m,
          statsMap[m.id],
          type === 'MANHWA' ? 'MANHWA' : type === 'MANGA' ? 'MANGA' : undefined
        )
      )
      .filter((item) => isSafeContent(item));

    const total = res.total || data.length;

    return {
      data,
      pageInfo: {
        currentPage: page,
        hasNextPage: offset + limit < total,
        total,
        perPage: limit,
        lastPage: Math.ceil(total / limit),
      },
      sourceProvider: 'mangadex',
    };
  }

  /**
   * Fetch single manga details by ID
   */
  async getById(id: string): Promise<MediaItem | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    try {
      const res = await this.request<{
        result: string;
        data: MangaDexMangaItem;
      }>(`/manga/${id}`, {
        'includes[]': ['cover_art', 'author', 'artist'],
      });

      if (!res.data) return null;

      // Fetch statistics for this item
      const statsMap = await this.fetchBatchStats([id]);
      const normalized = normalizeMangaDexMedia(res.data, statsMap[id]);

      return isSafeContent(normalized) ? normalized : null;
    } catch (err: any) {
      console.info(`[MangaDexProvider] Item ${id} unavailable: ${err.message}`);
      return null;
    }
  }

  /**
   * Search titles on MangaDex
   */
  async search(
    query: string,
    limit = 10,
    page = 1,
    type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'
  ): Promise<PaginatedResponse<MediaItem>> {
    return this.getList(
      {
        search: query,
        perPage: limit,
        page,
        sort: 'trending',
      },
      type
    );
  }

  /**
   * Check MangaDex API health status
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.baseUrl}/ping`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'AnimeHub/1.0' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        return text.trim() === 'pong';
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const mangadexProvider = new MangaDexProvider();
