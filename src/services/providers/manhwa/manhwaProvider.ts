import { MediaItem, PaginatedResponse, FilterParams } from '../../../types/index';
import { mangadexProvider } from '../mangadex/mangadexProvider';
import { mockManhwaList } from '../../../data/mockData';
import { isSafeContent } from '../../safety/isSafeContent';

/**
 * Interface contract for Manhwa data providers.
 */
export interface IManhwaProvider {
  getTrending(limit?: number): Promise<MediaItem[]>;
  getPopular(limit?: number): Promise<MediaItem[]>;
  getLatest(limit?: number): Promise<MediaItem[]>;
  getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>>;
  getById(id: string): Promise<MediaItem | null>;
  search(query: string, limit?: number, page?: number): Promise<PaginatedResponse<MediaItem>>;
}

/**
 * Live MangaDex Manhwa Provider
 * Directly queries MangaDex API for real Korean Webtoons/Manhwa with real cover art,
 * ratings, follower metrics, and genres.
 */
export class MangaDexManhwaProvider implements IManhwaProvider {
  async getTrending(limit = 12): Promise<MediaItem[]> {
    try {
      const results = await mangadexProvider.getTrending(limit, 1, 'MANHWA');
      if (results && results.length > 0) return results;
    } catch (err: any) {
      console.info(`[ManhwaProvider] MangaDex getTrending unavailable (${err.message}). Using fallback data.`);
    }
    return mockManhwaList
      .filter((i) => i.isTrending && isSafeContent(i))
      .slice(0, limit)
      .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
  }

  async getPopular(limit = 12): Promise<MediaItem[]> {
    try {
      const results = await mangadexProvider.getPopular(limit, 1, 'MANHWA');
      if (results && results.length > 0) return results;
    } catch (err: any) {
      console.info(`[ManhwaProvider] MangaDex getPopular unavailable (${err.message}). Using fallback data.`);
    }
    return mockManhwaList
      .filter((i) => isSafeContent(i))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit)
      .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
  }

  async getLatest(limit = 12): Promise<MediaItem[]> {
    try {
      const results = await mangadexProvider.getLatest(limit, 1, 'MANHWA');
      if (results && results.length > 0) return results;
    } catch (err: any) {
      console.info(`[ManhwaProvider] MangaDex getLatest unavailable (${err.message}). Using fallback data.`);
    }
    return mockManhwaList
      .filter((i) => i.isLatest && isSafeContent(i))
      .slice(0, limit)
      .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
  }

  async getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
    try {
      const res = await mangadexProvider.getList(params, 'MANHWA');
      if (res && res.data.length > 0) return res;
    } catch (err: any) {
      console.info(`[ManhwaProvider] MangaDex getList unavailable (${err.message}). Using fallback data.`);
    }
    const page = params.page || 1;
    const perPage = params.perPage || 18;
    const start = (page - 1) * perPage;
    const safeList = mockManhwaList.filter((i) => isSafeContent(i));
    return {
      data: safeList.slice(start, start + perPage).map((i) => ({ ...i, sourceProvider: 'mock' as const })),
      pageInfo: {
        currentPage: page,
        hasNextPage: start + perPage < safeList.length,
        perPage,
        total: safeList.length,
        lastPage: Math.ceil(safeList.length / perPage),
      },
      sourceProvider: 'mock',
    };
  }

  async getById(id: string): Promise<MediaItem | null> {
    try {
      const item = await mangadexProvider.getById(id);
      if (item) return item;
    } catch (err: any) {
      console.info(`[ManhwaProvider] MangaDex getById unavailable (${err.message}).`);
    }
    const fallback = mockManhwaList.find(
      (i) => i.id === id || i.id.toLowerCase() === id.toLowerCase()
    );
    return fallback ? { ...fallback, sourceProvider: 'mock' as const } : null;
  }

  async search(query: string, limit = 18, page = 1): Promise<PaginatedResponse<MediaItem>> {
    try {
      const res = await mangadexProvider.search(query, limit, page, 'MANHWA');
      if (res && res.data.length > 0) return res;
    } catch (err: any) {
      console.info(`[ManhwaProvider] MangaDex search unavailable (${err.message}). Using fallback data.`);
    }
    const q = query.toLowerCase().trim();
    const filtered = mockManhwaList.filter(
      (i) =>
        isSafeContent(i) &&
        (i.title.toLowerCase().includes(q) ||
          (i.englishTitle && i.englishTitle.toLowerCase().includes(q)))
    );
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map((i) => ({ ...i, sourceProvider: 'mock' as const })),
      pageInfo: {
        currentPage: page,
        hasNextPage: start + limit < filtered.length,
        perPage: limit,
        total: filtered.length,
        lastPage: Math.ceil(filtered.length / limit),
      },
      sourceProvider: 'mock',
    };
  }
}

export const manhwaProvider: IManhwaProvider = new MangaDexManhwaProvider();

