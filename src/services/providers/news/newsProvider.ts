import { NewsArticle } from '../../../types/index';
import { RssNewsProvider, rssNewsProvider, AUTHORIZED_RSS_SOURCES } from './rssNewsProvider';

export interface INewsProvider {
  getLatest(category?: string, limit?: number): Promise<NewsArticle[]>;
  getById(id: string): Promise<NewsArticle | null>;
  search(query: string): Promise<NewsArticle[]>;
}

export { RssNewsProvider, rssNewsProvider, AUTHORIZED_RSS_SOURCES };

/**
 * Primary News Provider — Live Server-Side RSS Provider.
 * Connects exclusively to Anime News Network and Crunchyroll News feeds.
 */
export const newsProvider: INewsProvider = rssNewsProvider;

