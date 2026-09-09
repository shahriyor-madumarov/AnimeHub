import { NewsArticle, NewsCategory } from '../../../types/index';
import { INewsProvider } from './newsProvider';
import { isValidNewsImage } from '../../../lib/newsImage';
import { mockNewsList } from '../../../data/mockData';

/**
 * STRICTLY ALLOWLISTED NEWS SOURCES (Server-side RSS only).
 * Exactly the two authorized feeds specified in project requirements:
 * 1. Anime News Network: https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us
 * 2. Crunchyroll News: https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss
 */
export interface RssFeedConfig {
  readonly name: 'Anime News Network' | 'Crunchyroll News';
  readonly url: string;
  readonly defaultCategory: NewsCategory;
}

export const AUTHORIZED_RSS_SOURCES: readonly RssFeedConfig[] = [
  {
    name: 'Anime News Network',
    url: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us',
    defaultCategory: 'Anime',
  },
  {
    name: 'Crunchyroll News',
    url: 'https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss',
    defaultCategory: 'Anime',
  },
] as const;

/**
 * Decodes XML/HTML entities and CDATA blocks into clean plain text.
 */
function decodeEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return !isNaN(code) && code > 0 ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return !isNaN(code) && code > 0 ? String.fromCharCode(code) : '';
    })
    .trim();
}

/**
 * Strips HTML markup, tags, and collapse repeated whitespace.
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safely extracts tags from XML item block.
 */
function getTagContent(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Extracts real, authentic source image provided directly by the RSS feed.
 * Strictly avoids random or placeholder image generation.
 */
function extractRealSourceImage(itemXml: string): string | undefined {
  // 1. Check <media:thumbnail url="..." />
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["'](https?:\/\/[^"']+)["']/i);
  if (thumbMatch && isValidNewsImage(thumbMatch[1])) {
    return thumbMatch[1].trim();
  }

  // 2. Check <media:content url="..." />
  const mediaMatch = itemXml.match(/<media:content[^>]+url=["'](https?:\/\/[^"']+)["']/i);
  if (mediaMatch && isValidNewsImage(mediaMatch[1])) {
    return mediaMatch[1].trim();
  }

  // 3. Check <enclosure url="..." type="image/..." />
  const encMatch =
    itemXml.match(/<enclosure[^>]+url=["'](https?:\/\/[^"']+)["'][^>]*type=["']image\/[^"']*["']/i) ||
    itemXml.match(/<enclosure[^>]+type=["']image\/[^"']*["'][^>]*url=["'](https?:\/\/[^"']+)["']/i);
  if (encMatch && isValidNewsImage(encMatch[1])) {
    return encMatch[1].trim();
  }

  // 4. Check real <img> tags inside content:encoded or description
  const imgMatch = itemXml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch && isValidNewsImage(imgMatch[1])) {
    return imgMatch[1].trim();
  }

  return undefined;
}

/**
 * Classifies an article into the canonical NewsCategory enum.
 */
function resolveCategory(rawCategory: string, title: string, content: string): NewsCategory {
  const combined = `${rawCategory} ${title} ${content}`.toLowerCase();
  if (combined.includes('manhwa') || combined.includes('webtoon')) return 'Manhwa';
  if (combined.includes('manga')) return 'Manga';
  if (
    combined.includes('industry') ||
    combined.includes('business') ||
    combined.includes('box office') ||
    combined.includes('financial') ||
    combined.includes('market') ||
    combined.includes('corporate')
  ) {
    return 'Industry';
  }
  if (
    combined.includes('announcement') ||
    combined.includes('release date') ||
    combined.includes('premiere') ||
    combined.includes('reveals') ||
    combined.includes('unveils') ||
    combined.includes('convention') ||
    combined.includes('awards')
  ) {
    return 'Announcements';
  }
  return 'Anime';
}

/**
 * Generates a stable deterministic ID and slug from sourceUrl or title.
 */
