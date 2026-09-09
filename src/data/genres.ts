/**
 * Canonical AniList genres supported by AnimeHub.
 */
export const ANILIST_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
] as const;

export type GenreType = (typeof ANILIST_GENRES)[number];

export const MANGA_GENRES = [...ANILIST_GENRES];

export const MANHWA_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Mystery',
  'Supernatural',
  'Sports',
  'Sci-Fi',
  'Romance',
  'Horror',
  'Thriller',
  'Martial Arts',
  'Murim',
  'Isekai',
] as const;
