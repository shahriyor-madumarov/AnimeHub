// src/api/serverless.ts
import express from "express";

// src/services/api/routes.ts
import { Router } from "express";

// src/services/cache/cache.ts
var MemoryCache = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.inFlight = /* @__PURE__ */ new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      deduped: 0
    };
  }
  /**
   * Retrieve cached value if still valid
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }
  /**
   * Set cache entry with TTL in seconds
   */
  set(key, data, ttlSeconds) {
    if (this.cache.size > 1e3) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1e3
    });
  }
  /**
   * Delete entry
   */
  delete(key) {
    return this.cache.delete(key);
  }
  /**
   * Execute fetcher function with automatic caching and in-flight deduplication.
   * If a matching request is currently pending, subsequent callers wait for the same promise.
   */
  async fetchWithDedupe(key, ttlSeconds, fetcher) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    const pending = this.inFlight.get(key);
    if (pending) {
      this.stats.deduped++;
      return pending;
    }
    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== null && result !== void 0) {
          this.set(key, result, ttlSeconds);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, promise);
    return promise;
  }
  /**
   * Get stats for health check
   */
  getStats() {
    return {
      size: this.cache.size,
      inFlight: this.inFlight.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      deduped: this.stats.deduped
    };
  }
  /**
   * Clear expired entries
   */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
};
var globalCache = new MemoryCache();
if (typeof setInterval !== "undefined") {
  const pruneTimer = setInterval(() => globalCache.prune(), 5 * 60 * 1e3);
  if (pruneTimer && typeof pruneTimer.unref === "function") {
    pruneTimer.unref();
  }
}

// src/lib/mediaImage.ts
var ANIMEHUB_COVER_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
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
var ANIMEHUB_BANNER_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
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
var ANIMEHUB_AVATAR_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="50" fill="#1e2235"/>
  <circle cx="50" cy="38" r="18" fill="#475569"/>
  <path d="M 22 84 C 22 66, 35 58, 50 58 C 65 58, 78 66, 78 84 Z" fill="#475569"/>
</svg>
`)}`;
var BANNED_IMAGE_PATTERNS = [
  "unsplash.com",
  "pexels.com",
  "picsum.photos",
  "placeholder.com",
  "via.placeholder.com",
  "dummyimage.com",
  "loremflickr.com",
  "placekitten.com",
  "pixabay.com",
  "freepik.com",
  "nature",
  "abstract"
];
function isAuthorizedMediaProviderHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "s4.anilist.co" || host === "anilist.co" || host.endsWith(".anilist.co") || host === "cdn.myanimelist.net" || host === "myanimelist.net" || host.endsWith(".myanimelist.net") || host === "uploads.mangadex.org" || host === "mangadex.org" || host.endsWith(".mangadex.org") || host === "media.kitsu.app" || host === "media.kitsu.io" || host === "kitsu.io" || host === "kitsu.app" || host.endsWith(".kitsu.io") || host.endsWith(".kitsu.app");
}
function isValidMediaCoverImage(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 10) return false;
  if (trimmed.startsWith("data:image/svg+xml") || trimmed.startsWith("data:image/png")) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  for (const pattern of BANNED_IMAGE_PATTERNS) {
    if (lower.includes(pattern)) {
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
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return isAuthorizedMediaProviderHost(parsed.hostname);
  } catch {
    return false;
  }
}
function getSafeCoverImage(url) {
  if (isValidMediaCoverImage(url)) {
    return url.trim();
  }
  return ANIMEHUB_COVER_FALLBACK;
}
function getSafeBannerImage(bannerUrl, posterUrl) {
  if (isValidMediaCoverImage(bannerUrl)) {
    return bannerUrl.trim();
  }
  if (isValidMediaCoverImage(posterUrl)) {
    return posterUrl.trim();
  }
  return ANIMEHUB_BANNER_FALLBACK;
}

// src/services/models/normalized.ts
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}
function formatCount(count) {
  if (!count) return void 0;
  if (count >= 1e6) {
    return `${(count / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1e3) {
    return `${(count / 1e3).toFixed(0)}K`;
  }
  return String(count);
}
function isValidAnimeCoverImage(url) {
  return isValidMediaCoverImage(url);
}
function normalizeAniListMedia(media, overrideType) {
  const isAnime = media.type === "ANIME" || overrideType === "ANIME";
  const type = overrideType || (isAnime ? "ANIME" : "MANGA");
  let format = media.format || (isAnime ? "TV Series" : "Manga");
  if (format === "TV") format = "TV Series";
  else if (format === "TV_SHORT") format = "TV Short";
  else if (format === "MOVIE") format = "Movie";
  else if (format === "SPECIAL") format = "Special";
  else if (format === "ONE_SHOT") format = "One Shot";
  let status = "Completed";
  if (media.status === "RELEASING") {
    status = isAnime ? "Airing" : "Publishing";
  } else if (media.status === "NOT_YET_RELEASED") {
    status = "Upcoming";
  } else if (media.status === "HIATUS") {
    status = "Hiatus";
  }
  const rawScore = media.averageScore ?? media.meanScore;
  const rating = rawScore ? Math.round(rawScore / 10 * 10) / 10 : 8;
  let studioOrAuthor = "Unknown Studio";
  if (isAnime) {
    const animationStudio = media.studios?.nodes?.find((s) => s.isAnimationStudio);
    studioOrAuthor = animationStudio?.name || media.studios?.nodes?.[0]?.name || "Studio";
  } else {
    const mainAuthor = media.staff?.edges?.find((e) => {
      const role = (e.role || "").toLowerCase();
      return role.includes("story") || role.includes("art") || role.includes("author");
    });
    studioOrAuthor = mainAuthor?.node?.name?.full || media.staff?.nodes?.[0]?.name?.full || "Mangaka";
  }
  let season;
  if (media.season === "WINTER") season = "Winter";
  else if (media.season === "SPRING") season = "Spring";
  else if (media.season === "SUMMER") season = "Summer";
  else if (media.season === "FALL") season = "Fall";
  const characters = (media.characters?.edges || []).slice(0, 10).map((edge, index) => ({
    id: String(edge.node?.id || index),
    name: edge.node?.name?.full || "Unknown Character",
    role: edge.role || "Main Protagonist",
    image: edge.node?.image?.large || edge.node?.image?.medium || ANIMEHUB_AVATAR_FALLBACK
  }));
  const staff = (media.staff?.edges || []).slice(0, 8).map((edge, index) => ({
    id: String(edge.node?.id || index),
    name: edge.node?.name?.full || "Staff",
    role: edge.role || "Production Staff",
    image: edge.node?.image?.large || edge.node?.image?.medium
  }));
  const relations = (media.relations?.edges || []).filter((edge) => edge.node).slice(0, 6).map((edge) => ({
    id: String(edge.node.id),
    title: edge.node.title?.english || edge.node.title?.romaji || "Related Title",
    relationType: (edge.relationType || "RELATED").replace(/_/g, " "),
    format: edge.node.format,
    type: edge.node.type === "ANIME" ? "ANIME" : "MANGA",
    posterImage: edge.node.coverImage?.large || edge.node.coverImage?.medium
  }));
  const recommendations = (media.recommendations?.nodes || []).filter((node) => Boolean(node && node.mediaRecommendation)).map((node) => {
    const recMedia = node.mediaRecommendation;
    const recScore = recMedia.averageScore ?? recMedia.meanScore;
    const rawCover = recMedia.coverImage?.extraLarge || recMedia.coverImage?.large || recMedia.coverImage?.medium;
    const englishTitle = recMedia.title?.english || void 0;
    const romajiTitle = recMedia.title?.romaji || void 0;
    const nativeTitle = recMedia.title?.native || void 0;
    const title = englishTitle || romajiTitle || nativeTitle || "Recommendation";
    return {
      id: String(recMedia.id),
      title,
      englishTitle,
      romajiTitle,
      posterImage: typeof rawCover === "string" ? rawCover.trim() : "",
      rating: recScore ? Math.round(recScore / 10 * 10) / 10 : void 0,
      type: recMedia.type === "MANGA" ? "MANGA" : "ANIME",
      releaseYear: recMedia.startDate?.year || void 0
    };
  }).filter((rec) => isValidAnimeCoverImage(rec.posterImage)).slice(0, 6);
  const rawPoster = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;
  const posterImage = getSafeCoverImage(rawPoster);
  const rawBanner = media.bannerImage || media.coverImage?.extraLarge || rawPoster;
  const bannerImage = getSafeBannerImage(rawBanner, posterImage);
  const trailerEmbedId = media.trailer?.site === "youtube" ? media.trailer.id : void 0;
  const cyrillicRegex = /[\u0400-\u04FF]/;
  const russianTitle = Array.isArray(media.synonyms) ? media.synonyms.find((s) => cyrillicRegex.test(s)) : void 0;
  return {
    id: String(media.id),
    title: media.title?.english || media.title?.romaji || media.title?.native || "Untitled",
    englishTitle: media.title?.english || void 0,
    japaneseTitle: media.title?.native || void 0,
    russianTitle: russianTitle || void 0,
    titles: {
      english: media.title?.english || void 0,
      russian: russianTitle || void 0,
      native: media.title?.native || void 0,
      romaji: media.title?.romaji || void 0
    },
    type,
    format,
    rating,
    reviewCount: formatCount(media.popularity),
    rank: media.rankings?.[0]?.rank,
    popularity: media.popularity,
    releaseYear: media.startDate?.year || media.seasonYear || (/* @__PURE__ */ new Date()).getFullYear(),
    season,
    status,
    genres: Array.isArray(media.genres) ? media.genres : [],
    synopsis: stripHtml(media.description),
    posterImage,
    bannerImage,
    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,
    duration: media.duration ? `${media.duration} min` : void 0,
    studioOrAuthor,
    trailerEmbedId,
    characters: characters.length > 0 ? characters : void 0,
    staff: staff.length > 0 ? staff : void 0,
    relations: relations.length > 0 ? relations : void 0,
    recommendations: recommendations.length > 0 ? recommendations : void 0,
    sourceProvider: "anilist",
    isAdult: media.isAdult ?? false
  };
}
function normalizeJikanAnime(data) {
  let status = "Completed";
  if (data.status === "Currently Airing") status = "Airing";
  else if (data.status === "Not yet aired") status = "Upcoming";
  const rawPoster = data.images?.webp?.large_image_url || data.images?.jpg?.large_image_url;
  const posterImage = getSafeCoverImage(rawPoster);
  const rawBanner = data.images?.jpg?.large_image_url || rawPoster;
  const bannerImage = getSafeBannerImage(rawBanner, posterImage);
  let season;
  if (data.season) {
    const s = data.season.toLowerCase();
    if (s === "winter") season = "Winter";
    else if (s === "spring") season = "Spring";
    else if (s === "summer") season = "Summer";
    else if (s === "fall") season = "Fall";
  }
  const genres = (data.genres || []).map((g) => g.name).filter(Boolean);
  const cyrillicRegex = /[\u0400-\u04FF]/;
  let russianTitle;
  if (Array.isArray(data.titles)) {
    const ruObj = data.titles.find(
      (t) => t.type === "Russian" || t.title && cyrillicRegex.test(t.title)
    );
    if (ruObj) russianTitle = ruObj.title;
  }
  if (!russianTitle && Array.isArray(data.title_synonyms)) {
    russianTitle = data.title_synonyms.find((s) => cyrillicRegex.test(s));
  }
  const rawJikanRecs = Array.isArray(data.recommendations) ? data.recommendations : Array.isArray(data.recommendation_entries) ? data.recommendation_entries : [];
  const recommendations = rawJikanRecs.map((item) => {
    const entry = item.entry || item;
    const rawCover = entry.images?.webp?.large_image_url || entry.images?.jpg?.large_image_url || entry.images?.webp?.image_url || entry.images?.jpg?.image_url;
    return {
      id: String(entry.mal_id || entry.id || ""),
      title: entry.title || "Recommendation",
      englishTitle: entry.title || void 0,
      posterImage: typeof rawCover === "string" ? rawCover.trim() : "",
      type: "ANIME"
    };
  }).filter((rec) => Boolean(rec.id) && isValidAnimeCoverImage(rec.posterImage)).slice(0, 6);
  return {
    id: String(data.mal_id),
    title: data.title_english || data.title || "Untitled",
    englishTitle: data.title_english || void 0,
    japaneseTitle: data.title_japanese || void 0,
    russianTitle: russianTitle || void 0,
    titles: {
      english: data.title_english || void 0,
      russian: russianTitle || void 0,
      native: data.title_japanese || void 0,
      romaji: data.title || void 0
    },
    type: "ANIME",
    format: data.type || "TV Series",
    rating: typeof data.score === "number" ? Math.round(data.score * 10) / 10 : 8,
    reviewCount: formatCount(data.members),
    rank: data.rank,
    popularity: data.popularity,
    releaseYear: data.year || data.aired?.prop?.from?.year || (/* @__PURE__ */ new Date()).getFullYear(),
    season,
    status,
    genres,
    synopsis: stripHtml(data.synopsis),
    posterImage,
    bannerImage,
    episodes: data.episodes,
    duration: data.duration,
    studioOrAuthor: data.studios?.[0]?.name || "Studio",
    trailerEmbedId: data.trailer?.youtube_id || void 0,
    sourceProvider: "jikan",
    isAdult: data.rating?.includes("R18") || data.rating?.includes("Rx") || false,
    recommendations: recommendations.length > 0 ? recommendations : void 0
  };
}
function normalizeKitsuAnime(raw, included) {
  const attr = raw.attributes || {};
  let status = "Completed";
  if (attr.status === "current") status = "Airing";
  else if (attr.status === "upcoming" || attr.status === "unreleased" || attr.status === "tba") status = "Upcoming";
  const subtype = (attr.subtype || "").toLowerCase();
  let format = "TV Series";
  if (subtype === "movie") format = "Movie";
  else if (subtype === "ova") format = "OVA";
  else if (subtype === "ona") format = "ONA";
  else if (subtype === "special") format = "Special";
  else if (attr.subtype) format = attr.subtype;
  const numScore = parseFloat(attr.averageRating);
  const rating = !isNaN(numScore) && numScore > 0 ? Math.round(numScore / 10 * 10) / 10 : 8;
  const rawPoster = attr.posterImage?.large || attr.posterImage?.original || attr.posterImage?.medium || attr.posterImage?.small;
  const posterImage = getSafeCoverImage(rawPoster);
  const rawBanner = attr.coverImage?.large || attr.coverImage?.original || attr.coverImage?.small || rawPoster;
  const bannerImage = getSafeBannerImage(rawBanner, posterImage);
  const titles = attr.titles || {};
  const canonical = attr.canonicalTitle || "";
  const englishTitle = titles.en || titles.en_us || void 0;
  const japaneseTitle = titles.ja_jp || void 0;
  const romajiTitle = titles.en_jp || canonical || void 0;
  const cyrillicRegex = /[\u0400-\u04FF]/;
  let russianTitle;
  if (Array.isArray(attr.abbreviatedTitles)) {
    russianTitle = attr.abbreviatedTitles.find((t) => cyrillicRegex.test(t));
  }
  const title = englishTitle || canonical || romajiTitle || "Untitled";
  const genres = [];
  if (Array.isArray(included) && included.length > 0) {
    const categoryMap = /* @__PURE__ */ new Map();
    for (const inc of included) {
      if (inc.type === "categories" && inc.attributes?.title) {
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
  let season;
  if (attr.startDate && typeof attr.startDate === "string") {
    const month = parseInt(attr.startDate.substring(5, 7), 10);
    if (month >= 1 && month <= 3) season = "Winter";
    else if (month >= 4 && month <= 6) season = "Spring";
    else if (month >= 7 && month <= 9) season = "Summer";
    else if (month >= 10 && month <= 12) season = "Fall";
  }
  let releaseYear = (/* @__PURE__ */ new Date()).getFullYear();
  if (attr.startDate && typeof attr.startDate === "string") {
    const parsedYear = parseInt(attr.startDate.substring(0, 4), 10);
    if (!isNaN(parsedYear)) releaseYear = parsedYear;
  }
  const recommendations = [];
  if (Array.isArray(included) && included.length > 0) {
    for (const inc of included) {
      if (inc.type === "anime" || inc.type === "manga") {
        const destAttr = inc.attributes || {};
        const destPoster = destAttr.posterImage?.large || destAttr.posterImage?.medium || destAttr.posterImage?.original;
        if (isValidMediaCoverImage(destPoster)) {
          const destScore = parseFloat(destAttr.averageRating);
          recommendations.push({
            id: String(inc.id),
            title: destAttr.canonicalTitle || destAttr.titles?.en || "Recommendation",
            englishTitle: destAttr.titles?.en || void 0,
            posterImage: String(destPoster).trim(),
            rating: !isNaN(destScore) && destScore > 0 ? Math.round(destScore / 10 * 10) / 10 : void 0,
            type: inc.type === "manga" ? "MANGA" : "ANIME",
            releaseYear: destAttr.startDate ? parseInt(destAttr.startDate.substring(0, 4), 10) : void 0
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
      romaji: romajiTitle
    },
    type: "ANIME",
    format,
    rating,
    reviewCount: formatCount(attr.userCount),
    rank: attr.ratingRank || attr.popularityRank || void 0,
    popularity: attr.userCount || void 0,
    releaseYear,
    season,
    status,
    genres,
    synopsis: stripHtml(attr.synopsis || attr.description || ""),
    posterImage,
    bannerImage,
    episodes: typeof attr.episodeCount === "number" ? attr.episodeCount : void 0,
    duration: attr.episodeLength ? `${attr.episodeLength} min` : void 0,
    studioOrAuthor: "Animation Studio",
    trailerEmbedId: attr.youtubeVideoId ? String(attr.youtubeVideoId).trim() : void 0,
    sourceProvider: "kitsu",
    isAdult: attr.nsfw === true || attr.ageRating === "R18" || false,
    recommendations: recommendations.length > 0 ? recommendations.slice(0, 6) : void 0
  };
}

// src/services/safety/isSafeContent.ts
var BANNED_GENRES = /* @__PURE__ */ new Set([
  "hentai",
  "erotica",
  "adult",
  "smut",
  "pornographic"
]);
var BANNED_TITLE_WORDS = [
  "hentai",
  "uncensored erotica",
  "sex life",
  "xxx",
  "doujinshi 18+"
];
function isSafeContent(item, allowGenre) {
  if (!item) return false;
  if (item.isAdult === true) {
    return false;
  }
  if (Array.isArray(item.genres)) {
    for (const genre of item.genres) {
      const g = genre.toLowerCase().trim();
      if (BANNED_GENRES.has(g)) {
        return false;
      }
    }
  }
  if (Array.isArray(item.tags)) {
    for (const tag of item.tags) {
      const t = tag.toLowerCase().trim();
      if (BANNED_GENRES.has(t)) {
        return false;
      }
    }
  }
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

// src/services/providers/anilist/queries.ts
var MEDIA_LIST_FIELDS_FRAGMENT = `
  fragment mediaListFields on Media {
    id
    idMal
    title {
      romaji
      english
      native
    }
    type
    format
    status
    description(asHtml: false)
    startDate {
      year
      month
      day
    }
    season
    seasonYear
    episodes
    duration
    chapters
    volumes
    genres
    synonyms
    synopsis: description
    averageScore
    meanScore
    popularity
    isAdult
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    trailer {
      id
      site
      thumbnail
    }
    studios(isMain: true) {
      nodes {
        id
        name
        isAnimationStudio
      }
    }
  }
`;
var MEDIA_FIELDS_FRAGMENT = `
  ${MEDIA_LIST_FIELDS_FRAGMENT}
  fragment mediaFields on Media {
    ...mediaListFields
    staff(perPage: 8) {
      edges {
        role
        node {
          id
          name {
            full
          }
          image {
            large
            medium
          }
        }
      }
    }
  }
`;
var MEDIA_DETAIL_FIELDS_FRAGMENT = `
  ${MEDIA_FIELDS_FRAGMENT}
  fragment mediaDetailFields on Media {
    ...mediaFields
    characters(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges {
        role
        node {
          id
          name {
            full
          }
          image {
            large
            medium
          }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          title {
            english
            romaji
          }
          coverImage {
            large
            medium
          }
        }
      }
    }
    recommendations(sort: [RATING_DESC], perPage: 12) {
      nodes {
        mediaRecommendation {
          id
          type
          averageScore
          meanScore
          title {
            english
            romaji
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          startDate {
            year
          }
        }
      }
    }
  }
`;
var GET_MEDIA_LIST_QUERY = `
  ${MEDIA_LIST_FIELDS_FRAGMENT}
  query GetMediaList(
    $page: Int = 1,
    $perPage: Int = 20,
    $type: MediaType,
    $sort: [MediaSort],
    $genre: String,
    $status: MediaStatus,
    $season: MediaSeason,
    $seasonYear: Int,
    $search: String,
    $isAdult: Boolean = false
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(
        type: $type,
        sort: $sort,
        genre: $genre,
        status: $status,
        season: $season,
        seasonYear: $seasonYear,
        search: $search,
        isAdult: $isAdult
      ) {
        ...mediaListFields
      }
    }
  }
`;
var GET_MEDIA_DETAIL_QUERY = `
  ${MEDIA_DETAIL_FIELDS_FRAGMENT}
  query GetMediaDetail($id: Int, $type: MediaType, $isAdult: Boolean = false) {
    Media(id: $id, type: $type, isAdult: $isAdult) {
      ...mediaDetailFields
    }
  }
`;

// src/services/providers/circuitBreaker.ts
var CircuitBreaker = class {
  constructor(options) {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.nextAttemptTime = 0;
    this.lastErrorMessage = "";
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 2;
    this.cooldownMs = options.cooldownMs ?? 5 * 60 * 1e3;
  }
  /**
   * Returns true if the circuit breaker is currently OPEN (blocking requests).
   * Automatically transitions to HALF_OPEN when cooldown expires.
   */
  isOpen() {
    if (this.state === "OPEN") {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = "HALF_OPEN";
        return false;
      }
      return true;
    }
    return false;
  }
  /**
   * Resets the circuit breaker back to CLOSED on successful request.
   */
  recordSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastErrorMessage = "";
  }
  /**
   * Records a failure. If forceTrip is true (e.g. on 403 disabled or 504 gateway timeout),
   * trips the breaker to OPEN immediately.
   */
  recordFailure(errOrMessage, forceTrip = false, customCooldownMs) {
    const message = typeof errOrMessage === "string" ? errOrMessage : errOrMessage?.message || String(errOrMessage);
    this.lastErrorMessage = message;
    this.failureCount++;
    const cooldown = customCooldownMs ?? this.cooldownMs;
    if (forceTrip || this.failureCount >= this.failureThreshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + cooldown;
    }
  }
  getState() {
    this.isOpen();
    return this.state;
  }
  getLastError() {
    return this.lastErrorMessage;
  }
};

// src/services/providers/anilist/anilistProvider.ts
var DEFAULT_ANILIST_URL = "https://graphql.anilist.co";
var REQUEST_TIMEOUT_MS = 12e3;
var AniListProvider = class {
  constructor() {
    this.breaker = new CircuitBreaker({
      name: "AniList",
      failureThreshold: 2,
      cooldownMs: 5 * 60 * 1e3
    });
    this.endpoint = process.env.ANILIST_GRAPHQL_URL || DEFAULT_ANILIST_URL;
  }
  /**
   * Executes a GraphQL query against AniList with timeout and rate limit checks.
   */
  async executeQuery(query, variables) {
    if (this.breaker.isOpen()) {
      throw new Error(
        `AniList service temporarily unavailable (${this.breaker.getLastError() || "circuit breaker active"})`
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal
      });
      if (response.status === 429) {
        this.breaker.recordFailure("AniList rate limited", true, 60 * 1e3);
        throw new Error("AniList API rate limit reached. Please try again in a moment.");
      }
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let cleanMsg = `AniList API returned HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.errors?.[0]?.message) {
            cleanMsg = `AniList: ${parsed.errors[0].message}`;
          }
        } catch {
          if (errorText.includes("temporarily disabled")) {
            cleanMsg = "The AniList API has been temporarily disabled due to upstream stability issues.";
          }
        }
        this.breaker.recordFailure(cleanMsg, response.status === 403 || response.status >= 500);
        throw new Error(cleanMsg);
      }
      const json = await response.json();
      if (json.errors && json.errors.length > 0) {
        const msg = json.errors[0]?.message || "AniList GraphQL error";
        this.breaker.recordFailure(`AniList GraphQL: ${msg}`, false);
        throw new Error(msg);
      }
      this.breaker.recordSuccess();
      return json.data;
    } catch (err) {
      if (err.name === "AbortError") {
        const timeoutMsg = `AniList request timed out after ${REQUEST_TIMEOUT_MS}ms`;
        this.breaker.recordFailure(timeoutMsg);
        throw new Error(timeoutMsg);
      }
      this.breaker.recordFailure(err);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  /**
   * Maps client sort value to AniList GraphQL MediaSort enum
   */
  mapSort(sort) {
    switch (sort) {
      case "trending":
        return ["TRENDING_DESC", "POPULARITY_DESC"];
      case "popularity":
        return ["POPULARITY_DESC"];
      case "rating":
        return ["SCORE_DESC"];
      case "release":
      case "latest":
        return ["START_DATE_DESC"];
      case "title":
        return ["TITLE_ROMAJI"];
      default:
        return ["TRENDING_DESC"];
    }
  }
  /**
   * Maps client status to AniList MediaStatus
   */
  mapStatus(status, type = "ANIME") {
    if (!status || status === "All") return void 0;
    const s = status.toLowerCase();
    if (s === "airing" || s === "publishing") return "RELEASING";
    if (s === "completed") return "FINISHED";
    if (s === "upcoming") return "NOT_YET_RELEASED";
    if (s === "hiatus") return "HIATUS";
    return void 0;
  }
  /**
   * Fetch trending titles
   */
  async getTrending(type, limit = 12, page = 1) {
    const data = await this.executeQuery(GET_MEDIA_LIST_QUERY, {
      page,
      perPage: limit,
      type,
      sort: ["TRENDING_DESC", "POPULARITY_DESC"],
      isAdult: false
    });
    const mediaList = data?.Page?.media || [];
    return mediaList.map((m) => normalizeAniListMedia(m, type)).filter((item) => isSafeContent(item));
  }
  /**
   * Fetch popular titles
   */
  async getPopular(type, limit = 12, page = 1) {
    const data = await this.executeQuery(GET_MEDIA_LIST_QUERY, {
      page,
      perPage: limit,
      type,
      sort: ["POPULARITY_DESC"],
      isAdult: false
    });
    const mediaList = data?.Page?.media || [];
    return mediaList.map((m) => normalizeAniListMedia(m, type)).filter((item) => isSafeContent(item));
  }
  /**
   * Fetch latest releases
   */
  async getLatest(type, limit = 12, page = 1) {
    const data = await this.executeQuery(GET_MEDIA_LIST_QUERY, {
      page,
      perPage: limit,
      type,
      sort: ["START_DATE_DESC"],
      status: type === "ANIME" ? "RELEASING" : void 0,
      isAdult: false
    });
    const mediaList = data?.Page?.media || [];
    return mediaList.map((m) => {
      const item = normalizeAniListMedia(m, type);
      item.isLatest = true;
      return item;
    }).filter((item) => isSafeContent(item));
  }
  /**
   * Fetch paginated & filtered media list
   */
  async getList(type, params) {
    const page = params.page || 1;
    const perPage = params.perPage || 18;
    const sort = this.mapSort(params.sort);
    const status = this.mapStatus(params.status, type);
    const genre = params.genre && params.genre !== "All" ? params.genre : void 0;
    const data = await this.executeQuery(GET_MEDIA_LIST_QUERY, {
      page,
      perPage,
      type,
      sort,
      status,
      genre,
      search: params.search && params.search.trim() ? params.search.trim() : void 0,
      seasonYear: params.year,
      isAdult: false
    });
    const pageInfo = data?.Page?.pageInfo || {
      currentPage: page,
      hasNextPage: false,
      perPage
    };
    const mediaList = data?.Page?.media || [];
    const items = mediaList.map((m) => normalizeAniListMedia(m, type)).filter((item) => isSafeContent(item, genre));
    return {
      data: items,
      pageInfo: {
        currentPage: pageInfo.currentPage || page,
        hasNextPage: pageInfo.hasNextPage || false,
        total: pageInfo.total,
        perPage: pageInfo.perPage || perPage,
        lastPage: pageInfo.lastPage
      },
      sourceProvider: "anilist"
    };
  }
  /**
   * Fetch single media details by AniList ID
   */
  async getById(type, id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return null;
    }
    const data = await this.executeQuery(GET_MEDIA_DETAIL_QUERY, {
      id: numId,
      type,
      isAdult: false
    });
    if (!data?.Media) {
      return null;
    }
    const item = normalizeAniListMedia(data.Media, type);
    if (!isSafeContent(item)) {
      return null;
    }
    return item;
  }
  /**
   * Quick search
   */
  async search(type, query, limit = 10, page = 1) {
    return this.getList(type, {
      search: query,
      perPage: limit,
      page,
      sort: "popularity"
    });
  }
  /**
   * Check provider health
   */
  async checkHealth() {
    if (this.breaker.isOpen()) {
      return false;
    }
    try {
      const res = await this.getTrending("ANIME", 1, 1);
      return res.length > 0;
    } catch {
      return false;
    }
  }
};
var anilistProvider = new AniListProvider();