function generateDeterministicId(sourceName: string, sourceUrl: string, title: string): string {
  const prefix = sourceName.includes('Crunchyroll') ? 'cr' : 'ann';
  try {
    const parsed = new URL(sourceUrl);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.length >= 3) {
      const sanitized = lastPart.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (sanitized) return `${prefix}-${sanitized}`;
    }
  } catch {
    // fallback to title hash
  }

  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  let hash = 0;
  for (let i = 0; i < sourceUrl.length; i++) {
    hash = (hash << 5) - hash + sourceUrl.charCodeAt(i);
    hash |= 0;
  }
  const hashStr = Math.abs(hash).toString(36);
  return `${prefix}-${titleSlug || 'article'}-${hashStr}`;
}

/**
 * Parses raw RSS XML string into validated NewsArticle objects.
 */
export function parseRssFeed(xml: string, source: RssFeedConfig): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const rawItems = xml.split(/<item[\s>]/i).slice(1);

  for (const itemBlock of rawItems) {
    const raw = itemBlock.split(/<\/item>/i)[0];
    if (!raw) continue;

    const rawTitle = getTagContent(raw, 'title');
    const title = decodeEntities(rawTitle);
    if (!title) continue;

    const rawLink = getTagContent(raw, 'link') || getTagContent(raw, 'guid');
    const sourceUrl = decodeEntities(rawLink).trim();
    if (!sourceUrl) continue;

    const rawDesc = getTagContent(raw, 'description');
    const rawContent = getTagContent(raw, 'content:encoded') || rawDesc;
    const plainDesc = stripHtml(decodeEntities(rawDesc));
    const plainContent = stripHtml(decodeEntities(rawContent));
    const summary = plainDesc || plainContent.slice(0, 240);
    const excerpt = (summary.length > 200 ? summary.slice(0, 197) + '...' : summary) || title;

    const rawPubDate =
      getTagContent(raw, 'pubDate') ||
      getTagContent(raw, 'dc:date') ||
      getTagContent(raw, 'updated');
    let publishedAt: string;
    try {
      const parsed = new Date(rawPubDate);
      publishedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    } catch {
      publishedAt = new Date().toISOString();
    }

    const rawAuthor = getTagContent(raw, 'author') || getTagContent(raw, 'dc:creator');
    const authorName = decodeEntities(rawAuthor) || source.name;

    const rawCategory = getTagContent(raw, 'category');
    const category = resolveCategory(rawCategory, title, plainContent);

    // Extract tags from <category> occurrences
    const categoryMatches = raw.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
    const tags = Array.from(
      new Set(
        categoryMatches
          .map((c) => decodeEntities(c.replace(/<\/?category[^>]*>/gi, '').trim()))
          .filter((t) => t.length > 0 && t.length < 40)
      )
    );
    if (!tags.includes(source.name)) {
      tags.unshift(source.name);
    }

    // Source image provided directly by RSS feed (NO random images)
    const realImg = extractRealSourceImage(raw);

    const id = generateDeterministicId(source.name, sourceUrl, title);
    const words = (plainContent || summary).split(/\s+/).length;
    const readMinutes = Math.max(1, Math.round(words / 180));
    const readTime = `${readMinutes} min read`;

    articles.push({
      id,
      title,
      slug: id,
      summary,
      excerpt,
      content: decodeEntities(rawContent) || summary,
      image: realImg,
      coverImage: realImg,
      category,
      author: {
        name: authorName,
        role: 'Editorial Staff',
      },
      readTime,
      publishedAt,
      tags,
      sourceUrl,
      sourceName: source.name,
      source: source.name,
    });
  }

  return articles;
}

/**
 * Server-Side RSS News Provider.
 * Fetches exclusively from authorized Anime News Network and Crunchyroll News endpoints.
 * The browser never connects directly to RSS feeds.
 */
