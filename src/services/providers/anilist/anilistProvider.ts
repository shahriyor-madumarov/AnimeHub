import { MediaItem, MediaType, PaginatedResponse, FilterParams } from '../../../types/index';
import { normalizeAniListMedia } from '../../models/normalized';
import { isSafeContent } from '../../safety/isSafeContent';
import { GET_MEDIA_LIST_QUERY, GET_MEDIA_DETAIL_QUERY } from './queries';
import { CircuitBreaker } from '../circuitBreaker';

const DEFAULT_ANILIST_URL = 'https://graphql.anilist.co';
const REQUEST_TIMEOUT_MS = 12000;

export class AniListProvider {
  private endpoint: string;
  readonly breaker = new CircuitBreaker({
    name: 'AniList',
    failureThreshold: 2,
    cooldownMs: 5 * 60 * 1000,
  });

  constructor() {
    this.endpoint = process.env.ANILIST_GRAPHQL_URL || DEFAULT_ANILIST_URL;
  }

  /**
   * Executes a GraphQL query against AniList with timeout and rate limit checks.
   */
  private async executeQuery<T>(query: string, variables: Record<string, any>): Promise<T> {
    if (this.breaker.isOpen()) {
      throw new Error(
        `AniList service temporarily unavailable (${this.breaker.getLastError() || 'circuit breaker active'})`
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        this.breaker.recordFailure('AniList rate limited', true, 60 * 1000);
        throw new Error('AniList API rate limit reached. Please try again in a moment.');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let cleanMsg = `AniList API returned HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.errors?.[0]?.message) {
            cleanMsg = `AniList: ${parsed.errors[0].message}`;
          }
        } catch {
          if (errorText.includes('temporarily disabled')) {
            cleanMsg = 'The AniList API has been temporarily disabled due to upstream stability issues.';
          }
        }
        // Force trip if 403 or 500+
        this.breaker.recordFailure(cleanMsg, response.status === 403 || response.status >= 500);
        throw new Error(cleanMsg);
      }

      const json = await response.json();
      if (json.errors && json.errors.length > 0) {
        const msg = json.errors[0]?.message || 'AniList GraphQL error';
        this.breaker.recordFailure(`AniList GraphQL: ${msg}`, false);
        throw new Error(msg);
      }

      this.breaker.recordSuccess();
      return json.data as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutMsg = `AniList request timed out after ${REQUEST_TIMEOUT_MS}ms`;
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
   * Maps client sort value to AniList GraphQL MediaSort enum
   */
  private mapSort(sort?: string): string[] {
    switch (sort) {
      case 'trending':
        return ['TRENDING_DESC', 'POPULARITY_DESC'];
      case 'popularity':
        return ['POPULARITY_DESC'];
      case 'rating':
        return ['SCORE_DESC'];
      case 'release':
      case 'latest':
        return ['START_DATE_DESC'];
      case 'title':
        return ['TITLE_ROMAJI'];
      default:
        return ['TRENDING_DESC'];
    }
  }

  /**
   * Maps client status to AniList MediaStatus
   */
  private mapStatus(status?: string, type: MediaType = 'ANIME'): string | undefined {
    if (!status || status === 'All') return undefined;
    const s = status.toLowerCase();
    if (s === 'airing' || s === 'publishing') return 'RELEASING';
    if (s === 'completed') return 'FINISHED';
    if (s === 'upcoming') return 'NOT_YET_RELEASED';
    if (s === 'hiatus') return 'HIATUS';
    return undefined;
  }

  /**
   * Fetch trending titles
   */
  async getTrending(type: MediaType, limit = 12, page = 1): Promise<MediaItem[]> {
    const data = await this.executeQuery<any>(GET_MEDIA_LIST_QUERY, {
      page,
      perPage: limit,
      type,
      sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
      isAdult: false,
    });

    const mediaList = data?.Page?.media || [];
    return mediaList
      .map((m: any) => normalizeAniListMedia(m, type))
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Fetch popular titles
   */
  async getPopular(type: MediaType, limit = 12, page = 1): Promise<MediaItem[]> {
    const data = await this.executeQuery<any>(GET_MEDIA_LIST_QUERY, {
      page,
      perPage: limit,
      type,
      sort: ['POPULARITY_DESC'],
      isAdult: false,
    });

    const mediaList = data?.Page?.media || [];
    return mediaList
      .map((m: any) => normalizeAniListMedia(m, type))
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Fetch latest releases
   */
  async getLatest(type: MediaType, limit = 12, page = 1): Promise<MediaItem[]> {
    const data = await this.executeQuery<any>(GET_MEDIA_LIST_QUERY, {
      page,
      perPage: limit,
      type,
      sort: ['START_DATE_DESC'],
      status: type === 'ANIME' ? 'RELEASING' : undefined,
      isAdult: false,
    });

    const mediaList = data?.Page?.media || [];
    return mediaList
      .map((m: any) => {
        const item = normalizeAniListMedia(m, type);
        item.isLatest = true;
        return item;
      })
      .filter((item: MediaItem) => isSafeContent(item));
  }

  /**
   * Fetch paginated & filtered media list
   */
  async getList(type: MediaType, params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
    const page = params.page || 1;
    const perPage = params.perPage || 18;
    const sort = this.mapSort(params.sort);
    const status = this.mapStatus(params.status, type);
    const genre = params.genre && params.genre !== 'All' ? params.genre : undefined;

    const data = await this.executeQuery<any>(GET_MEDIA_LIST_QUERY, {
      page,
      perPage,
      type,
      sort,
      status,
      genre,
      search: params.search && params.search.trim() ? params.search.trim() : undefined,
      seasonYear: params.year,
      isAdult: false,
    });

    const pageInfo = data?.Page?.pageInfo || {
      currentPage: page,
      hasNextPage: false,
      perPage,
    };

    const mediaList = data?.Page?.media || [];
    const items = mediaList
      .map((m: any) => normalizeAniListMedia(m, type))
      .filter((item: MediaItem) => isSafeContent(item, genre));

    return {
      data: items,
      pageInfo: {
        currentPage: pageInfo.currentPage || page,
        hasNextPage: pageInfo.hasNextPage || false,
        total: pageInfo.total,
        perPage: pageInfo.perPage || perPage,
        lastPage: pageInfo.lastPage,
      },
      sourceProvider: 'anilist',
    };
  }

  /**
   * Fetch single media details by AniList ID
   */
  async getById(type: MediaType, id: string): Promise<MediaItem | null> {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return null;
    }

    const data = await this.executeQuery<any>(GET_MEDIA_DETAIL_QUERY, {
      id: numId,
      type,
      isAdult: false,
    });

    if (!data?.Media) {
      return null;
    }

    const item = normalizeAniListMedia(data.Media, type);
    if (!isSafeContent(item)) {
      return null;
    }

    return item;
  }

  /**
   * Quick search
   */
  async search(type: MediaType, query: string, limit = 10, page = 1): Promise<PaginatedResponse<MediaItem>> {
    return this.getList(type, {
      search: query,
      perPage: limit,
      page,
      sort: 'popularity',
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
      const res = await this.getTrending('ANIME', 1, 1);
      return res.length > 0;
    } catch {
      return false;
    }
  }
}

export const anilistProvider = new AniListProvider();