// src/services/providers/jikan/jikanProvider.ts
var DEFAULT_JIKAN_URL = "https://api.jikan.moe/v4";
var REQUEST_TIMEOUT_MS2 = 1e4;
var JikanProvider = class {
  constructor() {
    this.breaker = new CircuitBreaker({
      name: "Jikan",
      failureThreshold: 2,
      cooldownMs: 3 * 60 * 1e3
    });
    this.baseUrl = process.env.JIKAN_API_URL || DEFAULT_JIKAN_URL;
  }
  /**
   * Performs an HTTP GET request to Jikan with timeout and error handling.
   */
  async get(endpoint, params = {}) {
    if (this.breaker.isOpen()) {
      throw new Error(
        `Jikan service temporarily unavailable (${this.breaker.getLastError() || "circuit breaker active"})`
      );
    }
    const url = new URL(`${this.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== void 0 && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS2);
    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (response.status === 429) {
        this.breaker.recordFailure("Jikan rate limited", true, 60 * 1e3);
        throw new Error("Jikan API rate limited");
      }
      if (!response.ok) {
        let cleanMsg = `Jikan API returned HTTP ${response.status}`;
        try {
          const errJson = await response.json().catch(() => null);
          if (errJson?.message) {
            cleanMsg = `Jikan: ${errJson.message}`;
          }
        } catch {
        }
        if (response.status === 504) {
          cleanMsg = "Jikan upstream service is temporarily unavailable (HTTP 504 Gateway Timeout)";
        }
        this.breaker.recordFailure(cleanMsg, response.status === 504 || response.status >= 500);
        throw new Error(cleanMsg);
      }
      const json = await response.json();
      this.breaker.recordSuccess();
      return json;
    } catch (err) {
      if (err.name === "AbortError") {
        const timeoutMsg = `Jikan request timed out after ${REQUEST_TIMEOUT_MS2}ms`;
        this.breaker.recordFailure(timeoutMsg);
        throw new Error(timeoutMsg);
      }
      this.breaker.recordFailure(err);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  /**
   * Get trending / currently airing anime
   */
  async getTrending(limit = 12, page = 1) {
    let list = [];
    try {
      const res = await this.get("/top/anime", {
        filter: "airing",
        limit,
        page
      });
      list = res.data || [];
    } catch {
      const res = await this.get("/top/anime", { limit, page });
      list = res.data || [];
    }
    return list.map(normalizeJikanAnime).filter((item) => isSafeContent(item));
  }
  /**
   * Get popular anime
   */
  async getPopular(limit = 12, page = 1) {
    const res = await this.get("/top/anime", {
      filter: "bypopularity",
      limit,
      page
    });
    const list = res.data || [];
    return list.map(normalizeJikanAnime).filter((item) => isSafeContent(item));
  }
  /**
   * Get latest anime
   */
  async getLatest(limit = 12, page = 1) {
    const res = await this.get("/seasons/now", {
      limit,
      page
    });
    const list = res.data || [];
    return list.map((item) => {
      const normalized = normalizeJikanAnime(item);
      normalized.isLatest = true;
      return normalized;
    }).filter((item) => isSafeContent(item));
  }
  /**
   * Search / filtered list
   */
  async getList(params) {
    const queryParams = {
      page: params.page || 1,
      limit: params.perPage || 18
    };
    if (params.search && params.search.trim()) {
      queryParams.q = params.search.trim();
    }
    if (params.status) {
      if (params.status.toLowerCase() === "airing") queryParams.status = "airing";
      else if (params.status.toLowerCase() === "completed") queryParams.status = "complete";
      else if (params.status.toLowerCase() === "upcoming") queryParams.status = "upcoming";
    }
    if (params.sort) {
      if (params.sort === "rating") {
        queryParams.order_by = "score";
        queryParams.sort = "desc";
      } else if (params.sort === "popularity") {
        queryParams.order_by = "popularity";
        queryParams.sort = "asc";
      } else if (params.sort === "title") {
        queryParams.order_by = "title";
        queryParams.sort = "asc";
      }
    }
    const res = await this.get("/anime", queryParams);
    const list = res.data || [];
    const items = list.map(normalizeJikanAnime).filter((item) => isSafeContent(item));
    const pagination = res.pagination || {};
    return {
      data: items,
      pageInfo: {
        currentPage: pagination.current_page || params.page || 1,
        hasNextPage: pagination.has_next_page || false,
        total: pagination.items?.total,
        perPage: pagination.items?.per_page || params.perPage || 18,
        lastPage: pagination.last_visible_page
      },
      sourceProvider: "jikan"
    };
  }
  /**
   * Get single anime details by MAL id
   */
  async getById(id) {
    const malId = parseInt(id, 10);
    if (isNaN(malId)) return null;
    try {
      const res = await this.get(`/anime/${malId}/full`);
      if (!res.data) return null;
      const item = normalizeJikanAnime(res.data);
      return isSafeContent(item) ? item : null;
    } catch {
      return null;
    }
  }
  /**
   * Search
   */
  async search(query, limit = 10, page = 1) {
    return this.getList({
      search: query,
      perPage: limit,
      page
    });
  }
  /**
   * Check provider health
   */
  async checkHealth() {
    if (this.breaker.isOpen()) {
      return false;
    }
    try {
      const res = await this.get("/top/anime", { limit: 1 });
      return Array.isArray(res.data) && res.data.length > 0;
    } catch {
      return false;
    }
  }
};
var jikanProvider = new JikanProvider();

// src/services/providers/kitsu/kitsuProvider.ts
var DEFAULT_KITSU_URL = "https://kitsu.io/api/edge";
var REQUEST_TIMEOUT_MS3 = 12e3;
var KitsuAnimeProvider = class {
  constructor() {
    this.breaker = new CircuitBreaker({
      name: "Kitsu",
      failureThreshold: 3,
      cooldownMs: 3 * 60 * 1e3
    });
    this.baseUrl = process.env.KITSU_API_URL || DEFAULT_KITSU_URL;
  }
  /**
   * Performs an HTTP GET request to Kitsu with timeout and error handling.
   */
  async get(endpoint, params = {}) {
    if (this.breaker.isOpen()) {
      throw new Error(
        `Kitsu service temporarily unavailable (${this.breaker.getLastError() || "circuit breaker active"})`
      );
    }
    const url = new URL(`${this.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== void 0 && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS3);
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json"
        },
        signal: controller.signal
      });
      if (response.status === 429) {
        this.breaker.recordFailure("Kitsu rate limited", true, 60 * 1e3);
        throw new Error("Kitsu API rate limit reached");
      }
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let cleanMsg = `Kitsu API returned HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.errors?.[0]?.detail) {
            cleanMsg = `Kitsu: ${parsed.errors[0].detail}`;
          }
        } catch {
        }
        this.breaker.recordFailure(cleanMsg, response.status >= 500);
        throw new Error(cleanMsg);
      }
      const json = await response.json();
      this.breaker.recordSuccess();
      return json;
    } catch (err) {
      if (err.name === "AbortError") {
        const timeoutMsg = `Kitsu request timed out after ${REQUEST_TIMEOUT_MS3}ms`;
        this.breaker.recordFailure(timeoutMsg);
        throw new Error(timeoutMsg);
      }
      this.breaker.recordFailure(err.message || "Kitsu request failed");
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  /**
   * Get trending anime
   */
  async getTrending(limit = 12, page = 1) {
    if (page === 1) {
      try {
        const res2 = await this.get("/trending/anime", { limit });
        const list2 = res2.data || [];
        const items = list2.map((raw) => {
          const item = normalizeKitsuAnime(raw, res2.included);
          item.isTrending = true;
          return item;
        }).filter((item) => isSafeContent(item));
        if (items.length > 0) return items;
      } catch (err) {
        console.warn(`[AnimeHub] Kitsu trending endpoint error: ${err.message}`);
      }
    }
    const offset = (page - 1) * limit;
    const res = await this.get("/anime", {
      sort: "-userCount",
      "page[limit]": limit,
      "page[offset]": offset,
      include: "categories"
    });
    const list = res.data || [];
    return list.map((raw) => {
      const item = normalizeKitsuAnime(raw, res.included);
      item.isTrending = true;
      return item;
    }).filter((item) => isSafeContent(item));
  }
  /**
   * Get popular anime
   */
  async getPopular(limit = 12, page = 1) {
    const offset = (page - 1) * limit;
    const res = await this.get("/anime", {
      sort: "-userCount",
      "page[limit]": limit,
      "page[offset]": offset,
      include: "categories"
    });
    const list = res.data || [];
    return list.map((raw) => normalizeKitsuAnime(raw, res.included)).filter((item) => isSafeContent(item));
  }
  /**
   * Get latest anime
   */
  async getLatest(limit = 12, page = 1) {
    const offset = (page - 1) * limit;
    let list = [];
    let included;
    try {
      const res = await this.get("/anime", {
        "filter[status]": "current",
        sort: "-startDate",
        "page[limit]": limit,
        "page[offset]": offset,
        include: "categories"
      });
      list = res.data || [];
      included = res.included;
    } catch {
      const res = await this.get("/anime", {
        sort: "-startDate",
        "page[limit]": limit,
        "page[offset]": offset,
        include: "categories"
      });
      list = res.data || [];
      included = res.included;
    }
    return list.map((raw) => {
      const item = normalizeKitsuAnime(raw, included);
      item.isLatest = true;
      return item;
    }).filter((item) => isSafeContent(item));
  }
  /**
   * Paginated & filtered anime catalog list
   */
  async getList(params) {
    const page = params.page || 1;
    const perPage = params.perPage || 18;
    const offset = (page - 1) * perPage;
    const queryParams = {
      "page[limit]": perPage,
      "page[offset]": offset,
      include: "categories"
    };
    if (params.search && params.search.trim()) {
      queryParams["filter[text]"] = params.search.trim();
    }
    if (params.genre && params.genre !== "All") {
      queryParams["filter[categories]"] = params.genre.toLowerCase().trim();
    }
    if (params.status && params.status !== "All") {
      const s = params.status.toLowerCase();
      if (s === "airing") queryParams["filter[status]"] = "current";
      else if (s === "completed") queryParams["filter[status]"] = "finished";
      else if (s === "upcoming") queryParams["filter[status]"] = "upcoming";
    }
    if (params.format && params.format !== "All") {
      const f = params.format.toLowerCase();
      if (f.includes("tv")) queryParams["filter[subtype]"] = "TV";
      else if (f.includes("movie")) queryParams["filter[subtype]"] = "movie";
      else if (f.includes("ova")) queryParams["filter[subtype]"] = "OVA";
      else if (f.includes("ona")) queryParams["filter[subtype]"] = "ONA";
      else if (f.includes("special")) queryParams["filter[subtype]"] = "special";
    }
    if (params.year) {
      queryParams["filter[seasonYear]"] = params.year;
    }
    if (params.season && params.season !== "All") {
      queryParams["filter[season]"] = params.season.toLowerCase();
    }
    if (params.sort) {
      if (params.sort === "rating") {
        queryParams.sort = "-averageRating";
      } else if (params.sort === "popularity") {
        queryParams.sort = "-userCount";
      } else if (params.sort === "title") {
        queryParams.sort = "canonicalTitle";
      } else if (params.sort === "latest") {
        queryParams.sort = "-startDate";
      }
    } else if (!queryParams["filter[text]"]) {
      queryParams.sort = "-userCount";
    }
    const res = await this.get("/anime", queryParams);
    const list = res.data || [];
    const items = list.map((raw) => normalizeKitsuAnime(raw, res.included)).filter((item) => isSafeContent(item, params.genre));
    const total = typeof res.meta?.count === "number" ? res.meta.count : items.length;
    const lastPage = Math.ceil(total / perPage);
    const hasNextPage = page < lastPage || Boolean(res.links?.next);
    return {
      data: items,
      pageInfo: {
        currentPage: page,
        hasNextPage,
        total,
        perPage,
        lastPage
      },
      sourceProvider: "kitsu"
    };
  }
  /**
   * Fetch single anime details by Kitsu ID or slug
   */
  async getById(id) {
    const isNumeric = /^\d+$/.test(id.trim());
    if (isNumeric) {
      try {
        const res = await this.get(`/anime/${id.trim()}`, {
          include: "categories,mediaRelationships.destination"
        });
        if (res.data) {
          const item = normalizeKitsuAnime(res.data, res.included);
          if (isSafeContent(item)) return item;
        }
      } catch (err) {
        console.warn(`[AnimeHub] Kitsu getById(${id}) by numeric ID failed: ${err.message}`);
      }
    }
    try {
      const slug = id.trim().toLowerCase().replace(/\s+/g, "-");
      const res = await this.get("/anime", {
        "filter[slug]": slug,
        "page[limit]": 1,
        include: "categories,mediaRelationships.destination"
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const item = normalizeKitsuAnime(res.data[0], res.included);
        if (isSafeContent(item)) return item;
      }
    } catch {
    }
    try {
      const cleanQuery = id.replace(/[-_]/g, " ").trim();
      const res = await this.get("/anime", {
        "filter[text]": cleanQuery,
        "page[limit]": 1,
        include: "categories,mediaRelationships.destination"
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const item = normalizeKitsuAnime(res.data[0], res.included);
        if (isSafeContent(item)) return item;
      }
    } catch {
    }
    return null;
  }
  /**
   * Quick search
   */
  async search(query, limit = 10, page = 1) {
    return this.getList({
      search: query,
      perPage: limit,
      page,
      sort: "popularity"
    });
  }
  /**
   * Health check
   */
  async checkHealth() {
    if (this.breaker.isOpen()) {
      return false;
    }
    try {
      const res = await this.get("/trending/anime", { limit: 1 });
      return Array.isArray(res.data) && res.data.length > 0;
    } catch {
      return false;
    }
  }
};
var kitsuProvider = new KitsuAnimeProvider();

// src/services/providers/mangadex/mangadexNormalizer.ts
var FALLBACK_POSTER = ANIMEHUB_COVER_FALLBACK;
var FALLBACK_BANNER = ANIMEHUB_BANNER_FALLBACK;
function normalizeMangaDexMedia(manga, stats, overrideType) {
  const attrs = manga.attributes || {};
  const origLang = (attrs.originalLanguage || "").toLowerCase();
  let type = overrideType || "MANGA";
  let format = "Manga";
  if (overrideType === "MANHWA" || origLang === "ko") {
    type = "MANHWA";
    format = "Webtoon";
  } else if (origLang === "zh" || origLang === "zh-hk") {
    type = "MANGA";
    format = "Manhua";
  } else {
    type = overrideType || "MANGA";
    format = "Manga";
  }
  const titleObj = attrs.title || {};
  const altTitles = attrs.altTitles || [];
  const englishTitle = titleObj["en"] || altTitles.find((t) => t.en)?.en || void 0;
  const japaneseTitle = titleObj["ja"] || titleObj["ja-ro"] || altTitles.find((t) => t.ja)?.ja || altTitles.find((t) => t["ja-ro"])?.["ja-ro"] || void 0;
  const russianTitle = titleObj["ru"] || altTitles.find((t) => t.ru)?.ru || void 0;
  const primaryTitle = englishTitle || titleObj["ja-ro"] || titleObj["ko-ro"] || Object.values(titleObj)[0] || "Untitled Manga";
  let status = "Completed";
  const rawStatus = (attrs.status || "").toLowerCase();
  if (rawStatus === "ongoing") {
    status = "Publishing";
  } else if (rawStatus === "hiatus") {
    status = "Hiatus";
  } else if (rawStatus === "completed" || rawStatus === "cancelled") {
    status = "Completed";
  }
  const coverRel = manga.relationships?.find((r) => r.type === "cover_art");
  const coverFileName = coverRel?.attributes?.fileName;
  let posterImage = FALLBACK_POSTER;
  let bannerImage = FALLBACK_BANNER;
  if (coverFileName) {
    posterImage = `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`;
    bannerImage = `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}`;
  }
  const authorRel = manga.relationships?.find((r) => r.type === "author");
  const artistRel = manga.relationships?.find((r) => r.type === "artist");
  const studioOrAuthor = authorRel?.attributes?.name || artistRel?.attributes?.name || "MangaDex";
  const genres = (attrs.tags || []).map((t) => t.attributes?.name?.en).filter((name) => Boolean(name));
  const rawScore = stats?.rating?.bayesian || stats?.rating?.average;
  const rating = rawScore ? Math.round(rawScore * 10) / 10 : 8.2;
  const popularity = stats?.follows || 0;
  let releaseYear = attrs.year;
  if (!releaseYear && attrs.createdAt) {
    const d = new Date(attrs.createdAt);
    if (!isNaN(d.getTime())) {
      releaseYear = d.getFullYear();
    }
  }
  if (!releaseYear) {
    releaseYear = (/* @__PURE__ */ new Date()).getFullYear();
  }
  const rawSynopsis = attrs.description?.en || attrs.description?.ru || (attrs.description ? Object.values(attrs.description)[0] : "") || "";
  const isAdult = attrs.contentRating === "erotica" || attrs.contentRating === "pornographic";
  return {
    id: manga.id,
    title: primaryTitle,
    englishTitle,
    japaneseTitle,
    russianTitle,
    titles: {
      english: englishTitle,
      russian: russianTitle,
      native: japaneseTitle || titleObj["ko"] || void 0,
      romaji: titleObj["ja-ro"] || titleObj["ko-ro"] || void 0
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
    chapters: attrs.lastChapter ? parseInt(attrs.lastChapter, 10) || void 0 : void 0,
    volumes: attrs.lastVolume ? parseInt(attrs.lastVolume, 10) || void 0 : void 0,
    studioOrAuthor,
    sourceProvider: "mangadex",
    isAdult
  };
}

// src/services/providers/mangadex/mangadexTags.ts
var MANGADEX_TAGS = {
  "oneshot": "0234a31e-a729-4e28-9d6a-3f87c4966b9e",
  "thriller": "07251805-a27e-4d59-b488-f0bfbec15168",
  "award winning": "0a39b5a1-b235-4886-a747-1d05d216532d",
  "reincarnation": "0bc90acb-ccc1-44ca-a34a-b9f3a73259d0",
  "sci-fi": "256c8bd9-4904-4360-bf4f-508a76d67183",
  "time travel": "292e862b-2d17-4062-90a2-0356caa4ae27",
  "genderswap": "2bd2e8d0-f146-434a-9b51-fc9ff2c5fe6a",
  "loli": "2d1f5d56-a1e5-4d0d-a961-2193588b08ec",
  "traditional games": "31932a7e-5b8e-49a6-9f12-2afa39dc544c",
  "official colored": "320831a8-4026-470b-94f6-8353740e6f04",
  "historical": "33771934-028e-4cb3-8744-691e866a923e",
  "monsters": "36fd93ea-e8b8-445e-b836-358f02b3d33d",
  "action": "391b0423-d847-456f-aff0-8b0cfc03066b",
  "demons": "39730448-9a5f-48a2-85b0-a70db87b1233",
  "psychological": "3b60b75c-a2d7-4860-ab56-05f391bb889c",
  "ghosts": "3bb26d85-09d5-4d2e-880c-c34b974339e9",
  "animals": "3de8c75d-8ee3-48ff-98ee-e20a65c86451",
  "long strip": "3e2b8dae-350e-4ab8-a8ce-016e844b9f0d",
  "romance": "423e2eae-a7a2-4a8b-ac03-a8351462d71d",
  "ninja": "489dd859-9b61-4c37-af75-5b18e88daafc",
  "comedy": "4d32cc48-9f00-4cca-9b5a-a839f0764984",
  "mecha": "50880a9d-5440-4732-9afb-8f457127e836",
  "anthology": "51d83883-4103-437c-b4b1-731cb73d786c",
  "boys' love": "5920b825-4181-4a17-beeb-9918b0ff7a30",
  "incest": "5bd0e105-4481-44ca-b6e7-7544da56b1a3",
  "crime": "5ca48985-9a9d-4bd8-be29-80dc0303db72",
  "survival": "5fff9cde-849c-4d78-aab0-0d52b2ee1d25",
  "zombies": "631ef465-9aba-4afb-b0fc-ea10efe274a8",
  "reverse harem": "65761a2a-415e-47f3-bef2-a9dababba7a6",
  "sports": "69964a64-2f90-4d33-beeb-f3ed2875eb4c",
  "superhero": "7064a261-a137-4d3a-8848-2d385de3a99c",
  "martial arts": "799c202e-7daa-44eb-9cf7-8a3c0441531e",
  "fan colored": "7b2ce280-79ef-4c09-9b58-12b7c23a9b78",
  "samurai": "81183756-1453-4c81-aa9e-f6e1b63be016",
  "magical girls": "81c836c9-914a-4eca-981a-560dad663e73",
  "mafia": "85daba54-a71c-4554-8a28-9901a8b0afad",
  "adventure": "87cc87cd-a395-47af-b27a-93258283bbc6",
  "self-published": "891cf039-b895-47f0-9229-bef4c96eccd4",
  "virtual reality": "8c86611e-fab7-4986-9dec-d1a2f44acdd5",
  "office workers": "92d6d951-ca5e-429c-ac78-451071cbf064",
  "video games": "9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8",
  "post-apocalyptic": "9467335a-1b83-4497-9231-765337a00b96",
  "sexual violence": "97893a4c-12af-4dac-b6be-0dffb353568e",
  "crossdressing": "9ab53f92-3eed-4e9b-903a-917c86035ee3",
  "magic": "a1f53773-c69a-4ce5-8cab-fffcd90b1565",
  "girls' love": "a3c67850-4684-404e-9b7f-c69850ee5da6",
  "harem": "aafb99c1-7f60-43fa-b75f-fc9502ce29c7",
  "military": "ac72833b-c4e9-4878-b9db-6c8a4a99444a",
  "wuxia": "acc803a4-c95a-4c22-86fc-eb6b582d82a2",
  "isekai": "ace04997-f6bd-436e-b261-779182193d3d",
  "4-koma": "b11fda93-8f1d-4bef-b2ed-8803d3733170",
  "doujinshi": "b13b2a48-c720-44a9-9c77-39c9979373fb",
  "philosophical": "b1e97889-25b4-4258-b28b-cd7f4d28ea9b",
  "gore": "b29d6a3d-1569-4e7a-8caf-7557bc92cd5d",
  "drama": "b9af3a63-f058-46de-a9a0-e0c13906197a",
  "medical": "c8cbe35b-1b2b-4a3f-9c37-db84c4514856",
  "school life": "caaa44eb-cd40-4177-b930-79d3ef2afe87",
  "mahjong": "cb562697-929f-4d28-9d66-6d3995bf2592",
  "horror": "cdad7e68-1419-41dd-bdce-27753074a640",
  "fantasy": "cdc58593-87dd-415e-bbc0-2ec27bf404cc",
  "villainess": "d14322ac-4d6f-4e9b-afd9-629d5f4d8a41",
  "vampires": "d7d1730f-6eb0-4ba6-9437-602cac38664c",
  "delinquents": "da2d50ca-3018-4cc0-ac7a-6b7d472a29ea",
  "monster girls": "dd1f77c5-dea9-4e2b-97ae-224af09caf99",
  "shota": "ddefd648-5140-4e5f-ba18-4eca4071d19b",
  "police": "df33b754-73a3-4c54-80e6-1a74a8058539",
  "web comic": "e197df38-d0e7-43b5-9b09-2842d0c326dd",
  "slice of life": "e5301a23-ebd9-49dd-a0cb-2add944c7fe9",
  "aliens": "e64f6742-c834-471d-8d72-dd51fc02b835",
  "cooking": "ea2bc92d-1c26-4930-9b7c-d5c0dc1b6869",
  "supernatural": "eabc5b4c-6aff-42f3-b657-3e90cbd00b75",
  "mystery": "ee968100-4191-4968-93d3-f82d72be7e46",
  "adaptation": "f4122d1c-3b44-44d0-9936-ff7502c39ad3",
  "music": "f42fbf9e-188a-447b-9fdc-f19dc1e4d685",
  "full color": "f5ba408b-0e7a-484d-8d49-4e9125ac96de",
  "tragedy": "f8f62932-27da-4fe4-8ee1-6779a8c5edba",
  "gyaru": "fad12b5e-68ba-460e-b933-9ae8318f5b65"
};
function getMangaDexTagId(genreName) {
  const normalized = genreName.trim().toLowerCase();
  if (MANGADEX_TAGS[normalized]) {
    return MANGADEX_TAGS[normalized];
  }
  if (normalized === "dungeon" || normalized === "system") {
    return MANGADEX_TAGS["video games"];
  }
  if (normalized === "murim" || normalized === "wuxia") {
    return MANGADEX_TAGS["wuxia"];
  }
  if (normalized === "apocalyptic") {
    return MANGADEX_TAGS["post-apocalyptic"];
  }
  if (normalized === "high school") {
    return MANGADEX_TAGS["school life"];
  }
  return void 0;
}

// src/services/providers/mangadex/mangadexProvider.ts
var DEFAULT_MANGADEX_URL = "https://api.mangadex.org";
var REQUEST_TIMEOUT_MS4 = 1e4;
var MangaDexProvider = class {
  constructor() {
    this.baseUrl = process.env.MANGADEX_API_URL || DEFAULT_MANGADEX_URL;
  }
  /**
   * Universal fetch helper with timeout, status handling, and rate limit handling.
   */
  async request(endpoint, params) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val === void 0 || val === null) continue;
        if (Array.isArray(val)) {
          for (const item of val) {
            url.searchParams.append(key, String(item));
          }
        } else {
          url.searchParams.append(key, String(val));
        }
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS4);
    try {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "AnimeHub/1.0"
        },
        signal: controller.signal
      });
      if (res.status === 429) {
        throw new Error("MangaDex API rate limit reached. Please try again in a moment.");
      }
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`MangaDex API error ${res.status}: ${errorText.slice(0, 100)}`);
      }
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(`MangaDex request timed out after ${REQUEST_TIMEOUT_MS4}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  /**
   * Fetches batch statistics for multiple manga IDs.
   */
  async fetchBatchStats(ids) {
    if (ids.length === 0) return {};
    try {
      const queryParams = {
        "manga[]": ids
      };
      const res = await this.request("/statistics/manga", queryParams);
      return res.statistics || {};
    } catch (err) {
      console.info(`[MangaDexProvider] Batch statistics unavailable: ${err.message}`);
      return {};
    }
  }
  /**
   * Maps client sort parameter to MangaDex order query params.
   */
  mapSort(sort) {
    switch (sort) {
      case "popularity":
        return { "order[followedCount]": "desc" };
      case "rating":
        return { "order[rating]": "desc" };
      case "release":
      case "latest":
        return { "order[latestUploadedChapter]": "desc" };
      case "title":
        return { "order[title]": "asc" };
      case "trending":
      default:
        return { "order[followedCount]": "desc", "order[rating]": "desc" };
    }
  }
  /**
   * Maps client status parameter to MangaDex status query params.
   */
  mapStatus(status) {
    if (!status || status === "All") return void 0;
    const s = status.toLowerCase();
    if (s === "publishing" || s === "airing") return ["ongoing"];
    if (s === "completed") return ["completed"];
    if (s === "hiatus") return ["hiatus"];
    return void 0;
  }
  /**
   * Fetch trending titles from MangaDex
   */
  async getTrending(limit = 12, page = 1, type = "ALL") {
    const offset = (page - 1) * limit;
    const queryParams = {
      limit,
      offset,
      "includes[]": ["cover_art", "author", "artist"],
      "contentRating[]": ["safe", "suggestive"],
      "order[followedCount]": "desc",
      "order[rating]": "desc"
    };
    if (type === "MANHWA") {
      queryParams["originalLanguage[]"] = ["ko"];
    } else if (type === "MANGA") {
      queryParams["originalLanguage[]"] = ["ja"];
    }
    const res = await this.request("/manga", queryParams);
    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);
    return mangaList.map(
      (m) => normalizeMangaDexMedia(
        m,
        statsMap[m.id],
        type === "MANHWA" ? "MANHWA" : type === "MANGA" ? "MANGA" : void 0
      )
    ).filter((item) => isSafeContent(item));
  }
  /**
   * Fetch popular titles from MangaDex
   */
  async getPopular(limit = 12, page = 1, type = "ALL") {
    const offset = (page - 1) * limit;
    const queryParams = {
      limit,
      offset,
      "includes[]": ["cover_art", "author", "artist"],
      "contentRating[]": ["safe", "suggestive"],
      "order[followedCount]": "desc"
    };
    if (type === "MANHWA") {
      queryParams["originalLanguage[]"] = ["ko"];
    } else if (type === "MANGA") {
      queryParams["originalLanguage[]"] = ["ja"];
    }
    const res = await this.request("/manga", queryParams);
    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);
    return mangaList.map(
      (m) => normalizeMangaDexMedia(
        m,
        statsMap[m.id],
        type === "MANHWA" ? "MANHWA" : type === "MANGA" ? "MANGA" : void 0
      )
    ).filter((item) => isSafeContent(item));
  }
  /**
   * Fetch latest releases from MangaDex
   */
  async getLatest(limit = 12, page = 1, type = "ALL") {
    const offset = (page - 1) * limit;
    const queryParams = {
      limit,
      offset,
      "includes[]": ["cover_art", "author", "artist"],
      "contentRating[]": ["safe", "suggestive"],
      "order[latestUploadedChapter]": "desc"
    };
    if (type === "MANHWA") {
      queryParams["originalLanguage[]"] = ["ko"];
    } else if (type === "MANGA") {
      queryParams["originalLanguage[]"] = ["ja"];
    }
    const res = await this.request("/manga", queryParams);
    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);
    return mangaList.map(
      (m) => normalizeMangaDexMedia(
        m,
        statsMap[m.id],
        type === "MANHWA" ? "MANHWA" : type === "MANGA" ? "MANGA" : void 0
      )
    ).filter((item) => isSafeContent(item));
  }
  /**
   * Filtered & paginated query from MangaDex
   */
  async getList(params, type = "ALL") {
    const page = params.page || 1;
    const limit = params.perPage || 18;
    const offset = (page - 1) * limit;
    const queryParams = {
      limit,
      offset,
      "includes[]": ["cover_art", "author", "artist"],
      "contentRating[]": ["safe", "suggestive"],
      ...this.mapSort(params.sort)
    };
    if (params.search && params.search.trim()) {
      queryParams.title = params.search.trim();
    }
    if (params.genre && params.genre !== "All") {
      const tagId = getMangaDexTagId(params.genre);
      if (tagId) {
        queryParams["includedTags[]"] = [tagId];
      }
    }
    const statusList = this.mapStatus(params.status);
    if (statusList && statusList.length > 0) {
      queryParams["status[]"] = statusList;
    }
    if (params.year) {
      queryParams.year = params.year;
    }
    if (type === "MANHWA") {
      queryParams["originalLanguage[]"] = ["ko"];
    } else if (type === "MANGA") {
      queryParams["originalLanguage[]"] = ["ja"];
    }
    const res = await this.request("/manga", queryParams);
    const mangaList = res.data || [];
    const ids = mangaList.map((m) => m.id);
    const statsMap = await this.fetchBatchStats(ids);
    const data = mangaList.map(
      (m) => normalizeMangaDexMedia(
        m,
        statsMap[m.id],
        type === "MANHWA" ? "MANHWA" : type === "MANGA" ? "MANGA" : void 0
      )
    ).filter((item) => isSafeContent(item));
    const total = res.total || data.length;
    return {
      data,
      pageInfo: {
        currentPage: page,
        hasNextPage: offset + limit < total,
        total,
        perPage: limit,
        lastPage: Math.ceil(total / limit)
      },
      sourceProvider: "mangadex"
    };
  }
  /**
   * Fetch single manga details by ID
   */
  async getById(id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    try {
      const res = await this.request(`/manga/${id}`, {
        "includes[]": ["cover_art", "author", "artist"]
      });
      if (!res.data) return null;
      const statsMap = await this.fetchBatchStats([id]);
      const normalized = normalizeMangaDexMedia(res.data, statsMap[id]);
      return isSafeContent(normalized) ? normalized : null;
    } catch (err) {
      console.info(`[MangaDexProvider] Item ${id} unavailable: ${err.message}`);
      return null;
    }
  }
  /**
   * Search titles on MangaDex
   */
  async search(query, limit = 10, page = 1, type = "ALL") {
    return this.getList(
      {
        search: query,
        perPage: limit,
        page,
        sort: "trending"
      },
      type
    );
  }
  /**
   * Check MangaDex API health status
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4e3);
      const res = await fetch(`${this.baseUrl}/ping`, {
        signal: controller.signal,
        headers: { "User-Agent": "AnimeHub/1.0" }
      });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        return text.trim() === "pong";
      }
      return false;
    } catch {
      return false;
    }
  }
};
var mangadexProvider = new MangaDexProvider();

// src/data/mockData.ts
var mockAnimeList = [
  {
    id: "solo-leveling",
    title: "Solo Leveling: Arise",
    englishTitle: "Solo Leveling Season 2: Arise from the Shadow",
    japaneseTitle: "\u4FFA\u3060\u3051\u30EC\u30D9\u30EB\u30A2\u30C3\u30D7\u306A\u4EF6",
    type: "ANIME",
    format: "TV Series",
    rating: 8.8,
    reviewCount: "482K",
    rank: 12,
    popularity: 1,
    releaseYear: 2024,
    season: "Winter",
    status: "Airing",
    genres: ["Action", "Fantasy", "Adventure", "Supernatural"],
    synopsis: "In a world where hunters, humans who possess magical powers, battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival. After narrowly surviving an overwhelming double dungeon, a mysterious quest window only he can see turns his life upside down.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-yxY3olrjZH4k.png",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-u04tZ9wY1k0b.jpg",
    episodes: 12,
    duration: "24 min",
    studioOrAuthor: "A-1 Pictures",
    trendingRank: 1,
    isTrending: true,
    isLatest: true,
    isFeatured: true,
    trailerEmbedId: "m4_4Zc8tVv8",
    characters: [
      { id: "c1", name: "Sung Jin-woo", role: "Main Protagonist", image: ANIMEHUB_AVATAR_FALLBACK },
      { id: "c2", name: "Cha Hae-in", role: "S-Rank Hunter", image: ANIMEHUB_AVATAR_FALLBACK },
      { id: "c3", name: "Go Gun-hee", role: "Chairman", image: ANIMEHUB_AVATAR_FALLBACK }
    ]
  },
  {
    id: "frieren-beyond-journeys-end",
    title: "Frieren: Beyond Journey's End",
    englishTitle: "Frieren: Beyond Journey's End",
    japaneseTitle: "\u846C\u9001\u306E\u30D5\u30EA\u30FC\u30EC\u30F3",
    type: "ANIME",
    format: "TV Series",
    rating: 9.3,
    reviewCount: "520K",
    rank: 1,
    popularity: 4,
    releaseYear: 2023,
    season: "Fall",
    status: "Completed",
    genres: ["Adventure", "Drama", "Fantasy"],
    synopsis: "The adventure is over, but life goes on for an elf mage just beginning to learn what living is all about. Elf mage Frieren and her courageous fellow adventurers have defeated the Demon King and brought peace to the land. But Frieren will long outlive the rest of her former party. How will she come to understand what life means to the people around her?",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-n1fmj14s2b5O.jpg",
    episodes: 28,
    duration: "24 min",
    studioOrAuthor: "Madhouse",
    trendingRank: 2,
    isTrending: true,
    isLatest: false,
    characters: [
      { id: "c4", name: "Frieren", role: "Elf Mage", image: ANIMEHUB_AVATAR_FALLBACK },
      { id: "c5", name: "Fern", role: "Apprentice Mage", image: ANIMEHUB_AVATAR_FALLBACK },
      { id: "c6", name: "Stark", role: "Warrior", image: ANIMEHUB_AVATAR_FALLBACK }
    ]
  },
  {
    id: "jujutsu-kaisen-s2",
    title: "Jujutsu Kaisen Season 2",
    englishTitle: "Jujutsu Kaisen: Shibuya Incident Arc",
    japaneseTitle: "\u546A\u8853\u5EFB\u6226 \u61D0\u7389\u30FB\u7389\u6298 / \u6E0B\u8C37\u4E8B\u5909",
    type: "ANIME",
    format: "TV Series",
    rating: 8.9,
    reviewCount: "710K",
    rank: 18,
    popularity: 2,
    releaseYear: 2023,
    season: "Summer",
    status: "Completed",
    genres: ["Action", "Supernatural", "Dark Fantasy"],
    synopsis: "The past comes to light when second-year students Satoru Gojo and Suguru Geto are tasked with escorting the Star Plasma Vessel to Master Tengen. But when an assassin unleashes devastation, their friendship is fractured forever, paving the way for the catastrophic Shibuya Incident.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx145064-rnN9eUuF6z2N.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/145064-77vLwVw5qA2N.jpg",
    episodes: 23,
    duration: "24 min",
    studioOrAuthor: "MAPPA",
    trendingRank: 3,
    isTrending: true,
    isLatest: false,
    recommendations: [
      { id: "127230", title: "Chainsaw Man", englishTitle: "Chainsaw Man", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-DdP4vAdssLoz.png", rating: 8.3, type: "ANIME", releaseYear: 2022 },
      { id: "101922", title: "Demon Slayer: Kimetsu no Yaiba", englishTitle: "Demon Slayer", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg", rating: 8.3, type: "ANIME", releaseYear: 2019 },
      { id: "16498", title: "Attack on Titan", englishTitle: "Attack on Titan", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg", rating: 8.5, type: "ANIME", releaseYear: 2013 },
      { id: "21507", title: "Mob Psycho 100", englishTitle: "Mob Psycho 100", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21507-6YUSbh2m0N1p.jpg", rating: 8.4, type: "ANIME", releaseYear: 2016 }
    ]
  },
  {
    id: "demon-slayer-hashira",
    title: "Demon Slayer: Hashira Training Arc",
    englishTitle: "Demon Slayer: Kimetsu no Yaiba Hashira Training Arc",
    japaneseTitle: "\u9B3C\u6EC5\u306E\u5203 \u67F1\u7A3D\u53E4\u7DE8",
    type: "ANIME",
    format: "TV Series",
    rating: 8.6,
    reviewCount: "390K",
    rank: 45,
    popularity: 3,
    releaseYear: 2024,
    season: "Spring",
    status: "Completed",
    genres: ["Action", "Historical", "Supernatural"],
    synopsis: "Tanjiro and the Demon Slayer Corps undertake rigorous training with the most powerful combatants, the Hashira, in preparation for the forthcoming climactic war against Kibutsuji Muzan.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx166240-hU8zKsmY7QYf.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/166240-9xMhOaV1d9pQ.jpg",
    episodes: 8,
    duration: "25 min",
    studioOrAuthor: "ufotable",
    trendingRank: 4,
    isTrending: true,
    isLatest: true,
    recommendations: [
      { id: "113415", title: "JUJUTSU KAISEN", englishTitle: "JUJUTSU KAISEN", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg", rating: 8.4, type: "ANIME", releaseYear: 2020 },
      { id: "101347", title: "Dororo", englishTitle: "Dororo", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101347-TGaDwEYqLfm1.jpg", rating: 8.1, type: "ANIME", releaseYear: 2019 },
      { id: "127230", title: "Chainsaw Man", englishTitle: "Chainsaw Man", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-DdP4vAdssLoz.png", rating: 8.3, type: "ANIME", releaseYear: 2022 },
      { id: "104276", title: "My Hero Academia Season 4", englishTitle: "My Hero Academia 4", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx104276-SnEowMvesWIE.png", rating: 7.9, type: "ANIME", releaseYear: 2019 }
    ]
  },
  {
    id: "chainsaw-man",
    title: "Chainsaw Man",
    englishTitle: "Chainsaw Man",
    japaneseTitle: "\u30C1\u30A7\u30F3\u30BD\u30FC\u30DE\u30F3",
    type: "ANIME",
    format: "TV Series",
    rating: 8.7,
    reviewCount: "620K",
    rank: 35,
    popularity: 5,
    releaseYear: 2022,
    season: "Fall",
    status: "Completed",
    genres: ["Action", "Gore", "Supernatural"],
    synopsis: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita. Due to the debt his father left behind, he has been living a rock-bottom life while harvesting devil corpses with Pochita. One day, Denji is betrayed and killed. As his consciousness fades, he makes a contract with Pochita and gets revived as "Chainsaw Man".',
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-DdP4vAdssLoz.png",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/127230-o8IRwCGVr9KW.jpg",
    episodes: 12,
    duration: "24 min",
    studioOrAuthor: "MAPPA",
    trendingRank: 5,
    isTrending: true,
    isLatest: false,
    recommendations: [
      { id: "113415", title: "JUJUTSU KAISEN", englishTitle: "JUJUTSU KAISEN", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg", rating: 8.4, type: "ANIME", releaseYear: 2020 },
      { id: "105228", title: "Dorohedoro", englishTitle: "Dorohedoro", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx105228-I4xr84QS9Pvk.jpg", rating: 7.9, type: "ANIME", releaseYear: 2020 },
      { id: "101922", title: "Demon Slayer: Kimetsu no Yaiba", englishTitle: "Demon Slayer", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg", rating: 8.3, type: "ANIME", releaseYear: 2019 },
      { id: "20623", title: "Parasyte -the maxim-", englishTitle: "Parasyte", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20623-dUARfggnNDOe.jpg", rating: 8.1, type: "ANIME", releaseYear: 2014 }
    ]
  },
  {
    id: "kaiju-no-8",
    title: "Kaiju No. 8",
    englishTitle: "Kaiju No. 8",
    japaneseTitle: "\u602A\u73638\u53F7",
    type: "ANIME",
    format: "TV Series",
    rating: 8.4,
    reviewCount: "245K",
    rank: 72,
    popularity: 8,
    releaseYear: 2024,
    season: "Spring",
    status: "Airing",
    genres: ["Action", "Sci-Fi", "Military"],
    synopsis: "Kafka Hibino once dreamed of joining the Defense Force to fight catastrophic monsters known as Kaiju. After a small Kaiju enters his body, he unexpectedly gains monstrous power and the code name Kaiju No. 8.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx153288-25FBfFJzEQ5O.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/153288-JNsWuMPMAuJL.jpg",
    episodes: 12,
    duration: "24 min",
    studioOrAuthor: "Production I.G",
    trendingRank: 6,
    isTrending: false,
    isLatest: true,
    recommendations: [
      { id: "127230", title: "Chainsaw Man", englishTitle: "Chainsaw Man", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-DdP4vAdssLoz.png", rating: 8.3, type: "ANIME", releaseYear: 2022 },
      { id: "16498", title: "Attack on Titan", englishTitle: "Attack on Titan", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg", rating: 8.5, type: "ANIME", releaseYear: 2013 },
      { id: "20623", title: "Parasyte -the maxim-", englishTitle: "Parasyte", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20623-dUARfggnNDOe.jpg", rating: 8.1, type: "ANIME", releaseYear: 2014 },
      { id: "113415", title: "JUJUTSU KAISEN", englishTitle: "JUJUTSU KAISEN", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg", rating: 8.4, type: "ANIME", releaseYear: 2020 }
    ]
  },
  {
    id: "dandadan",
    title: "Dandadan",
    englishTitle: "Dandadan",
    japaneseTitle: "\u30C0\u30F3\u30C0\u30C0\u30F3",
    type: "ANIME",
    format: "TV Series",
    rating: 8.7,
    reviewCount: "310K",
    rank: 29,
    popularity: 6,
    releaseYear: 2024,
    season: "Fall",
    status: "Airing",
    genres: ["Supernatural", "Comedy", "Sci-Fi", "Romance"],
    synopsis: "Momo Ayase strikes up an unusual friendship with an occult fanatic in her school, whom she nicknames Okarun. While Momo believes in ghosts, she denies aliens exist, and vice versa. To determine who is right, they embark on a series of supernatural encounters.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx171018-60q1B6GK2Ghb.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/171018-SpwPNAduszXl.jpg",
    episodes: 12,
    duration: "24 min",
    studioOrAuthor: "Science SARU",
    trendingRank: 7,
    isTrending: true,
    isLatest: true,
    recommendations: [
      { id: "21507", title: "Mob Psycho 100", englishTitle: "Mob Psycho 100", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21507-6YUSbh2m0N1p.jpg", rating: 8.4, type: "ANIME", releaseYear: 2016 },
      { id: "127230", title: "Chainsaw Man", englishTitle: "Chainsaw Man", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-DdP4vAdssLoz.png", rating: 8.3, type: "ANIME", releaseYear: 2022 },
      { id: "113415", title: "JUJUTSU KAISEN", englishTitle: "JUJUTSU KAISEN", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg", rating: 8.4, type: "ANIME", releaseYear: 2020 }
    ]
  },
  {
    id: "attack-on-titan-final",
    title: "Attack on Titan: The Final Season",
    englishTitle: "Attack on Titan: Final Chapters",
    japaneseTitle: "\u9032\u6483\u306E\u5DE8\u4EBA The Final Season",
    type: "ANIME",
    format: "Special",
    rating: 9.1,
    reviewCount: "980K",
    rank: 4,
    popularity: 7,
    releaseYear: 2023,
    season: "Fall",
    status: "Completed",
    genres: ["Action", "Drama", "Suspense", "Mystery"],
    synopsis: "The fate of humanity hangs in the balance as Eren Yeager commands the Rumbling, a march of colossal Titans threatening to obliterate all civilization outside Paradis Island.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx142838-8c11k80M3E0f.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/142838-v4eI7X0Z7Gj4.jpg",
    episodes: 2,
    duration: "85 min",
    studioOrAuthor: "MAPPA",
    isTrending: false,
    isLatest: false,
    recommendations: [
      { id: "136430", title: "Vinland Saga Season 2", englishTitle: "Vinland Saga Season 2", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx136430-gsBsJjA7hGh9.jpg", rating: 9, type: "ANIME", releaseYear: 2023 },
      { id: "153288", title: "Kaiju No. 8", englishTitle: "Kaiju No. 8", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx153288-25FBfFJzEQ5O.jpg", rating: 8.4, type: "ANIME", releaseYear: 2024 },
      { id: "113415", title: "JUJUTSU KAISEN", englishTitle: "JUJUTSU KAISEN", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg", rating: 8.4, type: "ANIME", releaseYear: 2020 }
    ]
  },
  {
    id: "spy-x-family-s2",
    title: "Spy x Family Season 2",
    englishTitle: "Spy x Family Season 2",
    japaneseTitle: "SPY\xD7FAMILY Season 2",
    type: "ANIME",
    format: "TV Series",
    rating: 8.3,
    reviewCount: "340K",
    rank: 88,
    popularity: 9,
    releaseYear: 2023,
    season: "Fall",
    status: "Completed",
    genres: ["Comedy", "Action", "Slice of Life"],
    synopsis: "Master spy Twilight continues his undercover assignment Operation Strix while posing as psychiatrist Loid Forger alongside his assassin wife Yor and telepathic adopted daughter Anya.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx158870-N7u8w0i8bFhJ.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/158870-1V32mR8RjI7L.jpg",
    episodes: 12,
    duration: "24 min",
    studioOrAuthor: "WIT Studio & CloverWorks",
    isTrending: false,
    isLatest: false,
    recommendations: [
      { id: "140960", title: "SPY x FAMILY", englishTitle: "SPY x FAMILY", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx140960-vNeGbkTIwaA0.jpg", rating: 8.4, type: "ANIME", releaseYear: 2022 },
      { id: "11061", title: "Hunter x Hunter (2011)", englishTitle: "Hunter x Hunter", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11061-y5gsT1hoHuHw.png", rating: 8.9, type: "ANIME", releaseYear: 2011 },
      { id: "166531", title: "Oshi no Ko Season 2", englishTitle: "Oshi no Ko Season 2", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx166531-1J0qE7WlR8T5.jpg", rating: 8.6, type: "ANIME", releaseYear: 2024 }
    ]
  },
  {
    id: "oshi-no-ko-s2",
    title: "Oshi no Ko Season 2",
    englishTitle: "Oshi no Ko Season 2",
    japaneseTitle: "\u3010\u63A8\u3057\u306E\u5B50\u3011\u7B2C2\u671F",
    type: "ANIME",
    format: "TV Series",
    rating: 8.6,
    reviewCount: "290K",
    rank: 51,
    popularity: 10,
    releaseYear: 2024,
    season: "Summer",
    status: "Completed",
    genres: ["Drama", "Mystery", "Supernatural"],
    synopsis: "Aqua and Ruby Hoshino delve deeper into the complex entertainment industry as Aqua accepts a role in the high-stakes Tokyo Blade 2.5D theatrical stage play.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx166531-1J0qE7WlR8T5.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/166531-tJ91M5zEa0bH.jpg",
    episodes: 13,
    duration: "24 min",
    studioOrAuthor: "Doga Kobo",
    isTrending: false,
    isLatest: true,
    recommendations: [
      { id: "150672", title: "\u3010OSHI NO KO\u3011", englishTitle: "\u3010OSHI NO KO\u3011", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx150672-68mEeh6bCq7R.jpg", rating: 8.6, type: "ANIME", releaseYear: 2023 },
      { id: "158870", title: "Spy x Family Season 2", englishTitle: "Spy x Family Season 2", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx158870-N7u8w0i8bFhJ.jpg", rating: 8.3, type: "ANIME", releaseYear: 2023 }
    ]
  },
  {
    id: "bleach-tybw",
    title: "Bleach: Thousand-Year Blood War",
    englishTitle: "Bleach: Thousand-Year Blood War - The Conflict",
    japaneseTitle: "BLEACH \u5343\u5E74\u8840\u6226\u7BC7-\u76F8\u524B\u8B5A-",
    type: "ANIME",
    format: "TV Series",
    rating: 8.9,
    reviewCount: "410K",
    rank: 15,
    popularity: 11,
    releaseYear: 2024,
    season: "Fall",
    status: "Airing",
    genres: ["Action", "Adventure", "Supernatural"],
    synopsis: "The peace is broken when warning sirens blare through the Soul Society. Residents are disappearing without a trace, and nobody knows who is behind it. The Quincy empire of Yhwach launches their decisive invasion.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx159322-N9jF1n8cT2W1.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/159322-7nKmR0wP5xLa.jpg",
    episodes: 13,
    duration: "24 min",
    studioOrAuthor: "Pierrot Films",
    isTrending: false,
    isLatest: true,
    recommendations: [
      { id: "113415", title: "JUJUTSU KAISEN", englishTitle: "JUJUTSU KAISEN", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg", rating: 8.4, type: "ANIME", releaseYear: 2020 },
      { id: "269", title: "Bleach", englishTitle: "Bleach", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx269-d2GmRkJbMopq.png", rating: 7.9, type: "ANIME", releaseYear: 2004 },
      { id: "101922", title: "Demon Slayer: Kimetsu no Yaiba", englishTitle: "Demon Slayer", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg", rating: 8.3, type: "ANIME", releaseYear: 2019 }
    ]
  },
  {
    id: "vinland-saga-s2",
    title: "Vinland Saga Season 2",
    englishTitle: "Vinland Saga Season 2",
    japaneseTitle: "\u30F4\u30A3\u30F3\u30E9\u30F3\u30C9\u30FB\u30B5\u30AC SEASON 2",
    type: "ANIME",
    format: "TV Series",
    rating: 9,
    reviewCount: "470K",
    rank: 9,
    popularity: 12,
    releaseYear: 2023,
    season: "Winter",
    status: "Completed",
    genres: ["Historical", "Drama", "Adventure"],
    synopsis: 'A millennium begins in the southern region of the Jutland peninsula in Denmark. Thorfin is bought by the landowner Ketil as a "slave" and engages in land reclamation work on his farm, beginning an arduous spiritual journey.',
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx136430-gsBsJjA7hGh9.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/136430-ktoFZnyubhHg.jpg",
    episodes: 24,
    duration: "25 min",
    studioOrAuthor: "MAPPA",
    isTrending: false,
    isLatest: false,
    recommendations: [
      { id: "33", title: "Berserk", englishTitle: "Berserk", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx33-PSwfE5B0gejI.jpg", rating: 8.4, type: "ANIME", releaseYear: 1997 },
      { id: "101347", title: "Dororo", englishTitle: "Dororo", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101347-TGaDwEYqLfm1.jpg", rating: 8.1, type: "ANIME", releaseYear: 2019 },
      { id: "16498", title: "Attack on Titan", englishTitle: "Attack on Titan", posterImage: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg", rating: 8.5, type: "ANIME", releaseYear: 2013 }
    ]
  }
];
var mockMangaList = [
  {
    id: "berserk",
    title: "Berserk",
    englishTitle: "Berserk",
    japaneseTitle: "\u30D9\u30EB\u30BB\u30EB\u30AF",
    type: "MANGA",
    format: "Manga",
    rating: 9.5,
    reviewCount: "680K",
    rank: 1,
    popularity: 1,
    releaseYear: 1989,
    status: "Publishing",
    genres: ["Dark Fantasy", "Action", "Psychological", "Horror"],
    synopsis: 'Guts, a former mercenary now known as the "Black Swordsman," is out for revenge against his former comrade Griffith, who sacrificed his band to become a demon lord. Armed with his gigantic Dragon Slayer sword and a prosthetic arm, Guts battles terrifying apostles.',
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30002-77t9kWx2aF4G.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30002-77t9kWx2aF4G.jpg",
    chapters: 376,
    volumes: 42,
    studioOrAuthor: "Kentarou Miura / Studio Gaga",
    isTrending: true
  },
  {
    id: "one-piece-manga",
    title: "One Piece",
    englishTitle: "One Piece",
    japaneseTitle: "ONE PIECE",
    type: "MANGA",
    format: "Manga",
    rating: 9.2,
    reviewCount: "890K",
    rank: 3,
    popularity: 2,
    releaseYear: 1997,
    status: "Publishing",
    genres: ["Action", "Adventure", "Fantasy", "Comedy"],
    synopsis: "Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become the King of All Pirates. With a course charted for the treacherous waters of the Grand Line and beyond, this is one captain who will never give up until he has claimed the greatest treasure on Earth: the Legendary One Piece!",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1mmnc472851L.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1mmnc472851L.jpg",
    chapters: 1125,
    volumes: 109,
    studioOrAuthor: "Eiichiro Oda",
    isTrending: true
  },
  {
    id: "vagabond",
    title: "Vagabond",
    englishTitle: "Vagabond",
    japaneseTitle: "\u30D0\u30AC\u30DC\u30F3\u30C9",
    type: "MANGA",
    format: "Manga",
    rating: 9.3,
    reviewCount: "410K",
    rank: 2,
    popularity: 3,
    releaseYear: 1998,
    status: "Hiatus",
    genres: ["Historical", "Action", "Philosophical", "Martial Arts"],
    synopsis: 'Growing up in 16th-century Sengoku-era Japan, Shinmen Takezou is shunned by local villagers as a devil child. After surviving the Battle of Sekigahara, he embarks on a legendary pilgrimage to become "invincible under the heavens" as Miyamoto Musashi.',
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30656-74jS1gA034T7.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30656-74jS1gA034T7.jpg",
    chapters: 327,
    volumes: 37,
    studioOrAuthor: "Takehiko Inoue",
    isTrending: true
  },
  {
    id: "monster-manga",
    title: "Monster",
    englishTitle: "Monster",
    japaneseTitle: "MONSTER",
    type: "MANGA",
    format: "Manga",
    rating: 9.1,
    reviewCount: "320K",
    rank: 5,
    popularity: 5,
    releaseYear: 1994,
    status: "Completed",
    genres: ["Psychological", "Mystery", "Thriller", "Drama"],
    synopsis: "Kenzou Tenma, an elite Japanese neurosurgeon working in D\xFCsseldorf, Germany, chooses to save the life of a critically wounded boy rather than the town mayor. Years later, Tenma discovers the boy he saved has grown into an intelligent, ruthless sociopathic killer.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30001-f1gK4w8vJ6mK.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30001-f1gK4w8vJ6mK.jpg",
    chapters: 162,
    volumes: 18,
    studioOrAuthor: "Naoki Urasawa",
    isTrending: false
  },
  {
    id: "tokyo-ghoul-manga",
    title: "Tokyo Ghoul",
    englishTitle: "Tokyo Ghoul",
    japaneseTitle: "\u6771\u4EAC\u55B0\u7A2E\u30C8\u30FC\u30AD\u30E7\u30FC\u30B0\u30FC\u30EB",
    type: "MANGA",
    format: "Manga",
    rating: 8.8,
    reviewCount: "540K",
    rank: 22,
    popularity: 4,
    releaseYear: 2011,
    status: "Completed",
    genres: ["Dark Fantasy", "Supernatural", "Horror", "Psychological"],
    synopsis: "Ken Kaneki is a bookish college student whose encounter with a beautiful ghoul leaves him transformed into the first half-human, half-ghoul hybrid, thrust into a hidden subterranean conflict beneath the streets of Tokyo.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx63327-ijhK5X3zV1xM.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx63327-ijhK5X3zV1xM.jpg",
    chapters: 144,
    volumes: 14,
    studioOrAuthor: "Sui Ishida",
    isTrending: false
  },
  {
    id: "blue-lock-manga",
    title: "Blue Lock",
    englishTitle: "Blue Lock",
    japaneseTitle: "\u30D6\u30EB\u30FC\u30ED\u30C3\u30AF",
    type: "MANGA",
    format: "Manga",
    rating: 8.7,
    reviewCount: "310K",
    rank: 30,
    popularity: 6,
    releaseYear: 2018,
    status: "Publishing",
    genres: ["Sports", "Psychological", "Shounen"],
    synopsis: "Following the 2018 World Cup defeat, the Japan Football Union launches a cutthroat prison-like facility called Blue Lock where 300 high school strikers compete against each other to create the world\u2019s most selfish, unstoppable ace striker.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx106130-i4h4hG233G0a.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx106130-i4h4hG233G0a.jpg",
    chapters: 280,
    volumes: 30,
    studioOrAuthor: "Muneyuki Kaneshiro / Yusuke Nomura",
    isTrending: true
  },
  {
    id: "kingdom-manga",
    title: "Kingdom",
    englishTitle: "Kingdom",
    japaneseTitle: "\u30AD\u30F3\u30B0\u30C0\u30E0",
    type: "MANGA",
    format: "Manga",
    rating: 9,
    reviewCount: "275K",
    rank: 10,
    popularity: 7,
    releaseYear: 2006,
    status: "Publishing",
    genres: ["Historical", "Military", "Action"],
    synopsis: "During China\u2019s Warring States period, orphan war slaves Xin and Piao dream of becoming Great Generals of the Heavens. When destiny unites Xin with the young King Ying Zheng of Qin, they set out to unite the warring kingdoms under one banner.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30010-P4f5e71G8g9F.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30010-P4f5e71G8g9F.jpg",
    chapters: 810,
    volumes: 73,
    studioOrAuthor: "Yasuhisa Hara",
    isTrending: false
  },
  {
    id: "chainsaw-man-manga",
    title: "Chainsaw Man (Part 2)",
    englishTitle: "Chainsaw Man - Academy Arc",
    japaneseTitle: "\u30C1\u30A7\u30F3\u30BD\u30FC\u30DE\u30F3 \u7B2C\u4E8C\u90E8",
    type: "MANGA",
    format: "Manga",
    rating: 8.9,
    reviewCount: "490K",
    rank: 14,
    popularity: 8,
    releaseYear: 2022,
    status: "Publishing",
    genres: ["Action", "Comedy", "Supernatural"],
    synopsis: "The story moves to high school student Asa Mitaka, who forms a forced contract with the War Devil Yoru, embarking on a quest to hunt down Chainsaw Man while Denji tries to balance public fame and mundane teenage life.",
    posterImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-9M8bK545oA1w.jpg",
    bannerImage: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-9M8bK545oA1w.jpg",
    chapters: 180,
    volumes: 18,
    studioOrAuthor: "Tatsuki Fujimoto",
    isTrending: false
  }
];
var mockManhwaList = [
  {
    id: "omniscient-readers-viewpoint",
    title: "Omniscient Reader's Viewpoint",
    englishTitle: "Omniscient Reader's Viewpoint",
    japaneseTitle: "\uC804\uC9C0\uC801 \uB3C5\uC790 \uC2DC\uC810",
    type: "MANHWA",
    format: "Webtoon",
    rating: 9.4,
    reviewCount: "580K",
    rank: 1,
    popularity: 1,
    releaseYear: 2020,
    status: "Publishing",
    genres: ["Fantasy", "Action", "Apocalyptic", "System"],
    synopsis: 'Dokja was an average office worker whose sole interest was reading his favorite web novel "Three Ways to Survive the Apocalypse." But when the novel suddenly becomes reality, he is the only person who knows how the world will end and how to survive the lethal scenarios.',
    posterImage: "https://uploads.mangadex.org/covers/9a414441-bbad-43f1-a3a7-dc262ca790a3/be18dc9a-7f1c-4ca5-b318-ffff2d7d58c3.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/9a414441-bbad-43f1-a3a7-dc262ca790a3/be18dc9a-7f1c-4ca5-b318-ffff2d7d58c3.jpg.512.jpg",
    chapters: 232,
    studioOrAuthor: "sing N song / Sleepy-C (Redice Studio)",
    isTrending: true
  },
  {
    id: "solo-leveling-manhwa",
    title: "Solo Leveling (Original Webtoon)",
    englishTitle: "Solo Leveling",
    japaneseTitle: "\uB098 \uD63C\uC790\uB9CC \uB808\uBCA8\uC5C5",
    type: "MANHWA",
    format: "Webtoon",
    rating: 9.3,
    reviewCount: "1.2M",
    rank: 2,
    popularity: 2,
    releaseYear: 2018,
    status: "Completed",
    genres: ["Action", "Fantasy", "Overpowered MC"],
    synopsis: "The landmark webtoon that inspired millions globally. Follow Sung Jinwoo from the weakest E-rank hunter to the Shadow Monarch, standing as humanity\u2019s ultimate vanguard against planetary catastrophe.",
    posterImage: "https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg.512.jpg",
    chapters: 200,
    studioOrAuthor: "Chugong / DUBU (Redice Studio)",
    isTrending: true
  },
  {
    id: "tower-of-god",
    title: "Tower of God",
    englishTitle: "Tower of God",
    japaneseTitle: "\uC2E0\uC758 \uD0D1",
    type: "MANHWA",
    format: "Webtoon",
    rating: 9,
    reviewCount: "870K",
    rank: 4,
    popularity: 3,
    releaseYear: 2010,
    status: "Publishing",
    genres: ["Fantasy", "Action", "Mystery", "Supernatural"],
    synopsis: "What do you desire? Money and wealth? Honor and pride? Authority and power? Revenge? Or something that transcends them all? Whatever you desire\u2014it is here at the top of the Tower.",
    posterImage: "https://uploads.mangadex.org/covers/c0ee660b-f9f2-45c3-8068-5123ff53f84a/311cf373-290a-47f6-a3f1-5d7c4085c5b2.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/c0ee660b-f9f2-45c3-8068-5123ff53f84a/311cf373-290a-47f6-a3f1-5d7c4085c5b2.jpg.512.jpg",
    chapters: 640,
    studioOrAuthor: "SIU",
    isTrending: true
  },
  {
    id: "the-beginning-after-the-end",
    title: "The Beginning After The End",
    englishTitle: "The Beginning After The End",
    japaneseTitle: "\uB05D\uC774 \uC544\uB2CC \uC2DC\uC791",
    type: "MANHWA",
    format: "Webtoon",
    rating: 9.1,
    reviewCount: "490K",
    rank: 3,
    popularity: 4,
    releaseYear: 2018,
    status: "Publishing",
    genres: ["Isekai", "Magic", "Adventure", "Action"],
    synopsis: "King Grey has unrivaled strength, wealth, and prestige in a world governed by martial ability. However, solitude lingers behind greatness. Reborn into a new world steeped in magic and monsters, the king gets a second chance at living a meaningful life.",
    posterImage: "https://uploads.mangadex.org/covers/f806a542-50f2-4980-aded-f5940044f8e7/9f8d78d9-8607-4a18-9906-8af0d1a7acc1.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/f806a542-50f2-4980-aded-f5940044f8e7/9f8d78d9-8607-4a18-9906-8af0d1a7acc1.jpg.512.jpg",
    chapters: 195,
    studioOrAuthor: "TurtleMe / Fuyuki23",
    isTrending: true
  },
  {
    id: "lookism",
    title: "Lookism",
    englishTitle: "Lookism",
    japaneseTitle: "\uC678\uBAA8\uC9C0\uC0C1\uC8FC\uC758",
    type: "MANHWA",
    format: "Webtoon",
    rating: 8.8,
    reviewCount: "620K",
    rank: 7,
    popularity: 5,
    releaseYear: 2014,
    status: "Publishing",
    genres: ["Action", "Drama", "Martial Arts", "High School"],
    synopsis: "Daniel Park is an overweight, bullied high school student who wakes up one morning to find that he has two bodies: his original body, and a new tall, athletic, strikingly handsome one that he controls while his other sleeps.",
    posterImage: "https://uploads.mangadex.org/covers/596191eb-69ee-4401-983e-cc07e277fa17/6df15145-f15b-43f0-b87b-22fd3694eaca.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/596191eb-69ee-4401-983e-cc07e277fa17/6df15145-f15b-43f0-b87b-22fd3694eaca.jpg.512.jpg",
    chapters: 520,
    studioOrAuthor: "Park Tae-jun",
    isTrending: false
  },
  {
    id: "wind-breaker",
    title: "Wind Breaker (Webtoon)",
    englishTitle: "Wind Breaker",
    japaneseTitle: "\uC708\uB4DC\uBE0C\uB808\uC774\uCEE4",
    type: "MANHWA",
    format: "Webtoon",
    rating: 9.1,
    reviewCount: "430K",
    rank: 5,
    popularity: 6,
    releaseYear: 2013,
    status: "Publishing",
    genres: ["Sports", "Street Racing", "Drama", "Youth"],
    synopsis: 'Jay is the high school student council president who loves solo cycling. After joining the "Hummingbird Crew", he discovers the thrills, adrenaline, and underground competitive cycling circuits of South Korea.',
    posterImage: "https://uploads.mangadex.org/covers/c1c408f6-3dec-4d62-b6b3-b57e615d933c/8b279428-fa32-49b2-bd51-4f8d4db7d420.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/c1c408f6-3dec-4d62-b6b3-b57e615d933c/8b279428-fa32-49b2-bd51-4f8d4db7d420.jpg.512.jpg",
    chapters: 505,
    studioOrAuthor: "Jo Yongseok",
    isTrending: false
  },
  {
    id: "nano-machine",
    title: "Nano Machine",
    englishTitle: "Nano Machine",
    japaneseTitle: "\uB098\uB178 \uB9C8\uC2E0",
    type: "MANHWA",
    format: "Webtoon",
    rating: 8.9,
    reviewCount: "370K",
    rank: 8,
    popularity: 7,
    releaseYear: 2020,
    status: "Publishing",
    genres: ["Murim", "Sci-Fi", "Martial Arts", "Action"],
    synopsis: "Cheon Yeo-Woon, an illegitimate prince of the Demonic Cult whose life is perpetually threatened, is visited by a descendant from the future who injects a microscopic swarm of nanomachine computers into his bloodstream.",
    posterImage: "https://uploads.mangadex.org/covers/6e4805a6-75ab-462d-883c-4ddedb8e4df6/16406b53-9224-4639-8511-9951484ad99a.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/6e4805a6-75ab-462d-883c-4ddedb8e4df6/16406b53-9224-4639-8511-9951484ad99a.jpg.512.jpg",
    chapters: 228,
    studioOrAuthor: "Hanjoongwolya / Guem-Gang-Bul-Gae",
    isTrending: false
  },
  {
    id: "return-blossoming-blade",
    title: "Return of the Blossoming Blade",
    englishTitle: "Return of the Mount Hua Sect",
    japaneseTitle: "\uD654\uC0B0\uADC0\uD658",
    type: "MANHWA",
    format: "Webtoon",
    rating: 9.2,
    reviewCount: "410K",
    rank: 6,
    popularity: 8,
    releaseYear: 2021,
    status: "Publishing",
    genres: ["Murim", "Reincarnation", "Comedy", "Action"],
    synopsis: "Cheongmyeong, the 13th disciple of the great Mount Hua Sect, slays the Heavenly Demon at the peak of 100,000 Mountains. When he awakens 100 years later as an impoverished child, he finds Mount Hua in ruins and vows to restore it to glory.",
    posterImage: "https://uploads.mangadex.org/covers/f0f62b75-5989-4f32-9b59-ab56abe35fc1/e06dc49c-60d3-41c1-8026-30e9c197c9c0.jpg.512.jpg",
    bannerImage: "https://uploads.mangadex.org/covers/f0f62b75-5989-4f32-9b59-ab56abe35fc1/e06dc49c-60d3-41c1-8026-30e9c197c9c0.jpg.512.jpg",
    chapters: 140,
    studioOrAuthor: "Biga / LICO",
    isTrending: false
  }
];
var mockNewsList = [
  {
    id: "solo-leveling-s2-announcement",
    title: "Solo Leveling Season 2 'Arise from the Shadow' Confirms Worldwide Premiere Date",
    slug: "solo-leveling-season-2-arise-from-the-shadow-premiere",
    summary: "A-1 Pictures and Aniplex have officially unveiled the primary key visual and confirmed the international simultaneous streaming schedule.",
    excerpt: "A-1 Pictures and Aniplex have officially unveiled the primary key visual and confirmed the international simultaneous streaming schedule.",
    content: `Fans worldwide are gearing up for the next chapter of Sung Jinwoo's meteoric ascent. Following the monumental success of the inaugural season, A-1 Pictures has released an extended 90-second promotional reel showcasing the high-stakes Demon Castle raid and the terrifying introduction of the Red Gate incident.

Directed by Shunsuke Nakashige, the sequel production has reportedly expanded its animation staffing with notable web-gen animators and veteran action directors who worked on Fate/Apocrypha and Sword Art Online: Alicization. Composer Hiroyuki Sawano returns to compose the score, featuring new collaborative vocal tracks with international rock vocalists.

Streaming platforms have confirmed that the second season will be broadcast globally across North America, Europe, Latin America, and Southeast Asia.`,
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/174823-7Fz6iW8y9GkU.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/174823-7Fz6iW8y9GkU.jpg",
    category: "Anime",
    author: {
      name: "Kenji Takahashi",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "Senior Anime Correspondent"
    },
    readTime: "3 min read",
    publishedAt: "2 hours ago",
    featured: true,
    tags: ["Solo Leveling", "A-1 Pictures", "Winter 2025", "Crunchyroll"],
    sourceName: "Anime News Network",
    sourceUrl: "https://www.animenewsnetwork.com"
  },
  {
    id: "mappa-new-studio-pipeline",
    title: "Studio MAPPA Announces Modern Production Facility and Work-Life Reform",
    slug: "mappa-new-studio-pipeline-upgrades",
    summary: "The acclaimed studio behind Jujutsu Kaisen and Chainsaw Man reveals upgraded digital drawing pipelines and new sustainability initiatives.",
    excerpt: "The acclaimed studio behind Jujutsu Kaisen and Chainsaw Man reveals upgraded digital drawing pipelines and new sustainability initiatives.",
    content: `In an extensive corporate presentation at Tokyo Anime Center, MAPPA representatives outlined their five-year operational roadmap. The studio has constructed a state-of-the-art creative campus in Suginami Ward designed to optimize digital color grading, CGI compositing with Unreal Engine 5, and flexible shift schedules for key animators.

The studio affirmed that production timelines for ongoing marquee series will receive increased pre-production schedules to maintain the exceptional visual fidelity demanded by global audiences.`,
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmnei.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmnei.jpg",
    category: "Industry",
    author: {
      name: "Elena Rostova",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "Industry Analyst"
    },
    readTime: "4 min read",
    publishedAt: "5 hours ago",
    tags: ["MAPPA", "Animation Industry", "Technology", "Tokyo"],
    sourceName: "Comic Natalie",
    sourceUrl: "https://natalie.mu/comic"
  },
  {
    id: "one-piece-final-saga-oda",
    title: "Eiichiro Oda Shares Reflections on One Piece Climax and Elbaf Arc Milestones",
    slug: "one-piece-final-saga-oda-interview-elbaf",
    summary: "Weekly Shonen Jump publishes special celebratory editorial featuring creator remarks on character resolutions and world revelations.",
    excerpt: "Weekly Shonen Jump publishes special celebratory editorial featuring creator remarks on character resolutions and world revelations.",
    content: `With the Straw Hat Pirates officially touching down on the mythical land of giants, Elbaf, author Eiichiro Oda addressed fans in a touching editorial note. Oda expressed his gratitude for the global enthusiasm across manga readers and the Netflix live-action series audience.

"Every piece of the puzzle that was set twenty-seven years ago is now finding its rightful place," Oda stated. "Please buckle up your seatbelts, because the revelations from here on out will alter how you perceive the entire Grand Line."`,
    image: "https://s4.anilist.co/file/anilistcdn/media/manga/banner/30013-14kLzU1O4WzM.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/manga/banner/30013-14kLzU1O4WzM.jpg",
    category: "Manga",
    author: {
      name: "Kenji Takahashi",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "Senior Anime Correspondent"
    },
    readTime: "4 min read",
    publishedAt: "Yesterday",
    tags: ["One Piece", "Eiichiro Oda", "Manga", "Shonen Jump"],
    sourceName: "Oricon News",
    sourceUrl: "https://www.oricon.co.jp"
  },
  {
    id: "orv-live-action-adaptation",
    title: "Omniscient Reader's Viewpoint Live-Action Feature Wraps Principal Photography",
    slug: "omniscient-readers-viewpoint-live-action-film-details",
    summary: "Star-studded South Korean cinematic adaptation featuring Lee Min-ho and Ahn Hyo-seop concludes key visual effects shoots.",
    excerpt: "Star-studded South Korean cinematic adaptation featuring Lee Min-ho and Ahn Hyo-seop concludes key visual effects shoots.",
    content: `Realies Pictures, the powerhouse studio behind the box-office blockbuster 'Along with the Gods', has formally announced the completion of filming for the cinematic adaptation of 'Omniscient Reader's Viewpoint'.

With extensive practical set pieces constructed at Studio Cube in Daejeon and top-tier VFX handled by Dexter Studios, the film brings the apocalyptic Seoul subway scenarios and mythical dokkaebi beings into visceral reality. Global release dates will be announced later this autumn.`,
    image: "https://s4.anilist.co/file/anilistcdn/media/manga/banner/119257-2B7U7xYmH5Q5.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/manga/banner/119257-2B7U7xYmH5Q5.jpg",
    category: "Manhwa",
    author: {
      name: "Min-jun Kim",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "K-Culture & Webtoon Lead"
    },
    readTime: "3 min read",
    publishedAt: "2 days ago",
    tags: ["Omniscient Reader", "Manhwa", "Cinema", "Webtoon"],
    sourceName: "Crunchyroll News",
    sourceUrl: "https://www.crunchyroll.com/news"
  },
  {
    id: "frieren-animation-awards",
    title: "Frieren: Beyond Journey\u2019s End Sweeps Tokyo Anime Award Festival 2024",
    slug: "frieren-sweeps-tokyo-anime-award-festival",
    summary: "Madhouse\u2019s masterpiece adaptation takes home best Television Series, Background Art, and Director accolades.",
    excerpt: "Madhouse\u2019s masterpiece adaptation takes home best Television Series, Background Art, and Director accolades.",
    content: `The Tokyo Anime Award Festival has crowned Keiichiro Saito\u2019s adaptation of 'Frieren: Beyond Journey\u2019s End' as the benchmark achievement of contemporary Japanese television animation.

The committee praised its deliberate pacing, evocative atmospheric environmental design by Studio Wyeth, and Evan Call\u2019s Celtic-inspired symphonic orchestration. Industry peers commended the project for proving that philosophical, character-driven fantasy can achieve both commercial dominance and critical perfection.`,
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-n2b7vD0zS7b6.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-n2b7vD0zS7b6.jpg",
    category: "Announcements",
    author: {
      name: "Elena Rostova",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "Industry Analyst"
    },
    readTime: "3 min read",
    publishedAt: "3 days ago",
    tags: ["Frieren", "Madhouse", "Awards", "Tokyo"],
    sourceName: "Mantan Web",
    sourceUrl: "https://mantan-web.jp"
  },
  {
    id: "demon-slayer-trilogy-production",
    title: "Demon Slayer: Infinity Castle Film Trilogy Production Secrets Disclosed by ufotable",
    slug: "demon-slayer-infinity-castle-trilogy-ufotable-secrets",
    summary: "Director Haruo Sotozaki and the digital team discuss the architectural complexity of the boundless shifting fortress.",
    excerpt: "Director Haruo Sotozaki and the digital team discuss the architectural complexity of the boundless shifting fortress.",
    content: `ufotable\u2019s proprietary 3D background pipeline is being pushed to its absolute limits for the upcoming theatrical movie trilogy covering the Infinity Castle Arc.

In an exclusive interview with Famitsu, technical directors revealed that every room, staircase, and shifting door in Muzan Kibutsuji\u2019s pocket dimension is fully modeled in 3D space with dynamic lighting computations to allow continuous 360-degree camera rotations during the fateful battles.`,
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/178496-e3pW9vW1E7B1.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/178496-e3pW9vW1E7B1.jpg",
    category: "Anime",
    author: {
      name: "Kenji Takahashi",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "Senior Anime Correspondent"
    },
    readTime: "5 min read",
    publishedAt: "4 days ago",
    tags: ["Demon Slayer", "ufotable", "Movies", "CGI"],
    sourceName: "AnimeAnime Japan",
    sourceUrl: "https://animeanime.jp"
  },
  {
    id: "webtoon-industry-growth-report",
    title: "Global Webtoon Ecosystem Reaches New Record With Action & Fantasy Dominance",
    slug: "global-webtoon-market-record-growth-report-2025",
    summary: "International readership across North America and Europe surges 34% year-over-year as serialized digital scrolls become prime IP for film and games.",
    excerpt: "International readership across North America and Europe surges 34% year-over-year as serialized digital scrolls become prime IP for film and games.",
    content: `A comprehensive industry market report published today by the Korea Creative Content Agency highlights the accelerating momentum of vertical webtoons across western markets.

Driven by titles such as 'The Beginning After The End', 'Wind Breaker', and 'Nano Machine', the digital comic format has demonstrated unprecedented reader retention rates. Major video game publishers and animation studios are increasingly turning to serialized manhwa webtoons as prime source material for high-budget adaptations.`,
    image: "https://s4.anilist.co/file/anilistcdn/media/manga/banner/105398-eM4kKx8GqUu7.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/manga/banner/105398-eM4kKx8GqUu7.jpg",
    category: "Manhwa",
    author: {
      name: "Min-jun Kim",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "K-Culture & Webtoon Lead"
    },
    readTime: "4 min read",
    publishedAt: "5 days ago",
    tags: ["Webtoons", "Economics", "Digital Comics", "Publishing"],
    sourceName: "Anime News Network",
    sourceUrl: "https://www.animenewsnetwork.com"
  },
  {
    id: "anime-expo-fall-showcase",
    title: "Anime Expo Unveils Star-Studded World Premiere Lineup for Fall 2025",
    slug: "anime-expo-fall-showcase-world-premieres",
    summary: "Over forty studios will gather for unprecedented simultaneous screening previews, live voice actor panels, and musical concerts.",
    excerpt: "Over forty studios will gather for unprecedented simultaneous screening previews, live voice actor panels, and musical concerts.",
    content: `Convention organizers have released the preliminary schedule for the largest anime celebration outside Japan. Attendees can look forward to exclusive advance episode screenings, autograph sessions with legendary mangaka, and a dedicated exhibition floor featuring life-sized recreations of iconic battle scenes.`,
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZih.jpg",
    coverImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZih.jpg",
    category: "Announcements",
    author: {
      name: "Elena Rostova",
      avatar: ANIMEHUB_AVATAR_FALLBACK,
      role: "Industry Analyst"
    },
    readTime: "2 min read",
    publishedAt: "1 week ago",
    tags: ["Conventions", "Premieres", "Anime Expo", "Events"],
    sourceName: "Crunchyroll News",
    sourceUrl: "https://www.crunchyroll.com/news"
  }
];
var allMediaItems = [
  ...mockAnimeList,
  ...mockMangaList,
  ...mockManhwaList
];

// src/services/providers/manhwa/manhwaProvider.ts
var MangaDexManhwaProvider = class {
  async getTrending(limit = 12) {
    try {
      const results = await mangadexProvider.getTrending(limit, 1, "MANHWA");
      if (results && results.length > 0) return results;
    } catch (err) {
      console.info(`[ManhwaProvider] MangaDex getTrending unavailable (${err.message}). Using fallback data.`);
    }
    return mockManhwaList.filter((i) => i.isTrending && isSafeContent(i)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
  }
  async getPopular(limit = 12) {
    try {
      const results = await mangadexProvider.getPopular(limit, 1, "MANHWA");
      if (results && results.length > 0) return results;
    } catch (err) {
      console.info(`[ManhwaProvider] MangaDex getPopular unavailable (${err.message}). Using fallback data.`);
    }
    return mockManhwaList.filter((i) => isSafeContent(i)).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
  }
  async getLatest(limit = 12) {
    try {
      const results = await mangadexProvider.getLatest(limit, 1, "MANHWA");
      if (results && results.length > 0) return results;
    } catch (err) {
      console.info(`[ManhwaProvider] MangaDex getLatest unavailable (${err.message}). Using fallback data.`);
    }
    return mockManhwaList.filter((i) => i.isLatest && isSafeContent(i)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
  }
  async getList(params) {
    try {
      const res = await mangadexProvider.getList(params, "MANHWA");
      if (res && res.data.length > 0) return res;
    } catch (err) {
      console.info(`[ManhwaProvider] MangaDex getList unavailable (${err.message}). Using fallback data.`);
    }
    const page = params.page || 1;
    const perPage = params.perPage || 18;
    const start = (page - 1) * perPage;
    const safeList = mockManhwaList.filter((i) => isSafeContent(i));
    return {
      data: safeList.slice(start, start + perPage).map((i) => ({ ...i, sourceProvider: "mock" })),
      pageInfo: {
        currentPage: page,
        hasNextPage: start + perPage < safeList.length,
        perPage,
        total: safeList.length,
        lastPage: Math.ceil(safeList.length / perPage)
      },
      sourceProvider: "mock"
    };
  }
  async getById(id) {
    try {
      const item = await mangadexProvider.getById(id);
      if (item) return item;
    } catch (err) {
      console.info(`[ManhwaProvider] MangaDex getById unavailable (${err.message}).`);
    }
    const fallback = mockManhwaList.find(
      (i) => i.id === id || i.id.toLowerCase() === id.toLowerCase()
    );
    return fallback ? { ...fallback, sourceProvider: "mock" } : null;
  }
  async search(query, limit = 18, page = 1) {
    try {
      const res = await mangadexProvider.search(query, limit, page, "MANHWA");
      if (res && res.data.length > 0) return res;
    } catch (err) {
      console.info(`[ManhwaProvider] MangaDex search unavailable (${err.message}). Using fallback data.`);
    }
    const q = query.toLowerCase().trim();
    const filtered = mockManhwaList.filter(
      (i) => isSafeContent(i) && (i.title.toLowerCase().includes(q) || i.englishTitle && i.englishTitle.toLowerCase().includes(q))
    );
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map((i) => ({ ...i, sourceProvider: "mock" })),
      pageInfo: {
        currentPage: page,
        hasNextPage: start + limit < filtered.length,
        perPage: limit,
        total: filtered.length,
        lastPage: Math.ceil(filtered.length / limit)
      },
      sourceProvider: "mock"
    };
  }
};
var manhwaProvider = new MangaDexManhwaProvider();

// src/lib/newsImage.ts
var ANIMEHUB_NEWS_FALLBACK_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
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
function isValidNewsImage(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (trimmed.startsWith("data:image/")) return true;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  const placeholderDomains = [
    "via.placeholder.com",
    "placeholder.com",
    "picsum.photos",
    "dummyimage.com",
    "placekitten.com",
    "placehold.it",
    "placehold.co"
  ];
  if (placeholderDomains.some((domain) => lower.includes(domain))) {
    return false;
  }
  const bannedUnsplashPhotos = [
    "photo-1506744038136",
    // landscape
    "photo-1518709268805",
    // grass/landscape
    "photo-1534447677768",
    // dark forest
    "photo-1514565131",
    // generic city skyline
    "photo-1509198397868",
    // random photo
    "photo-1607604276583",
    // generic movie camera
    "photo-1563089145",
    // neon wire
    "photo-1579783900"
    // abstract oil painting
  ];
  if (bannedUnsplashPhotos.some((id) => lower.includes(id))) {
    return false;
  }
  const stockNatureKeywords = ["landscape", "nature-photo", "forest-tree", "waterfall-river"];
  if (stockNatureKeywords.some((kw) => lower.includes(kw))) {
    return false;
  }
  return true;
}

// src/services/providers/news/rssNewsProvider.ts
var AUTHORIZED_RSS_SOURCES = [
  {
    name: "Anime News Network",
    url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us",
    defaultCategory: "Anime"
  },
  {
    name: "Crunchyroll News",
    url: "https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss",
    defaultCategory: "Anime"
  }
];
function decodeEntities(str) {
  if (!str) return "";
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&#x2F;/gi, "/").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, dec) => {
    const code = Number(dec);
    return !isNaN(code) && code > 0 ? String.fromCharCode(code) : "";
  }).replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return !isNaN(code) && code > 0 ? String.fromCharCode(code) : "";
  }).trim();
}
function stripHtml2(html) {
  if (!html) return "";
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function getTagContent(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}
function extractRealSourceImage(itemXml) {
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["'](https?:\/\/[^"']+)["']/i);
  if (thumbMatch && isValidNewsImage(thumbMatch[1])) {
    return thumbMatch[1].trim();
  }
  const mediaMatch = itemXml.match(/<media:content[^>]+url=["'](https?:\/\/[^"']+)["']/i);
  if (mediaMatch && isValidNewsImage(mediaMatch[1])) {
    return mediaMatch[1].trim();
  }
  const encMatch = itemXml.match(/<enclosure[^>]+url=["'](https?:\/\/[^"']+)["'][^>]*type=["']image\/[^"']*["']/i) || itemXml.match(/<enclosure[^>]+type=["']image\/[^"']*["'][^>]*url=["'](https?:\/\/[^"']+)["']/i);
  if (encMatch && isValidNewsImage(encMatch[1])) {
    return encMatch[1].trim();
  }
  const imgMatch = itemXml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch && isValidNewsImage(imgMatch[1])) {
    return imgMatch[1].trim();
  }
  return void 0;
}
function resolveCategory(rawCategory, title, content) {
  const combined = `${rawCategory} ${title} ${content}`.toLowerCase();
  if (combined.includes("manhwa") || combined.includes("webtoon")) return "Manhwa";
  if (combined.includes("manga")) return "Manga";
  if (combined.includes("industry") || combined.includes("business") || combined.includes("box office") || combined.includes("financial") || combined.includes("market") || combined.includes("corporate")) {
    return "Industry";
  }
  if (combined.includes("announcement") || combined.includes("release date") || combined.includes("premiere") || combined.includes("reveals") || combined.includes("unveils") || combined.includes("convention") || combined.includes("awards")) {
    return "Announcements";
  }
  return "Anime";
}
function generateDeterministicId(sourceName, sourceUrl, title) {
  const prefix = sourceName.includes("Crunchyroll") ? "cr" : "ann";
  try {
    const parsed = new URL(sourceUrl);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.length >= 3) {
      const sanitized = lastPart.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (sanitized) return `${prefix}-${sanitized}`;
    }
  } catch {
  }
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  let hash = 0;
  for (let i = 0; i < sourceUrl.length; i++) {
    hash = (hash << 5) - hash + sourceUrl.charCodeAt(i);
    hash |= 0;
  }
  const hashStr = Math.abs(hash).toString(36);
  return `${prefix}-${titleSlug || "article"}-${hashStr}`;
}
function parseRssFeed(xml, source) {
  const articles = [];
  const rawItems = xml.split(/<item[\s>]/i).slice(1);
  for (const itemBlock of rawItems) {
    try {
      const raw = itemBlock.split(/<\/item>/i)[0];
      if (!raw) continue;
      const rawTitle = getTagContent(raw, "title");
      const title = decodeEntities(rawTitle);
      if (!title) continue;
      const rawLink = getTagContent(raw, "link") || getTagContent(raw, "guid");
      const sourceUrl = decodeEntities(rawLink).trim();
      if (!sourceUrl) continue;
      const rawDesc = getTagContent(raw, "description");
      const rawContent = getTagContent(raw, "content:encoded") || rawDesc;
      const plainDesc = stripHtml2(decodeEntities(rawDesc));
      const plainContent = stripHtml2(decodeEntities(rawContent));
      const summary = plainDesc || plainContent.slice(0, 240);
      const excerpt = (summary.length > 200 ? summary.slice(0, 197) + "..." : summary) || title;
      const rawPubDate = getTagContent(raw, "pubDate") || getTagContent(raw, "dc:date") || getTagContent(raw, "updated");
      let publishedAt;
      try {
        const parsed = new Date(rawPubDate);
        publishedAt = isNaN(parsed.getTime()) ? (/* @__PURE__ */ new Date()).toISOString() : parsed.toISOString();
      } catch {
        publishedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      const rawAuthor = getTagContent(raw, "author") || getTagContent(raw, "dc:creator");
      const authorName = decodeEntities(rawAuthor) || source.name;
      const rawCategory = getTagContent(raw, "category");
      const category = resolveCategory(rawCategory, title, plainContent);
      const categoryMatches = raw.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
      const tags = Array.from(
        new Set(
          categoryMatches.map((c) => decodeEntities(c.replace(/<\/?category[^>]*>/gi, "").trim())).filter((t) => t.length > 0 && t.length < 40)
        )
      );
      if (!tags.includes(source.name)) {
        tags.unshift(source.name);
      }
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
          role: "Editorial Staff"
        },
        readTime,
        publishedAt,
        tags,
        sourceUrl,
        sourceName: source.name,
        source: source.name
      });
    } catch (err) {
      console.warn(`[RssNewsProvider] Skipping malformed RSS item from ${source.name}:`, err?.message);
    }
  }
  return articles;
}
var RssNewsProvider = class {
  constructor() {
    this.cache = {
      articles: [],
      lastFetched: 0
    };
    this.cacheTtlMs = 5 * 60 * 1e3;
    // 5 minutes in-memory TTL
    this.fetchPromise = null;
    this.feedCooldowns = /* @__PURE__ */ new Map();
  }
  /**
   * Fetches an individual RSS feed using Node.js fetch with safety timeout.
   */
  async fetchSingleFeed(source) {
    const cooldownUntil = this.feedCooldowns.get(source.url);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return [];
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AnimeHub/1.0 NewsReader",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "Cache-Control": "no-cache"
        }
      });
      if (!response.ok) {
        const cooldown = response.status === 403 || response.status === 401 ? 15 * 60 * 1e3 : 5 * 60 * 1e3;
        this.feedCooldowns.set(source.url, Date.now() + cooldown);
        console.info(
          `[RssNewsProvider] ${source.name} RSS feed temporarily unavailable (HTTP ${response.status}). Using cooldown.`
        );
        return [];
      }
      const xmlText = await response.text();
      const parsed = parseRssFeed(xmlText, source);
      return parsed;
    } catch (err) {
      this.feedCooldowns.set(source.url, Date.now() + 5 * 60 * 1e3);
      console.info(
        `[RssNewsProvider] Skipping feed ${source.name}: ${err.name === "AbortError" ? "timeout" : err.message}`
      );
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
  /**
   * Fetches all authorized RSS feeds in parallel, deduplicating and sorting newest first.
   */
  async fetchAllFeeds(forceRefresh = false) {
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
        const combined = [];
        const seenUrls = /* @__PURE__ */ new Set();
        for (const result of feedResults) {
          if (result.status === "fulfilled" && Array.isArray(result.value)) {
            for (const article of result.value) {
              const urlKey = article.sourceUrl.toLowerCase();
              if (!seenUrls.has(urlKey)) {
                seenUrls.add(urlKey);
                combined.push(article);
              }
            }
          }
        }
        if (combined.length === 0 && mockNewsList.length > 0) {
          combined.push(...mockNewsList);
        }
        combined.sort((a, b) => {
          const timeA = new Date(a.publishedAt).getTime() || 0;
          const timeB = new Date(b.publishedAt).getTime() || 0;
          return timeB - timeA;
        });
        if (combined.length > 0) {
          this.cache = {
            articles: combined,
            lastFetched: Date.now()
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
  async getLatest(category, limit = 20) {
    const all = await this.fetchAllFeeds();
    let filtered = all;
    if (category && category !== "All") {
      filtered = filtered.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase()
      );
    }
    return filtered.slice(0, limit);
  }
  /**
   * Finds a specific news article by ID, slug, or sourceUrl.
   */
  async getById(id) {
    const all = await this.fetchAllFeeds();
    const query = id.toLowerCase().trim();
    const match = all.find(
      (a) => a.id.toLowerCase() === query || a.slug && a.slug.toLowerCase() === query || a.sourceUrl.toLowerCase() === query
    );
    return match || null;
  }
  /**
   * Searches news articles by query across title, summary, excerpt, and tags.
   */
  async search(query) {
    const all = await this.fetchAllFeeds();
    const q = query.toLowerCase().trim();
    if (!q) return all;
    return all.filter(
      (a) => a.title.toLowerCase().includes(q) || a.summary && a.summary.toLowerCase().includes(q) || a.excerpt && a.excerpt.toLowerCase().includes(q) || a.tags && a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
};
var rssNewsProvider = new RssNewsProvider();

// src/services/providers/registry.ts
var TTL_TRENDING = 600;
var TTL_POPULAR = 1200;
var TTL_LATEST = 900;
var TTL_SEARCH = 180;
var TTL_DETAILS = 1800;
function filterMockData(list, params) {
  const page = params.page || 1;
  const perPage = params.perPage || 18;
  let filtered = list.filter((item) => isSafeContent(item));
  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (i) => i.title.toLowerCase().includes(q) || i.englishTitle && i.englishTitle.toLowerCase().includes(q) || i.genres.some((g) => g.toLowerCase().includes(q)) || i.studioOrAuthor.toLowerCase().includes(q)
    );
  }
  if (params.genre && params.genre !== "All") {
    filtered = filtered.filter(
      (i) => i.genres.some((g) => g.toLowerCase() === params.genre?.toLowerCase())
    );
  }
  if (params.status && params.status !== "All") {
    filtered = filtered.filter(
      (i) => i.status.toLowerCase() === params.status?.toLowerCase()
    );
  }
  if (params.sort) {
    if (params.sort === "rating") {
      filtered = [...filtered].sort((a, b) => b.rating - a.rating);
    } else if (params.sort === "popularity") {
      filtered = [...filtered].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (params.sort === "title") {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
  }
  const startIndex = (page - 1) * perPage;
  const items = filtered.slice(startIndex, startIndex + perPage).map((i) => ({
    ...i,
    sourceProvider: "mock"
  }));
  return {
    data: items,
    pageInfo: {
      currentPage: page,
      hasNextPage: startIndex + perPage < filtered.length,
      total: filtered.length,
      perPage,
      lastPage: Math.ceil(filtered.length / perPage)
    },
    sourceProvider: "mock"
  };
}
var animeService = {
  async getTrending(limit = 12, page = 1) {
    const cacheKey = `anime:trending:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_TRENDING, async () => {
      try {
        const results = await anilistProvider.getTrending("ANIME", limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] AniList getTrending unavailable (${err.message}). Trying Jikan fallback.`);
      }
      try {
        const results = await jikanProvider.getTrending(limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] Jikan getTrending unavailable (${err.message}). Trying Kitsu fallback.`);
      }
      try {
        const results = await kitsuProvider.getTrending(limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] Kitsu getTrending unavailable (${err.message}). Using curated fallback data.`);
      }
      return mockAnimeList.filter((i) => i.isTrending && isSafeContent(i)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
    });
  },
  async getPopular(limit = 12, page = 1) {
    const cacheKey = `anime:popular:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_POPULAR, async () => {
      try {
        const results = await anilistProvider.getPopular("ANIME", limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] AniList getPopular unavailable (${err.message}). Trying Jikan fallback.`);
      }
      try {
        const results = await jikanProvider.getPopular(limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] Jikan getPopular unavailable (${err.message}). Trying Kitsu fallback.`);
      }
      try {
        const results = await kitsuProvider.getPopular(limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] Kitsu getPopular unavailable (${err.message}). Using curated fallback data.`);
      }
      return mockAnimeList.filter((item) => isSafeContent(item)).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
    });
  },
  async getLatest(limit = 12, page = 1) {
    const cacheKey = `anime:latest:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_LATEST, async () => {
      try {
        const results = await anilistProvider.getLatest("ANIME", limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] AniList getLatest unavailable (${err.message}). Trying Jikan fallback.`);
      }
      try {
        const results = await jikanProvider.getLatest(limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] Jikan getLatest unavailable (${err.message}). Trying Kitsu fallback.`);
      }
      try {
        const results = await kitsuProvider.getLatest(limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] Kitsu getLatest unavailable (${err.message}). Using curated fallback data.`);
      }
      return mockAnimeList.filter((i) => i.isLatest && isSafeContent(i)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
    });
  },
  async getList(params) {
    const cacheKey = `anime:list:${JSON.stringify(params)}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, async () => {
      try {
        const res = await anilistProvider.getList("ANIME", params);
        if (res && res.data.length > 0) return res;
      } catch (err) {
        console.info(`[AnimeHub] AniList getList unavailable (${err.message}). Trying Jikan fallback.`);
      }
      try {
        const res = await jikanProvider.getList(params);
        if (res && res.data.length > 0) return res;
      } catch (err) {
        console.info(`[AnimeHub] Jikan getList unavailable (${err.message}). Trying Kitsu fallback.`);
      }
      try {
        const res = await kitsuProvider.getList(params);
        if (res && res.data.length > 0) return res;
      } catch (err) {
        console.info(`[AnimeHub] Kitsu getList unavailable (${err.message}). Using curated fallback data.`);
      }
      return filterMockData(mockAnimeList, params);
    });
  },
  async getById(id) {
    const cacheKey = `anime:detail:${id}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_DETAILS, async () => {
      try {
        if (!isNaN(parseInt(id, 10))) {
          const item = await anilistProvider.getById("ANIME", id);
          if (item) return item;
        } else {
          const cleanQuery = id.replace(/[-_]/g, " ").trim();
          const searchRes = await anilistProvider.search("ANIME", cleanQuery, 1);
          if (searchRes.data.length > 0) {
            const item = await anilistProvider.getById("ANIME", searchRes.data[0].id);
            if (item) return { ...item, id };
          }
        }
      } catch (err) {
        console.info(`[AnimeHub] AniList getById unavailable (${err.message}).`);
      }
      try {
        const item = await jikanProvider.getById(id);
        if (item) return item;
      } catch (err) {
        console.info(`[AnimeHub] Jikan getById unavailable (${err.message}).`);
      }
      try {
        const item = await kitsuProvider.getById(id);
        if (item) return item;
      } catch (err) {
        console.info(`[AnimeHub] Kitsu getById unavailable (${err.message}).`);
      }
      const mockItem = mockAnimeList.find(
        (i) => i.id === id || i.id.toLowerCase() === id.toLowerCase()
      );
      if (mockItem && isSafeContent(mockItem)) {
        return { ...mockItem, sourceProvider: "mock" };
      }
      return null;
    });
  },
  async search(query, limit = 10, page = 1) {
    return this.getList({
      search: query,
      perPage: limit,
      page,
      sort: "trending"
    });
  }
};
var mangaService = {
  async getTrending(limit = 12, page = 1) {
    const cacheKey = `manga:trending:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_TRENDING, async () => {
      try {
        const results = await anilistProvider.getTrending("MANGA", limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] AniList manga trending unavailable (${err.message}). Trying MangaDex.`);
      }
      try {
        const results = await mangadexProvider.getTrending(limit, page, "MANGA");
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] MangaDex manga trending unavailable (${err.message}). Using fallback data.`);
      }
      return mockMangaList.filter((i) => i.isTrending && isSafeContent(i)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
    });
  },
  async getPopular(limit = 12, page = 1) {
    const cacheKey = `manga:popular:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_POPULAR, async () => {
      try {
        const results = await anilistProvider.getPopular("MANGA", limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] AniList manga popular unavailable (${err.message}). Trying MangaDex.`);
      }
      try {
        const results = await mangadexProvider.getPopular(limit, page, "MANGA");
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] MangaDex manga popular unavailable (${err.message}). Using fallback data.`);
      }
      return mockMangaList.filter((item) => isSafeContent(item)).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
    });
  },
  async getLatest(limit = 12, page = 1) {
    const cacheKey = `manga:latest:${limit}:${page}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_LATEST, async () => {
      try {
        const results = await anilistProvider.getLatest("MANGA", limit, page);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] AniList manga latest unavailable (${err.message}). Trying MangaDex.`);
      }
      try {
        const results = await mangadexProvider.getLatest(limit, page, "MANGA");
        if (results && results.length > 0) return results;
      } catch (err) {
        console.info(`[AnimeHub] MangaDex manga latest unavailable (${err.message}). Using fallback data.`);
      }
      return mockMangaList.filter((i) => i.isLatest && isSafeContent(i)).slice(0, limit).map((i) => ({ ...i, sourceProvider: "mock" }));
    });
  },
  async getList(params) {
    const cacheKey = `manga:list:${JSON.stringify(params)}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_SEARCH, async () => {
      try {
        const res = await anilistProvider.getList("MANGA", params);
        if (res && res.data.length > 0) return res;
      } catch (err) {
        console.info(`[AnimeHub] AniList manga list unavailable (${err.message}). Trying MangaDex.`);
      }
      try {
        const res = await mangadexProvider.getList(params, "MANGA");
        if (res && res.data.length > 0) return res;
      } catch (err) {
        console.info(`[AnimeHub] MangaDex manga list unavailable (${err.message}). Using fallback data.`);
      }
      return filterMockData(mockMangaList, params);
    });
  },
  async getById(id) {
    const cacheKey = `manga:detail:${id}`;
    return globalCache.fetchWithDedupe(cacheKey, TTL_DETAILS, async () => {
      try {
        if (!isNaN(parseInt(id, 10))) {
          const item = await anilistProvider.getById("MANGA", id);
          if (item) return item;
        } else {
          const cleanQuery = id.replace(/[-_]/g, " ").trim();
          const searchRes = await anilistProvider.search("MANGA", cleanQuery, 1);
          if (searchRes.data.length > 0) {
            const item = await anilistProvider.getById("MANGA", searchRes.data[0].id);
            if (item) return { ...item, id };
          }
        }
      } catch (err) {
        console.info(`[AnimeHub] AniList manga getById unavailable (${err.message}).`);
      }
      try {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          const item = await mangadexProvider.getById(id);
          if (item) return item;
        } else {
          const cleanQuery = id.replace(/[-_]/g, " ").trim();
          const searchRes = await mangadexProvider.search(cleanQuery, 1, 1, "MANGA");
          if (searchRes.data.length > 0) {
            return { ...searchRes.data[0], id };
          }
        }
      } catch (err) {
        console.info(`[AnimeHub] MangaDex manga getById unavailable (${err.message}).`);
      }
      const mockItem = mockMangaList.find(
        (i) => i.id === id || i.id.toLowerCase() === id.toLowerCase()
      );
      if (mockItem && isSafeContent(mockItem)) {
        return { ...mockItem, sourceProvider: "mock" };
      }
      return null;
    });
  },
  async search(query, limit = 10, page = 1) {
    return this.getList({
      search: query,
      perPage: limit,
      page,
      sort: "trending"
    });
  }
};
var manhwaService = {
  async getTrending(limit = 12) {
    const cacheKey = `manhwa:trending:${limit}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_TRENDING,
      () => manhwaProvider.getTrending(limit)
    );
  },
  async getPopular(limit = 12) {
    const cacheKey = `manhwa:popular:${limit}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_POPULAR,
      () => manhwaProvider.getPopular(limit)
    );
  },
  async getLatest(limit = 12) {
    const cacheKey = `manhwa:latest:${limit}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_LATEST,
      () => manhwaProvider.getLatest(limit)
    );
  },
  async getList(params) {
    const cacheKey = `manhwa:list:${JSON.stringify(params)}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_SEARCH,
      () => manhwaProvider.getList(params)
    );
  },
  async getById(id) {
    const cacheKey = `manhwa:detail:${id}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_DETAILS,
      () => manhwaProvider.getById(id)
    );
  },
  async search(query, limit = 18, page = 1) {
    const cacheKey = `manhwa:search:${query}:${limit}:${page}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_SEARCH,
      () => manhwaProvider.search(query, limit, page)
    );
  }
};
var newsService = {
  async getLatest(category, limit = 10) {
    const cacheKey = `news:latest:${category || "all"}:${limit}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_SEARCH,
      () => rssNewsProvider.getLatest(category, limit)
    );
  },
  async getById(id) {
    const cacheKey = `news:detail:${id}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_DETAILS,
      () => rssNewsProvider.getById(id)
    );
  },
  async search(query) {
    return rssNewsProvider.search(query);
  }
};
var mangadexService = {
  async getTrending(limit = 12, page = 1, type = "ALL") {
    const cacheKey = `mangadex:trending:${limit}:${page}:${type}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_TRENDING,
      () => mangadexProvider.getTrending(limit, page, type)
    );
  },
  async getPopular(limit = 12, page = 1, type = "ALL") {
    const cacheKey = `mangadex:popular:${limit}:${page}:${type}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_POPULAR,
      () => mangadexProvider.getPopular(limit, page, type)
    );
  },
  async getLatest(limit = 12, page = 1, type = "ALL") {
    const cacheKey = `mangadex:latest:${limit}:${page}:${type}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_LATEST,
      () => mangadexProvider.getLatest(limit, page, type)
    );
  },
  async getList(params, type = "ALL") {
    const cacheKey = `mangadex:list:${JSON.stringify(params)}:${type}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_SEARCH,
      () => mangadexProvider.getList(params, type)
    );
  },
  async getById(id) {
    const cacheKey = `mangadex:detail:${id}`;
    return globalCache.fetchWithDedupe(
      cacheKey,
      TTL_DETAILS,
      () => mangadexProvider.getById(id)
    );
  },
  async search(query, limit = 10, page = 1, type = "ALL") {
    return mangadexProvider.search(query, limit, page, type);
  }
};

// src/services/api/routes.ts
var apiRouter = Router();
function parseIntParam(val, fallback) {
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? fallback : parsed;
}
function extractFilterParams(req) {
  return {
    search: typeof req.query.q === "string" ? req.query.q : typeof req.query.search === "string" ? req.query.search : void 0,
    genre: typeof req.query.genre === "string" ? req.query.genre : void 0,
    status: typeof req.query.status === "string" ? req.query.status : void 0,
    format: typeof req.query.format === "string" ? req.query.format : void 0,
    season: typeof req.query.season === "string" ? req.query.season : void 0,
    year: req.query.year ? parseIntParam(req.query.year, 0) || void 0 : void 0,
    sort: typeof req.query.sort === "string" ? req.query.sort : void 0,
    page: parseIntParam(req.query.page, 1),
    perPage: Math.min(parseIntParam(req.query.perPage || req.query.limit, 18), 50)
  };
}
apiRouter.get("/health", async (req, res) => {
  const [anilistOk, jikanOk, mangadexOk] = await Promise.all([
    anilistProvider.checkHealth(),
    jikanProvider.checkHealth(),
    mangadexProvider.checkHealth()
  ]);
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    providers: {
      anilist: anilistOk ? "operational" : "degraded",
      jikan: jikanOk ? "operational" : "degraded",
      mangadex: mangadexOk ? "operational" : "degraded",
      manhwa: "operational",
      news: "operational"
    },
    cache: globalCache.getStats()
  });
});
apiRouter.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const type = (req.query.type || "ALL").toUpperCase();
    const limit = Math.min(parseIntParam(req.query.limit, 10), 30);
    const page = parseIntParam(req.query.page, 1);
    if (!q.trim()) {
      return res.json({
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, perPage: limit },
        sourceProvider: "aggregated"
      });
    }
    if (type === "ANIME") {
      const animeResults = await animeService.search(q, limit, page);
      return res.json(animeResults);
    } else if (type === "MANGA") {
      const mangaResults = await mangaService.search(q, limit, page);
      return res.json(mangaResults);
    } else if (type === "MANHWA") {
      const manhwaResults = await manhwaService.search(q, limit, page);
      return res.json(manhwaResults);
    }
    const [animeRes, mangaRes, manhwaRes] = await Promise.all([
      animeService.search(q, Math.ceil(limit / 3), 1).catch(() => ({ data: [] })),
      mangaService.search(q, Math.ceil(limit / 3), 1).catch(() => ({ data: [] })),
      manhwaService.search(q, Math.ceil(limit / 3), 1).catch(() => ({ data: [] }))
    ]);
    const combined = [...animeRes.data, ...mangaRes.data, ...manhwaRes.data].slice(0, limit);
    return res.json({
      data: combined,
      pageInfo: {
        currentPage: page,
        hasNextPage: false,
        perPage: limit,
        total: combined.length
      },
      sourceProvider: "aggregated"
    });
  } catch (err) {
    res.status(500).json({ error: "Search failed", message: err.message });
  }
});
apiRouter.get("/anime/trending", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await animeService.getTrending(limit, page);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trending anime", message: err.message });
  }
});
apiRouter.get("/anime/popular", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await animeService.getPopular(limit, page);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch popular anime", message: err.message });
  }
});
apiRouter.get("/anime/latest", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await animeService.getLatest(limit, page);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest anime", message: err.message });
  }
});
apiRouter.get("/anime/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = parseIntParam(req.query.limit, 18);
    const page = parseIntParam(req.query.page, 1);
    const result = await animeService.search(q, limit, page);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to search anime", message: err.message });
  }
});
apiRouter.get("/anime", async (req, res) => {
  try {
    const params = extractFilterParams(req);
    const result = await animeService.getList(params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch anime list", message: err.message });
  }
});
apiRouter.get("/anime/:id", async (req, res) => {
  try {
    const item = await animeService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Anime not found" });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch anime details", message: err.message });
  }
});
apiRouter.get("/manga/trending", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await mangaService.getTrending(limit, page);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trending manga", message: err.message });
  }
});
apiRouter.get("/manga/popular", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await mangaService.getPopular(limit, page);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch popular manga", message: err.message });
  }
});
apiRouter.get("/manga/latest", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const items = await mangaService.getLatest(limit, page);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest manga", message: err.message });
  }
});
apiRouter.get("/manga/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = parseIntParam(req.query.limit, 18);
    const page = parseIntParam(req.query.page, 1);
    const result = await mangaService.search(q, limit, page);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to search manga", message: err.message });
  }
});
apiRouter.get("/manga", async (req, res) => {
  try {
    const params = extractFilterParams(req);
    const result = await mangaService.getList(params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch manga list", message: err.message });
  }
});
apiRouter.get("/manga/:id", async (req, res) => {
  try {
    const item = await mangaService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Manga not found" });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch manga details", message: err.message });
  }
});
apiRouter.get("/manhwa/trending", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const items = await manhwaService.getTrending(limit);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trending manhwa", message: err.message });
  }
});
apiRouter.get("/manhwa/popular", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const items = await manhwaService.getPopular(limit);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch popular manhwa", message: err.message });
  }
});
apiRouter.get("/manhwa/latest", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const items = await manhwaService.getLatest(limit);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest manhwa", message: err.message });
  }
});
apiRouter.get("/manhwa/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = parseIntParam(req.query.limit, 18);
    const page = parseIntParam(req.query.page, 1);
    const result = await manhwaService.search(q, limit, page);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to search manhwa", message: err.message });
  }
});
apiRouter.get("/manhwa", async (req, res) => {
  try {
    const params = extractFilterParams(req);
    const result = await manhwaService.getList(params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch manhwa list", message: err.message });
  }
});
apiRouter.get("/manhwa/:id", async (req, res) => {
  try {
    const item = await manhwaService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Manhwa not found" });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch manhwa details", message: err.message });
  }
});
apiRouter.get("/news/latest", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 20);
    const items = await newsService.getLatest(void 0, limit);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch latest news", message: err.message });
  }
});
apiRouter.get("/news/category/:category", async (req, res) => {
  try {
    const category = req.params.category;
    const limit = parseIntParam(req.query.limit, 20);
    const items = await newsService.getLatest(category, limit);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news by category", message: err.message });
  }
});
apiRouter.get("/news", async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : typeof req.query.search === "string" ? req.query.search : void 0;
    const category = typeof req.query.category === "string" ? req.query.category : void 0;
    const limit = parseIntParam(req.query.limit, 20);
    if (query && query.trim()) {
      const items2 = await newsService.search(query.trim());
      const filtered = category && category !== "All" ? items2.filter((a) => a.category.toLowerCase() === category.toLowerCase()) : items2;
      return res.json(filtered.slice(0, limit));
    }
    const items = await newsService.getLatest(category, limit);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news", message: err.message });
  }
});
apiRouter.get("/news/:id", async (req, res) => {
  try {
    const item = await newsService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch article details", message: err.message });
  }
});
apiRouter.get("/mangadex/trending", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === "MANHWA" ? "MANHWA" : req.query.type === "MANGA" ? "MANGA" : "ALL";
    const items = await mangadexService.getTrending(limit, page, type);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch MangaDex trending", message: err.message });
  }
});
apiRouter.get("/mangadex/popular", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === "MANHWA" ? "MANHWA" : req.query.type === "MANGA" ? "MANGA" : "ALL";
    const items = await mangadexService.getPopular(limit, page, type);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch MangaDex popular", message: err.message });
  }
});
apiRouter.get("/mangadex/latest", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 12);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === "MANHWA" ? "MANHWA" : req.query.type === "MANGA" ? "MANGA" : "ALL";
    const items = await mangadexService.getLatest(limit, page, type);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch MangaDex latest", message: err.message });
  }
});
apiRouter.get("/mangadex/search", async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const limit = parseIntParam(req.query.limit, 10);
    const page = parseIntParam(req.query.page, 1);
    const type = req.query.type === "MANHWA" ? "MANHWA" : req.query.type === "MANGA" ? "MANGA" : "ALL";
    const result = await mangadexService.search(query, limit, page, type);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to search MangaDex", message: err.message });
  }
});
apiRouter.get("/mangadex", async (req, res) => {
  try {
    const filterParams = extractFilterParams(req);
    const type = req.query.type === "MANHWA" ? "MANHWA" : req.query.type === "MANGA" ? "MANGA" : "ALL";
    const result = await mangadexService.getList(filterParams, type);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to query MangaDex list", message: err.message });
  }
});
apiRouter.get("/mangadex/:id", async (req, res) => {
  try {
    const item = await mangadexService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Title not found on MangaDex" });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch MangaDex item", message: err.message });
  }
});

// src/api/serverless.ts
var app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use((req, res, next) => {
  const matchedPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"] || req.headers["x-forwarded-url"];
  if (matchedPath && (req.url === "/" || req.url === "/api" || req.url === "/api/")) {
    req.url = matchedPath;
  } else if (req.originalUrl && (req.url === "/" || req.url === "/api" || req.url === "/api/")) {
    if (req.originalUrl.startsWith("/api")) {
      req.url = req.originalUrl;
    }
  }
  next();
});
app.use("/api", apiRouter);
app.use("/", apiRouter);
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `API endpoint ${req.originalUrl || req.url} not found`
  });
});
app.use((err, req, res, _next) => {
  console.error("[API Serverless Error]", err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({
      error: "Internal Server Error",
      message: err?.message || "An unexpected error occurred"
    });
  }
});
var handler = (req, res) => app(req, res);
var serverless_default = app;
export {
  app,
  serverless_default as default,
  handler
};
//# sourceMappingURL=index.js.map
