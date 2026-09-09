/**
 * Safety content filter utility.
 * Enforces strict safe-for-work guidelines across all providers and media types.
 */

const BANNED_GENRES = new Set([
  'hentai',
  'erotica',
  'adult',
  'smut',
  'pornographic',
]);

const BANNED_TITLE_WORDS = [
  'hentai',
  'uncensored erotica',
  'sex life',
  'xxx',
  'doujinshi 18+',
];

export interface SafetyCheckable {
  isAdult?: boolean;
  genres?: string[];
  title?: string;
  synopsis?: string;
  tags?: string[];
}

/**
 * Validates that an item is safe for work across all providers and queries.
 */
export function isSafeContent(item?: SafetyCheckable | null, allowGenre?: string): boolean {
  if (!item) return false;

  // 1. Direct adult flag check
  if (item.isAdult === true) {
    return false;
  }

  // 2. Genre inspection
  if (Array.isArray(item.genres)) {
    for (const genre of item.genres) {
      const g = genre.toLowerCase().trim();
      if (BANNED_GENRES.has(g)) {
        return false;
      }
    }
  }

  // 3. Tag inspection
  if (Array.isArray(item.tags)) {
    for (const tag of item.tags) {
      const t = tag.toLowerCase().trim();
      if (BANNED_GENRES.has(t)) {
        return false;
      }
    }
  }

  // 4. Title keyword filtering
  if (item.title) {
    const lowerTitle = item.title.toLowerCase();
    for (const banned of BANNED_TITLE_WORDS) {
      if (lowerTitle.includes(banned)) {
        return false;
      }
    }
  }

  return true;
}
