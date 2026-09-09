import { MediaItem, MediaType, MediaStatus } from '../../../types/index';
import { stripHtml, formatCount } from '../../models/normalized';

export interface MangaDexMangaItem {
  id: string;
  type: string;
  attributes: {
    title: Record<string, string>;
    altTitles?: Array<Record<string, string>>;
    description?: Record<string, string>;
    status?: string;
    year?: number;
    contentRating?: string;
    originalLanguage?: string;
    lastVolume?: string;
    lastChapter?: string;
    publicationDemographic?: string;
    createdAt?: string;
    updatedAt?: string;
    tags?: Array<{
      id: string;
      type: string;
      attributes: {
        name: Record<string, string>;
        group?: string;
      };
    }>;
  };
  relationships?: Array<{
    id: string;
    type: string;
    attributes?: Record<string, any>;
  }>;
}

export interface MangaDexStats {
  rating?: {
    average?: number;
    bayesian?: number;
  };
  follows?: number;
}

import {
  ANIMEHUB_COVER_FALLBACK,
  ANIMEHUB_BANNER_FALLBACK,
} from '../../../lib/mediaImage';

const FALLBACK_POSTER = ANIMEHUB_COVER_FALLBACK;
const FALLBACK_BANNER = ANIMEHUB_BANNER_FALLBACK;

/**
 * Normalizes a MangaDex API item into the standard AnimeHub MediaItem structure.
 */
export function normalizeMangaDexMedia(
  manga: MangaDexMangaItem,
  stats?: MangaDexStats,
  overrideType?: MediaType
): MediaItem {
  const attrs = manga.attributes || ({} as any);
  const origLang = (attrs.originalLanguage || '').toLowerCase();

  // Determine Media Type & Format
  let type: MediaType = overrideType || 'MANGA';
  let format = 'Manga';

  if (overrideType === 'MANHWA' || origLang === 'ko') {
    type = 'MANHWA';
    format = 'Webtoon';
  } else if (origLang === 'zh' || origLang === 'zh-hk') {
    type = 'MANGA';
    format = 'Manhua';
  } else {
    type = overrideType || 'MANGA';
    format = 'Manga';
  }

  // Title resolution
  const titleObj = attrs.title || {};
  const altTitles = attrs.altTitles || [];

  const englishTitle =
    titleObj['en'] ||
    altTitles.find((t) => t.en)?.en ||
    undefined;

  const japaneseTitle =
    titleObj['ja'] ||
    titleObj['ja-ro'] ||
    altTitles.find((t) => t.ja)?.ja ||
    altTitles.find((t) => t['ja-ro'])?.['ja-ro'] ||
    undefined;

  const russianTitle =
    titleObj['ru'] ||
    altTitles.find((t) => t.ru)?.ru ||
    undefined;

  const primaryTitle =
    englishTitle ||
    titleObj['ja-ro'] ||
    titleObj['ko-ro'] ||
    Object.values(titleObj)[0] ||
    'Untitled Manga';

  // Status resolution
  let status: MediaStatus = 'Completed';
  const rawStatus = (attrs.status || '').toLowerCase();
  if (rawStatus === 'ongoing') {
    status = 'Publishing';
  } else if (rawStatus === 'hiatus') {
    status = 'Hiatus';
  } else if (rawStatus === 'completed' || rawStatus === 'cancelled') {
    status = 'Completed';
  }

  // Cover image from relationships
  const coverRel = manga.relationships?.find((r) => r.type === 'cover_art');
  const coverFileName = coverRel?.attributes?.fileName;

  let posterImage = FALLBACK_POSTER;
  let bannerImage = FALLBACK_BANNER;

  if (coverFileName) {
    posterImage = `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`;
    bannerImage = `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}`;
  }

  // Author / Artist from relationships
  const authorRel = manga.relationships?.find((r) => r.type === 'author');
  const artistRel = manga.relationships?.find((r) => r.type === 'artist');
  const studioOrAuthor =
    authorRel?.attributes?.name ||
    artistRel?.attributes?.name ||
    'MangaDex';

  // Genres from tags
  const genres = (attrs.tags || [])
    .map((t) => t.attributes?.name?.en)
    .filter((name): name is string => Boolean(name));

  // Rating and Popularity
  const rawScore = stats?.rating?.bayesian || stats?.rating?.average;
  const rating = rawScore ? Math.round(rawScore * 10) / 10 : 8.2;
  const popularity = stats?.follows || 0;

  // Release year
  let releaseYear = attrs.year;
  if (!releaseYear && attrs.createdAt) {
    const d = new Date(attrs.createdAt);
    if (!isNaN(d.getTime())) {
      releaseYear = d.getFullYear();
    }
  }
  if (!releaseYear) {
    releaseYear = new Date().getFullYear();
  }

  // Synopsis
  const rawSynopsis =
    attrs.description?.en ||
    attrs.description?.ru ||
    (attrs.description ? Object.values(attrs.description)[0] : '') ||
    '';

  const isAdult =
    attrs.contentRating === 'erotica' ||
    attrs.contentRating === 'pornographic';

  return {
    id: manga.id,
    title: primaryTitle,
    englishTitle,
    japaneseTitle,
    russianTitle,
    titles: {
      english: englishTitle,
      russian: russianTitle,
      native: japaneseTitle || titleObj['ko'] || undefined,
      romaji: titleObj['ja-ro'] || titleObj['ko-ro'] || undefined,
    },
    type,
    format,
    rating,
    reviewCount: formatCount(popularity),
    popularity,
    releaseYear,
    status,
    genres,
    synopsis: stripHtml(rawSynopsis),
    posterImage,
    bannerImage,
    chapters: attrs.lastChapter ? parseInt(attrs.lastChapter, 10) || undefined : undefined,
    volumes: attrs.lastVolume ? parseInt(attrs.lastVolume, 10) || undefined : undefined,
    studioOrAuthor,
    sourceProvider: 'mangadex',
    isAdult,
  };
}
