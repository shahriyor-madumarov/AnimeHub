export type MediaType = 'ANIME' | 'MANGA' | 'MANHWA';

export type MediaStatus = 'Airing' | 'Completed' | 'Upcoming' | 'Publishing' | 'Hiatus';

export type NewsCategory = 'Anime' | 'Manga' | 'Manhwa' | 'Industry' | 'Announcements';

export interface Character {
  id: string;
  name: string;
  role: string;
  image: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  image?: string;
}

export interface MediaRelation {
  id: string;
  title: string;
  relationType: string;
  format?: string;
  type: MediaType;
  posterImage?: string;
}

export interface MediaRecommendation {
  id: string;
  title: string;
  posterImage: string;
  rating?: number;
  type: MediaType;
  releaseYear?: number;
  englishTitle?: string;
  romajiTitle?: string;
  russianTitle?: string;
}

export interface MediaTitle {
  english?: string;
  russian?: string;
  native?: string;
  romaji?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  englishTitle?: string;
  japaneseTitle?: string;
  russianTitle?: string;
  titles?: MediaTitle;
  type: MediaType;
  format: string; // 'TV', 'Movie', 'Manga', 'Webtoon', 'OVA'
  rating: number; // e.g. 8.9
  reviewCount?: string;
  rank?: number;
  popularity?: number;
  releaseYear: number;
  season?: 'Winter' | 'Spring' | 'Summer' | 'Fall';
  status: MediaStatus;
  genres: string[];
  synopsis: string;
  posterImage: string;
  bannerImage: string;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  duration?: string; // '24 min per ep'
  studioOrAuthor: string; // 'ufotable', 'MAPPA', 'Eiichiro Oda', 'Chugong'
  trendingRank?: number;
  isTrending?: boolean;
  isLatest?: boolean;
  isFeatured?: boolean;
  trailerEmbedId?: string;
  characters?: Character[];
  staff?: StaffMember[];
  relations?: MediaRelation[];
  recommendations?: MediaRecommendation[];
  sourceProvider?: 'anilist' | 'jikan' | 'kitsu' | 'manhwa_adapter' | 'mock' | 'mangadex';
  isAdult?: boolean;
}

export interface IAnimeProvider {
  getTrending(limit?: number, page?: number): Promise<MediaItem[]>;
  getPopular(limit?: number, page?: number): Promise<MediaItem[]>;
  getLatest(limit?: number, page?: number): Promise<MediaItem[]>;
  getList(params: FilterParams): Promise<PaginatedResponse<MediaItem>>;
  getById(id: string): Promise<MediaItem | null>;
  search(query: string, limit?: number, page?: number): Promise<PaginatedResponse<MediaItem>>;
  checkHealth(): Promise<boolean>;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug?: string;
  summary?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  coverImage?: string;
  category: NewsCategory;
  author?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  readTime?: string;
  publishedAt: string;
  featured?: boolean;
  tags?: string[];
  sourceUrl: string;
  sourceName: string;
  source?: string;
}

export interface PageInfo {
  currentPage: number;
  hasNextPage: boolean;
  total?: number;
  perPage: number;
  lastPage?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pageInfo: PageInfo;
  sourceProvider: string;
}

export interface FilterParams {
  search?: string;
  genre?: string;
  status?: string;
  format?: string;
  season?: string;
  year?: number;
  sort?: string;
  page?: number;
  perPage?: number;
}

export interface FilterState {
  searchQuery: string;
  type?: MediaType | 'ALL';
  genre?: string;
  status?: string;
  sortBy?: 'trending' | 'rating' | 'latest' | 'title';
  year?: string;
}

export interface WatchlistItem {
  mediaId: string;
  addedAt: string;
  status: 'watching' | 'plan_to_watch' | 'completed';
}

export interface UserProfileRow {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SavedItemRow {
  id?: string;
  user_id: string;
  media_id: string;
  media_type: MediaType;
  title: string;
  english_title?: string | null;
  poster_image: string;
  banner_image?: string | null;
  rating?: number | null;
  format?: string | null;
  status?: string | null;
  release_year?: number | null;
  genres?: string[] | null;
  episodes?: number | null;
  chapters?: number | null;
  studio_or_author?: string | null;
  source_provider?: string | null;
  media_snapshot?: MediaItem | null;
  created_at?: string;
  updated_at?: string;
}
