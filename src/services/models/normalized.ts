import {
  MediaItem,
  MediaType,
  MediaStatus,
  Character,
  StaffMember,
  MediaRelation,
  MediaRecommendation,
} from '../../types/index';
import {
  isValidMediaCoverImage,
  getSafeCoverImage,
  getSafeBannerImage,
  ANIMEHUB_COVER_FALLBACK,
  ANIMEHUB_BANNER_FALLBACK,
  ANIMEHUB_AVATAR_FALLBACK,
} from '../../lib/mediaImage';

/**
 * Strips HTML formatting tags returned by AniList descriptions.
 */
export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Formats a count into a human-readable abbreviation (e.g. 150000 -> 150K).
 */
export function formatCount(count?: number | null): string | undefined {
  if (!count) return undefined;
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K`;
  }
  return String(count);
}

/**
 * Validates that an anime/media cover image is a genuine, real image URL from AniList, Jikan, or MangaDex
 * and NOT a random/placeholder/Unsplash/Pexels/dummy image.
 */
export function isValidAnimeCoverImage(url?: string | null): boolean {
  return isValidMediaCoverImage(url);
}

/**
 * Normalizes an AniList Media object into the internal MediaItem model.
 */
export function normalizeAniListMedia(media: any, overrideType?: MediaType): MediaItem {
  const isAnime = media.type === 'ANIME' || overrideType === 'ANIME';
  const type: MediaType = overrideType || (isAnime ? 'ANIME' : 'MANGA');

  // Format mapping
  let format = media.format || (isAnime ? 'TV Series' : 'Manga');
  if (format === 'TV') format = 'TV Series';
  else if (format === 'TV_SHORT') format = 'TV Short';
  else if (format === 'MOVIE') format = 'Movie';
  else if (format === 'SPECIAL') format = 'Special';
  else if (format === 'ONE_SHOT') format = 'One Shot';

  // Status mapping
  let status: MediaStatus = 'Completed';
  if (media.status === 'RELEASING') {
    status = isAnime ? 'Airing' : 'Publishing';
  } else if (media.status === 'NOT_YET_RELEASED') {
    status = 'Upcoming';
  } else if (media.status === 'HIATUS') {
    status = 'Hiatus';
  }

  // Rating mapping (AniList 0-100 scale -> 0-10 scale)
  const rawScore = media.averageScore ?? media.meanScore;
  const rating = rawScore ? Math.round((rawScore / 10) * 10) / 10 : 8.0;

  // Primary studio or author
  let studioOrAuthor = 'Unknown Studio';
  if (isAnime) {
    const animationStudio = media.studios?.nodes?.find((s: any) => s.isAnimationStudio);
    studioOrAuthor = animationStudio?.name || media.studios?.nodes?.[0]?.name || 'Studio';
  } else {
    const mainAuthor = media.staff?.edges?.find((e: any) => {
      const role = (e.role || '').toLowerCase();
      return role.includes('story') || role.includes('art') || role.includes('author');
    });
    studioOrAuthor = mainAuthor?.node?.name?.full || media.staff?.nodes?.[0]?.name?.full || 'Mangaka';
  }

  // Season mapping
  let season: 'Winter' | 'Spring' | 'Summer' | 'Fall' | undefined;
  if (media.season === 'WINTER') season = 'Winter';
  else if (media.season === 'SPRING') season = 'Spring';
  else if (media.season === 'SUMMER') season = 'Summer';
  else if (media.season === 'FALL') season = 'Fall';

  // Characters
  const characters: Character[] = (media.characters?.edges || [])
    .slice(0, 10)
    .map((edge: any, index: number) => ({
      id: String(edge.node?.id || index),
      name: edge.node?.name?.full || 'Unknown Character',
      role: edge.role || 'Main Protagonist',
      image:
        edge.node?.image?.large ||
        edge.node?.image?.medium ||
        ANIMEHUB_AVATAR_FALLBACK,
    }));

  // Staff
  const staff: StaffMember[] = (media.staff?.edges || [])
    .slice(0, 8)
    .map((edge: any, index: number) => ({
      id: String(edge.node?.id || index),
      name: edge.node?.name?.full || 'Staff',
      role: edge.role || 'Production Staff',
      image: edge.node?.image?.large || edge.node?.image?.medium,
    }));

  // Relations
  const relations: MediaRelation[] = (media.relations?.edges || [])
    .filter((edge: any) => edge.node)
    .slice(0, 6)
    .map((edge: any) => ({
      id: String(edge.node.id),
      title: edge.node.title?.english || edge.node.title?.romaji || 'Related Title',
      relationType: (edge.relationType || 'RELATED').replace(/_/g, ' '),
      format: edge.node.format,
      type: edge.node.type === 'ANIME' ? 'ANIME' : 'MANGA',
      posterImage: edge.node.coverImage?.large || edge.node.coverImage?.medium,
    }));

  // Recommendations: ONLY use real coverImage returned by AniList.
  // If a recommendation has no valid coverImage, hide that recommendation.
  const recommendations: MediaRecommendation[] = (media.recommendations?.nodes || [])
    .filter((node: any) => Boolean(node && node.mediaRecommendation))
    .map((node: any) => {
      const recMedia = node.mediaRecommendation;
      const recScore = recMedia.averageScore ?? recMedia.meanScore;
      const rawCover =
        recMedia.coverImage?.extraLarge ||
        recMedia.coverImage?.large ||
        recMedia.coverImage?.medium;

      const englishTitle = recMedia.title?.english || undefined;
      const romajiTitle = recMedia.title?.romaji || undefined;
      const nativeTitle = recMedia.title?.native || undefined;
      const title = englishTitle || romajiTitle || nativeTitle || 'Recommendation';

      return {
        id: String(recMedia.id),
        title,
        englishTitle,
        romajiTitle,
        posterImage: typeof rawCover === 'string' ? rawCover.trim() : '',
        rating: recScore ? Math.round((recScore / 10) * 10) / 10 : undefined,
        type: (recMedia.type === 'MANGA' ? 'MANGA' : 'ANIME') as MediaType,
        releaseYear: recMedia.startDate?.year || undefined,
      };
    })
    .filter((rec: MediaRecommendation) => isValidAnimeCoverImage(rec.posterImage))
    .slice(0, 6);

  const rawPoster =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.coverImage?.medium;

  const posterImage = getSafeCoverImage(rawPoster);

  const rawBanner =
    media.bannerImage ||
    media.coverImage?.extraLarge ||
    rawPoster;

  const bannerImage = getSafeBannerImage(rawBanner, posterImage);

  const trailerEmbedId =
    media.trailer?.site === 'youtube' ? media.trailer.id : undefined;

  const cyrillicRegex = /[\u0400-\u04FF]/;
  const russianTitle = Array.isArray(media.synonyms)
    ? media.synonyms.find((s: string) => cyrillicRegex.test(s))
    : undefined;

  return {
    id: String(media.id),
    title: media.title?.english || media.title?.romaji || media.title?.native || 'Untitled',
    englishTitle: media.title?.english || undefined,
    japaneseTitle: media.title?.native || undefined,
    russianTitle: russianTitle || undefined,
    titles: {
      english: media.title?.english || undefined,
      russian: russianTitle || undefined,
      native: media.title?.native || undefined,
      romaji: media.title?.romaji || undefined,
    },
    type,
    format,
    rating,
    reviewCount: formatCount(media.popularity),
    rank: media.rankings?.[0]?.rank,
    popularity: media.popularity,
    releaseYear: media.startDate?.year || media.seasonYear || new Date().getFullYear(),
    season,
    status,
    genres: Array.isArray(media.genres) ? media.genres : [],
    synopsis: stripHtml(media.description),
    posterImage,
    bannerImage,
    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,
    duration: media.duration ? `${media.duration} min` : undefined,
    studioOrAuthor,
    trailerEmbedId,
    characters: characters.length > 0 ? characters : undefined,
    staff: staff.length > 0 ? staff : undefined,
    relations: relations.length > 0 ? relations : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    sourceProvider: 'anilist',
    isAdult: media.isAdult ?? false,
  };
}

/**
 * Normalizes a Jikan API v4 Anime item into the internal MediaItem model.
 */
export function normalizeJikanAnime(data: any): MediaItem {
  let status: MediaStatus = 'Completed';
  if (data.status === 'Currently Airing') status = 'Airing';
  else if (data.status === 'Not yet aired') status = 'Upcoming';

  const rawPoster =
    data.images?.webp?.large_image_url ||
    data.images?.jpg?.large_image_url;

  const posterImage = getSafeCoverImage(rawPoster);

  const rawBanner =
    data.images?.jpg?.large_image_url ||
    rawPoster;

  const bannerImage = getSafeBannerImage(rawBanner, posterImage);

  let season: 'Winter' | 'Spring' | 'Summer' | 'Fall' | undefined;
  if (data.season) {
    const s = data.season.toLowerCase();
    if (s === 'winter') season = 'Winter';
    else if (s === 'spring') season = 'Spring';
    else if (s === 'summer') season = 'Summer';
    else if (s === 'fall') season = 'Fall';
  }

  const genres = (data.genres || []).map((g: any) => g.name).filter(Boolean);

  const cyrillicRegex = /[\u0400-\u04FF]/;
  let russianTitle: string | undefined;
  if (Array.isArray(data.titles)) {
    const ruObj = data.titles.find(
      (t: any) => t.type === 'Russian' || (t.title && cyrillicRegex.test(t.title))
    );
    if (ruObj) russianTitle = ruObj.title;
  }
  if (!russianTitle && Array.isArray(data.title_synonyms)) {
    russianTitle = data.title_synonyms.find((s: string) => cyrillicRegex.test(s));
  }

  // Recommendations for Jikan (if present in full object or recommendations array)
  const rawJikanRecs = Array.isArray(data.recommendations)
    ? data.recommendations
    : Array.isArray(data.recommendation_entries)
    ? data.recommendation_entries
    : [];

  const recommendations: MediaRecommendation[] = rawJikanRecs
    .map((item: any) => {
      const entry = item.entry || item;
      const rawCover =
        entry.images?.webp?.large_image_url ||
        entry.images?.jpg?.large_image_url ||
        entry.images?.webp?.image_url ||
        entry.images?.jpg?.image_url;

      return {
        id: String(entry.mal_id || entry.id || ''),
        title: entry.title || 'Recommendation',
        englishTitle: entry.title || undefined,
        posterImage: typeof rawCover === 'string' ? rawCover.trim() : '',
        type: 'ANIME' as MediaType,
      };
    })
    .filter((rec: MediaRecommendation) => Boolean(rec.id) && isValidAnimeCoverImage(rec.posterImage))
    .slice(0, 6);

  return {
    id: String(data.mal_id),
    title: data.title_english || data.title || 'Untitled',
    englishTitle: data.title_english || undefined,
    japaneseTitle: data.title_japanese || undefined,
    russianTitle: russianTitle || undefined,
    titles: {
      english: data.title_english || undefined,
      russian: russianTitle || undefined,
      native: data.title_japanese || undefined,
      romaji: data.title || undefined,
    },
    type: 'ANIME',
    format: data.type || 'TV Series',
    rating: typeof data.score === 'number' ? Math.round(data.score * 10) / 10 : 8.0,
    reviewCount: formatCount(data.members),
    rank: data.rank,
    popularity: data.popularity,
    releaseYear: data.year || data.aired?.prop?.from?.year || new Date().getFullYear(),
    season,
    status,
    genres,
    synopsis: stripHtml(data.synopsis),
    posterImage,
    bannerImage,
    episodes: data.episodes,
    duration: data.duration,
    studioOrAuthor: data.studios?.[0]?.name || 'Studio',
    trailerEmbedId: data.trailer?.youtube_id || undefined,
    sourceProvider: 'jikan',
    isAdult: data.rating?.includes('R18') || data.rating?.includes('Rx') || false,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

/**
 * Normalizes a Kitsu API Anime item into the internal MediaItem model.
 */
export function normalizeKitsuAnime(raw: any, included?: any[]): MediaItem {
  const attr = raw.attributes || {};

  // Status mapping
  let status: MediaStatus = 'Completed';
  if (attr.status === 'current') status = 'Airing';
  else if (attr.status === 'upcoming' || attr.status === 'unreleased' || attr.status === 'tba') status = 'Upcoming';

  // Format mapping
  const subtype = (attr.subtype || '').toLowerCase();
  let format = 'TV Series';
  if (subtype === 'movie') format = 'Movie';
  else if (subtype === 'ova') format = 'OVA';
  else if (subtype === 'ona') format = 'ONA';
  else if (subtype === 'special') format = 'Special';
  else if (attr.subtype) format = attr.subtype;

  // Rating mapping (Kitsu 0-100 scale string -> 0-10 scale)
  const numScore = parseFloat(attr.averageRating);
  const rating = !isNaN(numScore) && numScore > 0 ? Math.round((numScore / 10) * 10) / 10 : 8.0;

  // Images
  const rawPoster =
    attr.posterImage?.large ||
    attr.posterImage?.original ||
    attr.posterImage?.medium ||
    attr.posterImage?.small;
  const posterImage = getSafeCoverImage(rawPoster);

  const rawBanner =
    attr.coverImage?.large ||
    attr.coverImage?.original ||
    attr.coverImage?.small ||
    rawPoster;
  const bannerImage = getSafeBannerImage(rawBanner, posterImage);

  // Titles
  const titles = attr.titles || {};
  const canonical = attr.canonicalTitle || '';
  const englishTitle = titles.en || titles.en_us || undefined;
  const japaneseTitle = titles.ja_jp || undefined;
  const romajiTitle = titles.en_jp || canonical || undefined;

  const cyrillicRegex = /[\u0400-\u04FF]/;
  let russianTitle: string | undefined;
  if (Array.isArray(attr.abbreviatedTitles)) {
    russianTitle = attr.abbreviatedTitles.find((t: string) => cyrillicRegex.test(t));
  }

  const title = englishTitle || canonical || romajiTitle || 'Untitled';

  // Genres from categories relationships (if included provided)
  const genres: string[] = [];
  if (Array.isArray(included) && included.length > 0) {
    const categoryMap = new Map<string, string>();
    for (const inc of included) {
      if (inc.type === 'categories' && inc.attributes?.title) {
        categoryMap.set(String(inc.id), inc.attributes.title);
      }
    }
    const catRelData = raw.relationships?.categories?.data;
    if (Array.isArray(catRelData)) {
      for (const rel of catRelData) {
        const catTitle = categoryMap.get(String(rel.id));
        if (catTitle && !genres.includes(catTitle)) {
          genres.push(catTitle);
        }
      }
    }
  }

  // Season mapping
  let season: 'Winter' | 'Spring' | 'Summer' | 'Fall' | undefined;
  if (attr.startDate && typeof attr.startDate === 'string') {
    const month = parseInt(attr.startDate.substring(5, 7), 10);
    if (month >= 1 && month <= 3) season = 'Winter';
    else if (month >= 4 && month <= 6) season = 'Spring';
    else if (month >= 7 && month <= 9) season = 'Summer';
    else if (month >= 10 && month <= 12) season = 'Fall';
  }

  // Release year
  let releaseYear = new Date().getFullYear();
  if (attr.startDate && typeof attr.startDate === 'string') {
    const parsedYear = parseInt(attr.startDate.substring(0, 4), 10);
    if (!isNaN(parsedYear)) releaseYear = parsedYear;
  }

  // Recommendations from included mediaRelationships destination
  const recommendations: MediaRecommendation[] = [];
  if (Array.isArray(included) && included.length > 0) {
    for (const inc of included) {
      if (inc.type === 'anime' || inc.type === 'manga') {
        const destAttr = inc.attributes || {};
        const destPoster = destAttr.posterImage?.large || destAttr.posterImage?.medium || destAttr.posterImage?.original;
        if (isValidMediaCoverImage(destPoster)) {
          const destScore = parseFloat(destAttr.averageRating);
          recommendations.push({
            id: String(inc.id),
            title: destAttr.canonicalTitle || destAttr.titles?.en || 'Recommendation',
            englishTitle: destAttr.titles?.en || undefined,
            posterImage: String(destPoster).trim(),
            rating: !isNaN(destScore) && destScore > 0 ? Math.round((destScore / 10) * 10) / 10 : undefined,
            type: inc.type === 'manga' ? 'MANGA' : 'ANIME',
            releaseYear: destAttr.startDate ? parseInt(destAttr.startDate.substring(0, 4), 10) : undefined,
          });
        }
      }
    }
  }

  return {
    id: String(raw.id),
    title,
    englishTitle,
    japaneseTitle,
    russianTitle,
    titles: {
      english: englishTitle,
      russian: russianTitle,
      native: japaneseTitle,
      romaji: romajiTitle,
    },
    type: 'ANIME',
    format,
    rating,
    reviewCount: formatCount(attr.userCount),
    rank: attr.ratingRank || attr.popularityRank || undefined,
    popularity: attr.userCount || undefined,
    releaseYear,
    season,
    status,
    genres,
    synopsis: stripHtml(attr.synopsis || attr.description || ''),
    posterImage,
    bannerImage,
    episodes: typeof attr.episodeCount === 'number' ? attr.episodeCount : undefined,
    duration: attr.episodeLength ? `${attr.episodeLength} min` : undefined,
    studioOrAuthor: 'Animation Studio',
    trailerEmbedId: attr.youtubeVideoId ? String(attr.youtubeVideoId).trim() : undefined,
    sourceProvider: 'kitsu',
    isAdult: attr.nsfw === true || attr.ageRating === 'R18' || false,
    recommendations: recommendations.length > 0 ? recommendations.slice(0, 6) : undefined,
  };
}
