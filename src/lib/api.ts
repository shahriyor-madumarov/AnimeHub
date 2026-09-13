import { MediaItem, PaginatedResponse, FilterParams, NewsArticle } from '../types';

/**
 * Universal client-side API helper.
 * Communicates strictly with the AnimeHub Express server API layer (/api/*).
 * Includes lightweight in-flight deduplication and 60-second in-memory caching to avoid redundant requests.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const apiCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

async function fetchJson<T>(endpoint: string, params?: Record<string, any>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  // Guarantee that same-origin API requests always target /api/*
  let url = endpoint;
  if (!url.startsWith('/api') && !url.startsWith('http')) {
    url = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
  }
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  // 1. Return fresh cached response if available
  const now = Date.now();
  const cached = apiCache.get(url);
  if (cached && cached.expiry > now) {
    return cached.data as T;
  }

  // 2. Reuse active in-flight request to deduplicate concurrent calls
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)! as Promise<T>;
  }

  // 3. Initiate network request
  const requestPromise = (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`API request to ${endpoint} failed with status ${res.status}`);
      }

      const data = (await res.json()) as T;
      if (ttlMs > 0) {
        apiCache.set(url, { data, expiry: Date.now() + ttlMs });
      }
      return data;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, requestPromise);
  return requestPromise;
}

// ---------------- ANIME API ----------------
export async function fetchTrendingAnime(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/anime/trending', { limit });
}

export async function fetchPopularAnime(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/anime/popular', { limit });
}

export async function fetchLatestAnime(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/anime/latest', { limit });
}

export async function fetchAnimeList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
  return fetchJson<PaginatedResponse<MediaItem>>('/api/anime', params);
}

export async function fetchAnimeById(id: string): Promise<MediaItem | null> {
  try {
    return await fetchJson<MediaItem>(`/api/anime/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function searchAnime(query: string, limit = 18, page = 1): Promise<PaginatedResponse<MediaItem>> {
  return fetchJson<PaginatedResponse<MediaItem>>('/api/anime/search', { q: query, limit, page });
}

// ---------------- MANGA API ----------------
export async function fetchTrendingManga(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/manga/trending', { limit });
}

export async function fetchPopularManga(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/manga/popular', { limit });
}

export async function fetchLatestManga(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/manga/latest', { limit });
}

export async function fetchMangaList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
  return fetchJson<PaginatedResponse<MediaItem>>('/api/manga', params);
}

export async function fetchMangaById(id: string): Promise<MediaItem | null> {
  try {
    return await fetchJson<MediaItem>(`/api/manga/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function searchManga(query: string, limit = 18, page = 1): Promise<PaginatedResponse<MediaItem>> {
  return fetchJson<PaginatedResponse<MediaItem>>('/api/manga/search', { q: query, limit, page });
}

// ---------------- MANHWA API ----------------
export async function fetchTrendingManhwa(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/manhwa/trending', { limit });
}

export async function fetchPopularManhwa(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/manhwa/popular', { limit });
}

export async function fetchLatestManhwa(limit = 12): Promise<MediaItem[]> {
  return fetchJson<MediaItem[]>('/api/manhwa/latest', { limit });
}

export async function fetchManhwaList(params: FilterParams): Promise<PaginatedResponse<MediaItem>> {
  return fetchJson<PaginatedResponse<MediaItem>>('/api/manhwa', params);
}

export async function fetchManhwaById(id: string): Promise<MediaItem | null> {
  try {
    return await fetchJson<MediaItem>(`/api/manhwa/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function searchManhwa(query: string, limit = 18, page = 1): Promise<PaginatedResponse<MediaItem>> {
  return fetchJson<PaginatedResponse<MediaItem>>('/api/manhwa/search', { q: query, limit, page });
}

// ---------------- NEWS API ----------------
export async function fetchNewsArticles(category?: string, limit = 12, query?: string): Promise<NewsArticle[]> {
  return fetchJson<NewsArticle[]>('/api/news', { category, limit, q: query });
}

export async function fetchLatestNews(limit = 12): Promise<NewsArticle[]> {
  return fetchJson<NewsArticle[]>('/api/news/latest', { limit });
}

export async function fetchNewsByCategory(category: string, limit = 12): Promise<NewsArticle[]> {
  return fetchJson<NewsArticle[]>(`/api/news/category/${encodeURIComponent(category)}`, { limit });
}

export async function fetchNewsArticleById(id: string): Promise<NewsArticle | null> {
  try {
    return await fetchJson<NewsArticle>(`/api/news/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function searchNews(query: string, limit = 12, category?: string): Promise<NewsArticle[]> {
  return fetchJson<NewsArticle[]>('/api/news', { q: query, limit, category });
}

// ---------------- UNIVERSAL SEARCH ----------------
export async function universalSearch(
  query: string,
  type = 'ALL',
  limit = 10,
  page = 1
): Promise<PaginatedResponse<MediaItem>> {
  return fetchJson<PaginatedResponse<MediaItem>>('/api/search', {
    q: query,
    type,
    limit,
    page,
  });
}
