import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  animeService,
  mangaService,
  manhwaService,
  newsService,
  mangadexService,
} from '../providers/registry';
import { anilistProvider } from '../providers/anilist/anilistProvider';
import { jikanProvider } from '../providers/jikan/jikanProvider';
import { mangadexProvider } from '../providers/mangadex/mangadexProvider';
import { globalCache } from '../cache/cache';
import { FilterParams } from '../../types/index';

export const apiRouter = Router();

// Helper to parse integer query param with fallback
function parseIntParam(val: any, fallback: number): number {
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? fallback : parsed;
}

// Parse common filter params
function extractFilterParams(req: Request): FilterParams {
  return {
    search: typeof req.query.q === 'string' ? req.query.q : typeof req.query.search === 'string' ? req.query.search : undefined,
    genre: typeof req.query.genre === 'string' ? req.query.genre : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    format: typeof req.query.format === 'string' ? req.query.format : undefined,
    season: typeof req.query.season === 'string' ? req.query.season : undefined,
    year: req.query.year ? parseIntParam(req.query.year, 0) || undefined : undefined,
    sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
    page: parseIntParam(req.query.page, 1),
    perPage: Math.min(parseIntParam(req.query.perPage || req.query.limit, 18), 50),
  };
}

// ----------------------------------------------------
// Health Check Endpoint
// ----------------------------------------------------
apiRouter.get('/health', async (req: Request, res: Response) => {
  const [anilistOk, jikanOk, mangadexOk] = await Promise.all([
    anilistProvider.checkHealth(),
    jikanProvider.checkHealth(),
    mangadexProvider.checkHealth(),
  ]);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    providers: {
      anilist: anilistOk ? 'operational' : 'degraded',
      jikan: jikanOk ? 'operational' : 'degraded',
      mangadex: mangadexOk ? 'operational' : 'degraded',
      manhwa: 'operational',
      news: 'operational',
    },
    cache: globalCache.getStats(),
  });
});

// ----------------------------------------------------
// Authentication Helper & Endpoints
// ----------------------------------------------------
function formatSupabaseUrl(url: string): string {
  const clean = url.trim().replace(/\/+$/, '');
  const withoutProtocol = clean.replace(/^https?:\/\//, '');
  if (!withoutProtocol.includes('.')) {
    return `https://${withoutProtocol}.supabase.co`;
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return `https://${clean}`;
  }
  return clean;
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, client: null, error: 'Missing or invalid Authorization header', status: 401 };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return { user: null, client: null, error: 'Empty bearer token', status: 401 };
  }

  const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const rawKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!rawUrl || !rawKey) {
    return {
      user: null,
      client: null,
      error: 'Supabase authentication service is not configured',
      status: 503,
    };
  }

  const supabaseUrl = formatSupabaseUrl(rawUrl);
  const client = createClient(supabaseUrl, rawKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) {
    return {
      user: null,
      client: null,
      error: userError?.message || 'Invalid or expired session token',
      status: 401,
    };
  }

  return { user, client, error: null, status: 200 };
}

// Profile Endpoint
apiRouter.get('/auth/profile', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error || !auth.user || !auth.client) {
      return res.status(auth.status).json({
        error: 'Unauthorized',
        message: auth.error,
      });
    }

    const { user, client } = auth;
    let profileData: any = null;
    try {
      const { data: dbProfile } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profileData = dbProfile;
    } catch {
      // Continue with metadata if table/query unavailable
    }

    return res.json({
      status: 'ok',
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
      },
      profile: profileData || {
        id: user.id,
        username: user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split('@')[0],
        display_name: user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split('@')[0],
        date_of_birth: user.user_metadata?.date_of_birth || null,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('[API Auth Profile Error]', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Failed to verify authentication token',
    });
  }
});

// ----------------------------------------------------
// Watchlist / Library Endpoints (/api/watchlist, /api/library)
// ----------------------------------------------------
apiRouter.get(['/watchlist', '/library'], async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error || !auth.user || !auth.client) {
      return res.status(auth.status).json({
        error: 'Unauthorized',
        message: auth.error,
      });
    }

    const { data, error } = await auth.client
      .from('saved_items')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: error.message,
      });
    }

    return res.json({
      status: 'ok',
      count: data ? data.length : 0,
      data: data || [],
    });
  } catch (err: any) {
    console.error('[API Watchlist GET Error]', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Failed to fetch watchlist',
    });
  }
});

