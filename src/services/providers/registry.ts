import { MediaItem, PaginatedResponse, FilterParams, NewsArticle } from '../../types/index';
import { globalCache } from '../cache/cache';
import { anilistProvider } from './anilist/anilistProvider';
import { jikanProvider } from './jikan/jikanProvider';
import { kitsuProvider, KitsuAnimeProvider } from './kitsu/kitsuProvider';
import { manhwaProvider } from './manhwa/manhwaProvider';
import { mangadexProvider } from './mangadex/mangadexProvider';
import { newsProvider, rssNewsProvider, RssNewsProvider } from './news/newsProvider';
import { mockAnimeList, mockMangaList } from '../../data/mockData';
import { isSafeContent } from '../safety/isSafeContent';

// Cache TTL configurations (seconds)
const TTL_TRENDING = 600; // 10 minutes
const TTL_POPULAR = 1200; // 20 minutes
const TTL_LATEST = 900; // 15 minutes
const TTL_SEARCH = 180; // 3 minutes
const TTL_DETAILS = 1800; // 30 minutes

/**
 * Filter mock data when external providers are unreachable.
 */
function filterMockData(
  list: MediaItem[],
  params: FilterParams
): PaginatedResponse<MediaItem> {
  const page = params.page || 1;
  const perPage = params.perPage || 18;

  let filtered = list.filter((item) => isSafeContent(item));

  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.englishTitle && i.englishTitle.toLowerCase().includes(q)) ||
        i.genres.some((g) => g.toLowerCase().includes(q)) ||
        i.studioOrAuthor.toLowerCase().includes(q)
    );
  }

  if (params.genre && params.genre !== 'All') {
    filtered = filtered.filter((i) =>
      i.genres.some((g) => g.toLowerCase() === params.genre?.toLowerCase())
    );
  }

  if (params.status && params.status !== 'All') {
    filtered = filtered.filter(
      (i) => i.status.toLowerCase() === params.status?.toLowerCase()
    );
  }

  if (params.sort) {
    if (params.sort === 'rating') {
      filtered = [...filtered].sort((a, b) => b.rating - a.rating);
    } else if (params.sort === 'popularity') {
      filtered = [...filtered].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (params.sort === 'title') {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  const startIndex = (page - 1) * perPage;
  const items = filtered.slice(startIndex, startIndex + perPage).map((i) => ({
    ...i,
    sourceProvider: 'mock' as const,
  }));

  return {
    data: items,
    pageInfo: {
      currentPage: page,
      hasNextPage: startIndex + perPage < filtered.length,
      total: filtered.length,
      perPage,
      lastPage: Math.ceil(filtered.length / perPage),
    },
    sourceProvider: 'mock',
  };
}

/**
 * ANIME SERVICE
 * Cascades: AniList (Primary) -> Jikan (Secondary live API) -> Kitsu (Third live API) -> Mock Data (Final safety net)
 */
export const animeService = {
  async getTrending(limit = 12, page = 1): Promise<MediaItem[]> {
    const cacheKey = `anime:trending:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_TRENDING, async () => {
      // 1. Try AniList Primary
      try {
        const results = await anilistProvider.getTrending('ANIME', limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList getTrending unavailable (${err.message}). Trying Jikan fallback.`);
      }

      // 2. Try Jikan Fallback
      try {
        const results = await jikanProvider.getTrending(limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] Jikan getTrending unavailable (${err.message}). Trying Kitsu fallback.`);
      }

      // 3. Try Kitsu Fallback
      try {
        const results = await kitsuProvider.getTrending(limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] Kitsu getTrending unavailable (${err.message}). Using curated fallback data.`);
      }

      // 4. Fallback to high quality mock data (only when all live providers fail)
      return mockAnimeList
        .filter((i) => i.isTrending && isSafeContent(i))
        .slice(0, limit)
        .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
    });
  },

  async getPopular(limit = 12, page = 1): Promise<MediaItem[]> {
    const cacheKey = `anime:popular:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_POPULAR, async () => {
      // 1. Try AniList Primary
      try {
        const results = await anilistProvider.getPopular('ANIME', limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList getPopular unavailable (${err.message}). Trying Jikan fallback.`);
      }

      // 2. Try Jikan Fallback
      try {
        const results = await jikanProvider.getPopular(limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] Jikan getPopular unavailable (${err.message}). Trying Kitsu fallback.`);
      }

      // 3. Try Kitsu Fallback
      try {
        const results = await kitsuProvider.getPopular(limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] Kitsu getPopular unavailable (${err.message}). Using curated fallback data.`);
      }

      // 4. Fallback to high quality mock data (only when all live providers fail)
      return mockAnimeList
        .filter((item) => isSafeContent(item))
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, limit)
        .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
    });
  },

  async getLatest(limit = 12, page = 1): Promise<MediaItem[]> {
    const cacheKey = `anime:latest:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_LATEST, async () => {
      // 1. Try AniList Primary
      try {
        const results = await anilistProvider.getLatest('ANIME', limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList getLatest unavailable (${err.message}). Trying Jikan fallback.`);
      }

      // 2. Try Jikan Fallback
      try {
        const results = await jikanProvider.getLatest(limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] Jikan getLatest unavailable (${err.message}). Trying Kitsu fallback.`);
      }

      // 3. Try Kitsu Fallback
      try {
        const results = await kitsuProvider.getLatest(limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] Kitsu getLatest unavailable (${err.message}). Using curated fallback data.`);
      }

      // 4. Fallback to high quality mock data (only when all live providers fail)
      return mockAnimeList
        .filter((i) => i.isLatest && isSafeContent(i))
        .slice(0, limit)
        .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
    });
  },

  async getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
    const cacheKey = `anime:list:${JSON.stringify(params)}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, async () => {
      // 1. Try AniList Primary
      try {
        const res = await anilistProvider.getList('ANIME', params);
        if (res && res.data.length > 0) return res;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList getList unavailable (${err.message}). Trying Jikan fallback.`);
      }

      // 2. Try Jikan Fallback
      try {
        const res = await jikanProvider.getList(params);
        if (res && res.data.length > 0) return res;
      } catch (err: any) {
        console.info(`[AnimeHub] Jikan getList unavailable (${err.message}). Trying Kitsu fallback.`);
      }

      // 3. Try Kitsu Fallback
      try {
        const res = await kitsuProvider.getList(params);
        if (res && res.data.length > 0) return res;
      } catch (err: any) {
        console.info(`[AnimeHub] Kitsu getList unavailable (${err.message}). Using curated fallback data.`);
      }

      // 4. Fallback to mock data (only when all live providers fail)
      return filterMockData(mockAnimeList, params);
    });
  },

  async getById(id: string): Promise<MediaItem | null> {
    const cacheKey = `anime:detail:${id}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_DETAILS, async () => {
      // 1. Try AniList by ID or slug search (Primary)
      try {
        if (!isNaN(parseInt(id, 10))) {
          const item = await anilistProvider.getById('ANIME', id);
          if (item) return item;
        } else {
          const cleanQuery = id.replace(/[-_]/g, ' ').trim();
          const searchRes = await anilistProvider.search('ANIME', cleanQuery, 1);
          if (searchRes.data.length > 0) {
            const item = await anilistProvider.getById('ANIME', searchRes.data[0].id);
            if (item) return { ...item, id };
          }
        }
      } catch (err: any) {
        console.info(`[AnimeHub] AniList getById unavailable (${err.message}).`);
      }

      // 2. Try Jikan by ID
      try {
        const item = await jikanProvider.getById(id);
        if (item) return item;
      } catch (err: any) {
        console.info(`[AnimeHub] Jikan getById unavailable (${err.message}).`);
      }

      // 3. Try Kitsu by ID or slug
      try {
        const item = await kitsuProvider.getById(id);
        if (item) return item;
      } catch (err: any) {
        console.info(`[AnimeHub] Kitsu getById unavailable (${err.message}).`);
      }

      // 4. Fallback to mock item by ID or slug (only when all live providers fail)
      const mockItem = mockAnimeList.find(
        (i) => i.id === id || i.id.toLowerCase() === id.toLowerCase()
      );
      if (mockItem && isSafeContent(mockItem)) {
        return { ...mockItem, sourceProvider: 'mock' as const };
      }

      return null;
    });
  },

  async search(query: string, limit = 10, page = 1): Promise<PaginatedResponse<MediaItem>> {
    return this.getList({
      search: query,
      perPage: limit,
      page,
      sort: 'trending',
    });
  },
};

/**
 * MANGA SERVICE
 * Cascades: AniList (Primary) -> MangaDex (Secondary live API) -> Mock Data (Final safety net)
 */
export const mangaService = {
  async getTrending(limit = 12, page = 1): Promise<MediaItem[]> {
    const cacheKey = `manga:trending:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_TRENDING, async () => {
      // 1. Try AniList Primary
      try {
        const results = await anilistProvider.getTrending('MANGA', limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList manga trending unavailable (${err.message}). Trying MangaDex.`);
      }

      // 2. Try MangaDex Secondary
      try {
        const results = await mangadexProvider.getTrending(limit, page, 'MANGA');
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] MangaDex manga trending unavailable (${err.message}). Using fallback data.`);
      }

      // 3. Mock Data Fallback
      return mockMangaList
        .filter((i) => i.isTrending && isSafeContent(i))
        .slice(0, limit)
        .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
    });
  },

  async getPopular(limit = 12, page = 1): Promise<MediaItem[]> {
    const cacheKey = `manga:popular:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_POPULAR, async () => {
      // 1. Try AniList Primary
      try {
        const results = await anilistProvider.getPopular('MANGA', limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList manga popular unavailable (${err.message}). Trying MangaDex.`);
      }

      // 2. Try MangaDex Secondary
      try {
        const results = await mangadexProvider.getPopular(limit, page, 'MANGA');
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] MangaDex manga popular unavailable (${err.message}). Using fallback data.`);
      }

      // 3. Mock Data Fallback
      return mockMangaList
        .filter((item) => isSafeContent(item))
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, limit)
        .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
    });
  },

  async getLatest(limit = 12, page = 1): Promise<MediaItem[]> {
    const cacheKey = `manga:latest:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_LATEST, async () => {
      // 1. Try AniList Primary
      try {
        const results = await anilistProvider.getLatest('MANGA', limit, page);
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList manga latest unavailable (${err.message}). Trying MangaDex.`);
      }

      // 2. Try MangaDex Secondary
      try {
        const results = await mangadexProvider.getLatest(limit, page, 'MANGA');
        if (results && results.length > 0) return results;
      } catch (err: any) {
        console.info(`[AnimeHub] MangaDex manga latest unavailable (${err.message}). Using fallback data.`);
      }

      // 3. Mock Data Fallback
      return mockMangaList
        .filter((i) => i.isLatest && isSafeContent(i))
        .slice(0, limit)
        .map((i) => ({ ...i, sourceProvider: 'mock' as const }));
    });
  },

  async getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
    const cacheKey = `manga:list:${JSON.stringify(params)}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, async () => {
      // 1. Try AniList Primary
      try {
        const res = await anilistProvider.getList('MANGA', params);
        if (res && res.data.length > 0) return res;
      } catch (err: any) {
        console.info(`[AnimeHub] AniList manga list unavailable (${err.message}). Trying MangaDex.`);
      }

      // 2. Try MangaDex Secondary
      try {
        const res = await mangadexProvider.getList(params, 'MANGA');
        if (res && res.data.length > 0) return res;
      } catch (err: any) {
        console.info(`[AnimeHub] MangaDex manga list unavailable (${err.message}). Using fallback data.`);
      }

      // 3. Mock Data Fallback
      return filterMockData(mockMangaList, params);
    });
  },

  async getById(id: string): Promise<MediaItem | null> {
    const cacheKey = `manga:detail:${id}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_DETAILS, async () => {
      // 1. Try AniList Primary
      try {
        if (!isNaN(parseInt(id, 10))) {
          const item = await anilistProvider.getById('MANGA', id);
          if (item) return item;
        } else {
          const cleanQuery = id.replace(/[-_]/g, ' ').trim();
          const searchRes = await anilistProvider.search('MANGA', cleanQuery, 1);
          if (searchRes.data.length > 0) {
            const item = await anilistProvider.getById('MANGA', searchRes.data[0].id);
            if (item) return { ...item, id };
          }
        }
      } catch (err: any) {
        console.info(`[AnimeHub] AniList manga getById unavailable (${err.message}).`);
      }

      // 2. Try MangaDex Secondary
      try {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          const item = await mangadexProvider.getById(id);
          if (item) return item;
        } else {
          const cleanQuery = id.replace(/[-_]/g, ' ').trim();
          const searchRes = await mangadexProvider.search(cleanQuery, 1, 1, 'MANGA');
          if (searchRes.data.length > 0) {
            return { ...searchRes.data[0], id };
          }
        }
      } catch (err: any) {
        console.info(`[AnimeHub] MangaDex manga getById unavailable (${err.message}).`);
      }

      // 3. Mock Data Fallback
      const mockItem = mockMangaList.find(
        (i) => i.id === id || i.id.toLowerCase() === id.toLowerCase()
      );
      if (mockItem && isSafeContent(mockItem)) {
        return { ...mockItem, sourceProvider: 'mock' as const };
      }

      return null;
    });
  },

  async search(query: string, limit = 10, page = 1): Promise<PaginatedResponse<MediaItem>> {
    return this.getList({
      search: query,
      perPage: limit,
      page,
      sort: 'trending',
    });
  },
};

/**
 * MANHWA SERVICE
 */
export const manhwaService = {
  async getTrending(limit = 12): Promise<MediaItem[]> {
    const cacheKey = `manhwa:trending:${limit}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_TRENDING, () =>
      manhwaProvider.getTrending(limit)
    );
  },

  async getPopular(limit = 12): Promise<MediaItem[]> {
    const cacheKey = `manhwa:popular:${limit}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_POPULAR, () =>
      manhwaProvider.getPopular(limit)
    );
  },

  async getLatest(limit = 12): Promise<MediaItem[]> {
    const cacheKey = `manhwa:latest:${limit}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_LATEST, () =>
      manhwaProvider.getLatest(limit)
    );
  },

  async getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
    const cacheKey = `manhwa:list:${JSON.stringify(params)}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, () =>
      manhwaProvider.getList(params)
    );
  },

  async getById(id: string): Promise<MediaItem | null> {
    const cacheKey = `manhwa:detail:${id}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_DETAILS, () =>
      manhwaProvider.getById(id)
    );
  },

  async search(query: string, limit = 18, page = 1): Promise<PaginatedResponse<MediaItem>> {
    const cacheKey = `manhwa:search:${query}:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, () =>
      manhwaProvider.search(query, limit, page)
    );
  },
};

/**
 * NEWS SERVICE
 */
export const newsService = {
  async getLatest(category?: string, limit = 10): Promise<NewsArticle[]> {
    const cacheKey = `news:latest:${category || 'all'}:${limit}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, () =>
      rssNewsProvider.getLatest(category, limit)
    );
  },

  async getById(id: string): Promise<NewsArticle | null> {
    const cacheKey = `news:detail:${id}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_DETAILS, () =>
      rssNewsProvider.getById(id)
    );
  },

  async search(query: string): Promise<NewsArticle[]> {
    return rssNewsProvider.search(query);
  },
};

export { rssNewsProvider, RssNewsProvider } from './news/newsProvider';
export { kitsuProvider, KitsuAnimeProvider } from './kitsu/kitsuProvider';

/**
 * MANGADEX SERVICE & PROVIDER REGISTRATION
 */
export { mangadexProvider } from './mangadex/mangadexProvider';

export const mangadexService = {
  async getTrending(limit = 12, page = 1, type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'): Promise<MediaItem[]> {
    const cacheKey = `mangadex:trending:${limit}:${page}:${type}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_TRENDING, () =>
      mangadexProvider.getTrending(limit, page, type)
    );
  },

  async getPopular(limit = 12, page = 1, type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'): Promise<MediaItem[]> {
    const cacheKey = `mangadex:popular:${limit}:${page}:${type}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_POPULAR, () =>
      mangadexProvider.getPopular(limit, page, type)
    );
  },

  async getLatest(limit = 12, page = 1, type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'): Promise<MediaItem[]> {
    const cacheKey = `mangadex:latest:${limit}:${page}:${type}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_LATEST, () =>
      mangadexProvider.getLatest(limit, page, type)
    );
  },

  async getList(params: FilterParams, type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'): Promise<PaginatedResponse<MediaItem>> {
    const cacheKey = `mangadex:list:${JSON.stringify(params)}:${type}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, () =>
      mangadexProvider.getList(params, type)
    );
  },

  async getById(id: string): Promise<MediaItem | null> {
    const cacheKey = `mangadex:detail:${id}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_DETAILS, () =>
      mangadexProvider.getById(id)
    );
  },

  async search(
    query: string,
    limit = 10,
    page = 1,
    type: 'MANGA' | 'MANHWA' | 'ALL' = 'ALL'
  ): Promise<PaginatedResponse<MediaItem>> {
    return mangadexProvider.search(query, limit, page, type);
  },
};