export class RssNewsProvider implements INewsProvider {
  private cache: {
    articles: NewsArticle[];
    lastFetched: number;
  } = {
    articles: [],
    lastFetched: 0,
  };

  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes in-memory TTL
  private fetchPromise: Promise<NewsArticle[]> | null = null;
  private feedCooldowns = new Map<string, number>();

  /**
   * Fetches an individual RSS feed using Node.js fetch with safety timeout.
   */
  private async fetchSingleFeed(source: RssFeedConfig): Promise<NewsArticle[]> {
    const cooldownUntil = this.feedCooldowns.get(source.url);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AnimeHub/1.0 NewsReader',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        // Apply cooldown on blocked or rate-limited feeds
        const cooldown = response.status === 403 || response.status === 401 ? 15 * 60 * 1000 : 5 * 60 * 1000;
        this.feedCooldowns.set(source.url, Date.now() + cooldown);
        console.info(
          `[RssNewsProvider] ${source.name} RSS feed temporarily unavailable (HTTP ${response.status}). Using cooldown.`
        );
        return [];
      }

      const xmlText = await response.text();
      const parsed = parseRssFeed(xmlText, source);
      return parsed;
    } catch (err: any) {
      this.feedCooldowns.set(source.url, Date.now() + 5 * 60 * 1000);
      console.info(
        `[RssNewsProvider] Skipping feed ${source.name}: ${err.name === 'AbortError' ? 'timeout' : err.message}`
      );
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetches all authorized RSS feeds in parallel, deduplicating and sorting newest first.
   */
  private async fetchAllFeeds(forceRefresh = false): Promise<NewsArticle[]> {
    const now = Date.now();
    if (!forceRefresh && this.cache.articles.length > 0 && now - this.cache.lastFetched < this.cacheTtlMs) {
      return this.cache.articles;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const feedResults = await Promise.allSettled(
          AUTHORIZED_RSS_SOURCES.map((source) => this.fetchSingleFeed(source))
        );

        const combined: NewsArticle[] = [];
        const seenUrls = new Set<string>();

        for (const result of feedResults) {
          if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            for (const article of result.value) {
              const urlKey = article.sourceUrl.toLowerCase();
              if (!seenUrls.has(urlKey)) {
                seenUrls.add(urlKey);
                combined.push(article);
              }
            }
          }
        }

        // If all remote feeds were unavailable or empty, fall back gracefully to curated articles
        if (combined.length === 0 && mockNewsList.length > 0) {
          combined.push(...mockNewsList);
        }

        // Sort chronologically descending (newest articles first)
        combined.sort((a, b) => {
          const timeA = new Date(a.publishedAt).getTime() || 0;
          const timeB = new Date(b.publishedAt).getTime() || 0;
          return timeB - timeA;
        });

        if (combined.length > 0) {
          this.cache = {
            articles: combined,
            lastFetched: Date.now(),
          };
        }

        return this.cache.articles;
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  /**
   * Returns latest news articles filtered optionally by category.
   */
  async getLatest(category?: string, limit = 20): Promise<NewsArticle[]> {
    const all = await this.fetchAllFeeds();
    let filtered = all;

    if (category && category !== 'All') {
      filtered = filtered.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase()
      );
    }

    return filtered.slice(0, limit);
  }

  /**
   * Finds a specific news article by ID, slug, or sourceUrl.
   */
  async getById(id: string): Promise<NewsArticle | null> {
    const all = await this.fetchAllFeeds();
    const query = id.toLowerCase().trim();

    const match = all.find(
      (a) =>
        a.id.toLowerCase() === query ||
        (a.slug && a.slug.toLowerCase() === query) ||
        a.sourceUrl.toLowerCase() === query
    );

    return match || null;
  }

  /**
   * Searches news articles by query across title, summary, excerpt, and tags.
   */
  async search(query: string): Promise<NewsArticle[]> {
    const all = await this.fetchAllFeeds();
    const q = query.toLowerCase().trim();
    if (!q) return all;

    return all.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }
}

export const rssNewsProvider = new RssNewsProvider();