apiRouter.post(['/watchlist', '/library'], async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error || !auth.user || !auth.client) {
      return res.status(auth.status).json({
        error: 'Unauthorized',
        message: auth.error,
      });
    }

    const item = req.body;
    if (!item || !item.id || !item.title) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing media item payload or invalid id/title',
      });
    }

    const row = {
      user_id: auth.user.id,
      media_id: String(item.id),
      media_type: item.type || 'ANIME',
      title: item.title,
      english_title: item.englishTitle || null,
      poster_image: item.posterImage || '',
      banner_image: item.bannerImage || null,
      rating: typeof item.rating === 'number' ? item.rating : null,
      format: item.format || null,
      status: item.status || null,
      release_year: typeof item.releaseYear === 'number' ? item.releaseYear : null,
      genres: Array.isArray(item.genres) ? item.genres : [],
      episodes: typeof item.episodes === 'number' ? item.episodes : null,
      chapters: typeof item.chapters === 'number' ? item.chapters : null,
      studio_or_author: item.studioOrAuthor || null,
      source_provider: item.sourceProvider || null,
      media_snapshot: item,
    };

    const { data, error } = await auth.client
      .from('saved_items')
      .upsert(row, { onConflict: 'user_id,media_id' })
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: error.message,
      });
    }

    return res.status(201).json({
      status: 'ok',
      data: data || row,
    });
  } catch (err: any) {
    console.error('[API Watchlist POST Error]', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Failed to save item to watchlist',
    });
  }
});

apiRouter.delete(['/watchlist/:mediaId', '/library/:mediaId'], async (req: Request, res: Response) => {
  try {
    const auth = await getAuthenticatedUser(req);
    if (auth.error || !auth.user || !auth.client) {
      return res.status(auth.status).json({
        error: 'Unauthorized',
        message: auth.error,
      });
    }

    const mediaId = req.params.mediaId;
    if (!mediaId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing mediaId parameter',
      });
    }

    const { error } = await auth.client
      .from('saved_items')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('media_id', mediaId);

    if (error) {
      return res.status(500).json({
        error: 'Database Error',
        message: error.message,
      });
    }

    return res.json({
      status: 'ok',
      message: 'Item removed from library',
    });
  } catch (err: any) {
    console.error('[API Watchlist DELETE Error]', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Failed to delete item from watchlist',
    });
  }
});

// ----------------------------------------------------
// Universal Search Across All Media Types
// ----------------------------------------------------
apiRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const type = ((req.query.type as string) || 'ALL').toUpperCase();
    const limit = Math.min(parseIntParam(req.query.limit, 10), 30);
    const page = parseIntParam(req.query.page, 1);

    if (!q.trim()) {
      return res.json({
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, perPage: limit },
        sourceProvider: 'aggregated',
      });
    }

    if (type === 'ANIME') {
      const animeResults = await animeService.search(q, limit, page);
      return res.json(animeResults);
    } else if (type === 'MANGA') {
      const mangaResults = await mangaService.search(q, limit, page);
      return res.json(mangaResults);
    } else if (type === 'MANHWA') {
      const manhwaResults = await manhwaService.search(q, limit, page);
      return res.json(manhwaResults);
    }

    // ALL: aggregate across all 3
    const [animeRes, mangaRes, manhwaRes] = await Promise.all([
      animeService.search(q, Math.ceil(limit / 3), 1).catch(() => ({ data: [] })),
      mangaService.search(q, Math.ceil(limit / 3), 1).catch(() => ({ data: [] })),
      manhwaService.search(q, Math.ceil(limit / 3), 1).catch(() => ({ data: [] })),
    ]);

    const combined = [...animeRes.data, ...mangaRes.data, ...manhwaRes.data].slice(0, limit);

    return res.json({
      data: combined,
      pageInfo: {
        currentPage: page,
        hasNextPage: false,
        perPage: limit,
        total: combined.length,
      },
      sourceProvider: 'aggregated',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// ----------------------------------------------------
// ANIME ENDPOINTS
// (Specific routes placed before /:id)
// ----------------------------------------------------
apiRouter.get('/anime/trending', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await animeService.getTrending(limit, page);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch trending anime', message: err.message });
  }
});

apiRouter.get('/anime/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await animeService.getPopular(limit, page);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch popular anime', message: err.message });
  }
});

apiRouter.get('/anime/latest', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await animeService.getLatest(limit, page);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch latest anime', message: err.message });
  }
});

apiRouter.get('/anime/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = parseIntParam(req.query.limit, 18);
    const page = parseIntParam(req.query.page, 1);
    const result = await animeService.search(q, limit, page);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search anime', message: err.message });
  }
});

apiRouter.get('/anime', async (req: Request, res: Response) => {
  try {
    const params = extractFilterParams(req);
    const result = await animeService.getList(params);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch anime list', message: err.message });
  }
});

apiRouter.get('/anime/:id', async (req: Request, res: Response) => {
  try {
    const item = await animeService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Anime not found' });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch anime details', message: err.message });
  }
});

// ----------------------------------------------------
// MANGA ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/manga/trending', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await mangaService.getTrending(limit, page);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch trending manga', message: err.message });
  }
});

