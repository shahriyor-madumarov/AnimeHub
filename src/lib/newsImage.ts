import { NewsArticle } from '../types';

/**
 * High-definition, dark-themed programmatic AnimeHub News fallback graphic.
 * Designed to seamlessly blend with the AnimeHub obsidian/slate editorial layout.
 */
export const ANIMEHUB_NEWS_FALLBACK_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090a12"/>
      <stop offset="50%" stop-color="#121524"/>
      <stop offset="100%" stop-color="#0e101a"/>
    </linearGradient>
    <linearGradient id="roseGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#grid)"/>

  <!-- Subtle Radial Highlights -->
  <circle cx="200" cy="180" r="320" fill="#f43f5e" opacity="0.06" filter="blur(60px)"/>
  <circle cx="1000" cy="500" r="360" fill="#8b5cf6" opacity="0.05" filter="blur(70px)"/>

  <!-- Geometric Frame Borders -->
  <rect x="36" y="36" width="1128" height="603" rx="16" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
  <path d="M 36 76 L 76 36 M 1164 76 L 1124 36 M 36 599 L 76 639 M 1164 599 L 1124 639" stroke="rgba(244,63,94,0.4)" stroke-width="2"/>

  <!-- Editorial Dispatch Badge -->
  <g transform="translate(600, 270)">
    <!-- Badge Container -->
    <rect x="-140" y="-85" width="280" height="42" rx="21" fill="rgba(244,63,94,0.12)" stroke="rgba(244,63,94,0.35)" stroke-width="1"/>
    <circle cx="-112" cy="-64" r="6" fill="#f43f5e"/>
    <text x="-95" y="-58" fill="#f43f5e" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" letter-spacing="3.5">
      PRESS DISPATCH
    </text>

    <!-- Logo Mark -->
    <rect x="-38" y="-18" width="76" height="76" rx="20" fill="url(#roseGlow)"/>
    <path d="M -10 10 L 14 20 L -10 30 Z" fill="#ffffff"/>

    <!-- Main Title -->
    <text x="0" y="115" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" letter-spacing="1">
      ANIME<tspan fill="#f43f5e">HUB</tspan> NEWS
    </text>

    <!-- Subtitle -->
    <text x="0" y="152" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" letter-spacing="2">
      VERIFIED INDUSTRY COVERAGE &amp; ANNOUNCEMENTS
    </text>
  </g>

  <!-- Bottom Ticker Line -->
  <line x1="80" y1="585" x2="1120" y2="585" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="80" y="612" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="1.5">
    ANIMEHUB EDITORIAL WIRE
  </text>
  <text x="1120" y="612" text-anchor="end" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="1">
    SOURCE FEED VERIFIED
  </text>
</svg>
`)}`;

/**
 * Validates whether a provided image URL is suitable for news display.
 * Rejects:
 * - Empty, null, or undefined values
 * - Broken or unparseable URLs
 * - Obvious generic placeholders (via.placeholder, picsum, dummyimage, etc.)
 * - Unrelated generic nature/landscape stock photos
 */
export function isValidNewsImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();
  if (trimmed.length < 10) return false;

  // Accept valid data URIs (e.g. svg fallback or generated assets)
  if (trimmed.startsWith('data:image/')) return true;

  // Must start with http:// or https://
  if (!/^https?:\/\//i.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();

  // Reject generic placeholders
  const placeholderDomains = [
    'via.placeholder.com',
    'placeholder.com',
    'picsum.photos',
    'dummyimage.com',
    'placekitten.com',
    'placehold.it',
    'placehold.co',
  ];
  if (placeholderDomains.some((domain) => lower.includes(domain))) {
    return false;
  }

  // Reject generic Unsplash nature/landscape images
  const bannedUnsplashPhotos = [
    'photo-1506744038136', // landscape
    'photo-1518709268805', // grass/landscape
    'photo-1534447677768', // dark forest
    'photo-1514565131',    // generic city skyline
    'photo-1509198397868', // random photo
    'photo-1607604276583', // generic movie camera
    'photo-1563089145',    // neon wire
    'photo-1579783900',    // abstract oil painting
  ];
  if (bannedUnsplashPhotos.some((id) => lower.includes(id))) {
    return false;
  }

  // Reject generic stock keywords in URL path/query
  const stockNatureKeywords = ['landscape', 'nature-photo', 'forest-tree', 'waterfall-river'];
  if (stockNatureKeywords.some((kw) => lower.includes(kw))) {
    return false;
  }

  return true;
}

/**
 * Returns a validated image URL for a news article, falling back to the
 * branded AnimeHub editorial fallback when no valid image exists.
 */
export function getNewsArticleImage(article?: Partial<NewsArticle> | null): string {
  if (!article) return ANIMEHUB_NEWS_FALLBACK_IMAGE;

  if (article.image && isValidNewsImage(article.image)) {
    return article.image;
  }

  if (article.coverImage && isValidNewsImage(article.coverImage)) {
    return article.coverImage;
  }

  return ANIMEHUB_NEWS_FALLBACK_IMAGE;
}
