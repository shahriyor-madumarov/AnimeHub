/**
 * AnimeHub Global Media Image System
 * Centralized fallback assets and URL validation for Anime, Manga, and Manhwa covers and banners.
 * Strictly guarantees that NO random, abstract, nature, Unsplash, or Pexels images are ever rendered.
 */

export const ANIMEHUB_COVER_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e101a"/>
      <stop offset="50%" stop-color="#141726"/>
      <stop offset="100%" stop-color="#0b0c14"/>
    </linearGradient>
    <linearGradient id="primaryGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <pattern id="cardGrid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="400" height="600" fill="url(#bgGrad)"/>
  <rect width="400" height="600" fill="url(#cardGrid)"/>

  <!-- Subtle Radial Highlights -->
  <circle cx="200" cy="240" r="140" fill="#f43f5e" opacity="0.08" filter="blur(40px)"/>
  <circle cx="200" cy="360" r="120" fill="#8b5cf6" opacity="0.06" filter="blur(40px)"/>

  <!-- Border Outline -->
  <rect x="20" y="20" width="360" height="560" rx="16" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

  <!-- Badge Icon & Logo Mark -->
  <g transform="translate(200, 270)">
    <!-- Outer Emblem -->
    <rect x="-44" y="-44" width="88" height="88" rx="24" fill="url(#primaryGlow)" opacity="0.9"/>
    
    <!-- Film / Play Silhouette -->
    <path d="M -12 -16 L 18 0 L -12 16 Z" fill="#ffffff"/>

    <!-- AnimeHub Wordmark -->
    <text x="0" y="82" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" letter-spacing="3">
      ANIMEHUB
    </text>

    <!-- Subtitle -->
    <text x="0" y="106" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="1.5">
      COVER UNAVAILABLE
    </text>
  </g>
</svg>
`)}`;

export const ANIMEHUB_BANNER_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 450" width="1200" height="450">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090a10"/>
      <stop offset="50%" stop-color="#121522"/>
      <stop offset="100%" stop-color="#0a0b12"/>
    </linearGradient>
    <linearGradient id="bannerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="450" fill="url(#bannerBg)"/>
  <circle cx="600" cy="225" r="220" fill="#f43f5e" opacity="0.05" filter="blur(80px)"/>

  <rect x="40" y="30" width="1120" height="390" rx="20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>

  <g transform="translate(600, 210)">
    <rect x="-36" y="-36" width="72" height="72" rx="20" fill="url(#bannerGlow)" opacity="0.85"/>
    <path d="M -10 -14 L 16 0 L -10 14 Z" fill="#ffffff"/>
    <text x="0" y="70" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" letter-spacing="4">
      ANIMEHUB
    </text>
  </g>
</svg>
`)}`;

export const ANIMEHUB_AVATAR_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="50" fill="#1e2235"/>
  <circle cx="50" cy="38" r="18" fill="#475569"/>
  <path d="M 22 84 C 22 66, 35 58, 50 58 C 65 58, 78 66, 78 84 Z" fill="#475569"/>
</svg>
`)}`;

/**
 * Validates that a cover image URL is genuine, from a valid media provider
 * (AniList, Jikan/MyAnimeList, or MangaDex), or the AnimeHub SVG fallback,
 * and NOT a random photo from Unsplash, Pexels, Picsum, or generic placeholder generators.
 */
const BANNED_IMAGE_PATTERNS = [
  'unsplash.com',
  'pexels.com',
  'picsum.photos',
  'placeholder.com',
  'via.placeholder.com',
  'dummyimage.com',
  'loremflickr.com',
  'placekitten.com',
  'pixabay.com',
  'freepik.com',
  'nature',
  'abstract',
];

export function isAuthorizedMediaProviderHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 's4.anilist.co' ||
    host === 'anilist.co' ||
    host.endsWith('.anilist.co') ||
    host === 'cdn.myanimelist.net' ||
    host === 'myanimelist.net' ||
    host.endsWith('.myanimelist.net') ||
    host === 'uploads.mangadex.org' ||
    host === 'mangadex.org' ||
    host.endsWith('.mangadex.org') ||
    host === 'media.kitsu.app' ||
    host === 'media.kitsu.io' ||
    host === 'kitsu.io' ||
    host === 'kitsu.app' ||
    host.endsWith('.kitsu.io') ||
    host.endsWith('.kitsu.app')
  );
}

export function isValidMediaCoverImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 10) return false;

  // 1. Allow official AnimeHub SVG fallback assets
  if (trimmed.startsWith('data:image/svg+xml') || trimmed.startsWith('data:image/png')) {
    return true;
  }

  // 2. Reject obvious banned domains or placeholder patterns in the URL
  const lower = trimmed.toLowerCase();
  for (const pattern of BANNED_IMAGE_PATTERNS) {
    if (lower.includes(pattern)) {
      // Allow legitimate provider URLs even if they contain character names or hashes,
      // but strictly ban non-provider URLs with these patterns
      try {
        const parsedHost = new URL(trimmed).hostname;
        if (!isAuthorizedMediaProviderHost(parsedHost)) {
          return false;
        }
      } catch {
        return false;
      }
    }
  }

  // 3. Strict host verification: Must be from AniList, Jikan/MAL, or MangaDex
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return isAuthorizedMediaProviderHost(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Sanitizes and returns a guaranteed valid cover image.
 * If the original image is missing, invalid, or an Unsplash/Pexels link, returns ANIMEHUB_COVER_FALLBACK.
 */
export function getSafeCoverImage(url?: string | null): string {
  if (isValidMediaCoverImage(url)) {
    return url!.trim();
  }
  return ANIMEHUB_COVER_FALLBACK;
}

/**
 * Sanitizes and returns a guaranteed valid banner image.
 */
export function getSafeBannerImage(bannerUrl?: string | null, posterUrl?: string | null): string {
  if (isValidMediaCoverImage(bannerUrl)) {
    return bannerUrl!.trim();
  }
  if (isValidMediaCoverImage(posterUrl)) {
    return posterUrl!.trim();
  }
  return ANIMEHUB_BANNER_FALLBACK;
}