apiRouter.get('/manga/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await mangaService.getPopular(limit, page);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch popular manga', message: err.message });
  }
});

apiRouter.get('/manga/latest', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await mangaService.getLatest(limit, page);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch latest manga', message: err.message });
  }
});

apiRouter.get('/manga/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = parseIntParam(req.query.limit, 18);
    const page = parseIntParam(req.query.page, 1);
    const result = await mangaService.search(q, limit, page);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search manga', message: err.message });
  }
});

apiRouter.get('/manga', async (req: Request, res: Response) => {
  try {
    const params = extractFilterParams(req);
    const result = await mangaService.getList(params);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch manga list', message: err.message });
  }
});

apiRouter.get('/manga/:id', async (req: Request, res: Response) => {
  try {
    const item = await mangaService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Manga not found' });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch manga details', message: err.message });
  }
});

// ----------------------------------------------------
// MANHWA ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/manhwa/trending', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const items = await manhwaService.getTrending(limit);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch trending manhwa', message: err.message });
  }
});

apiRouter.get('/manhwa/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const items = await manhwaService.getPopular(limit);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch popular manhwa', message: err.message });
  }
});

apiRouter.get('/manhwa/latest', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const items = await manhwaService.getLatest(limit);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch latest manhwa', message: err.message });
  }
});

apiRouter.get('/manhwa/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = parseIntParam(req.query.limit, 18);
    const page = parseIntParam(req.query.page, 1);
    const result = await manhwaService.search(q, limit, page);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search manhwa', message: err.message });
  }
});

apiRouter.get('/manhwa', async (req: Request, res: Response) => {
  try {
    const params = extractFilterParams(req);
    const result = await manhwaService.getList(params);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch manhwa list', message: err.message });
  }
});

apiRouter.get('/manhwa/:id', async (req: Request, res: Response) => {
  try {
    const item = await manhwaService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Manhwa not found' });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch manhwa details', message: err.message });
  }
});

// ----------------------------------------------------
// NEWS ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/news/latest', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 20);
    const items = await newsService.getLatest(undefined, limit);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch latest news', message: err.message });
  }
});

apiRouter.get('/news/category/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category;
    const limit = parseIntParam(req.query.limit, 20);
    const items = await newsService.getLatest(category, limit);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch news by category', message: err.message });
  }
});

apiRouter.get('/news', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : (typeof req.query.search === 'string' ? req.query.search : undefined);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const limit = parseIntParam(req.query.limit, 20);

    if (query && query.trim()) {
      const items = await newsService.search(query.trim());
      const filtered = category && category !== 'All'
        ? items.filter((a) => a.category.toLowerCase() === category.toLowerCase())
        : items;
      return res.json(filtered.slice(0, limit));
    }

    const items = await newsService.getLatest(category, limit);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch news', message: err.message });
  }
});

apiRouter.get('/news/:id', async (req: Request, res: Response) => {
  try {
    const item = await newsService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch article details', message: err.message });
  }
});

// ----------------------------------------------------
// MangaDex Provider Endpoints
// ----------------------------------------------------
apiRouter.get('/mangadex/trending', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === 'MANHWA' ? 'MANHWA' : req.query.type === 'MANGA' ? 'MANGA' : 'ALL';
    const items = await mangadexService.getTrending(limit, page, type);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch MangaDex trending', message: err.message });
  }
});

apiRouter.get('/mangadex/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === 'MANHWA' ? 'MANHWA' : req.query.type === 'MANGA' ? 'MANGA' : 'ALL';
    const items = await mangadexService.getPopular(limit, page, type);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch MangaDex popular', message: err.message });
  }
});

apiRouter.get('/mangadex/latest', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === 'MANHWA' ? 'MANHWA' : req.query.type === 'MANGA' ? 'MANGA' : 'ALL';
    const items = await mangadexService.getLatest(limit, page, type);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch MangaDex latest', message: err.message });
  }
});

apiRouter.get('/mangadex/search', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = parseIntParam(req.query.limit, 10);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === 'MANHWA' ? 'MANHWA' : req.query.type === 'MANGA' ? 'MANGA' : 'ALL';
    const result = await mangadexService.search(query, limit, page, type);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search MangaDex', message: err.message });
  }
});

apiRouter.get('/mangadex', async (req: Request, res: Response) => {
  try {
    const filterParams = extractFilterParams(req);
    const type = req.query.type === 'MANHWA' ? 'MANHWA' : req.query.type === 'MANGA' ? 'MANGA' : 'ALL';
    const result = await mangadexService.getList(filterParams, type);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to query MangaDex list', message: err.message });
  }
});

apiRouter.get('/mangadex/:id', async (req: Request, res: Response) => {
  try {
    const item = await mangadexService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Title not found on MangaDex' });
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch MangaDex item', message: err.message });
  }
});

