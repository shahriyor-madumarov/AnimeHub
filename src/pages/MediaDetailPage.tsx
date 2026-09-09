import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  Play,
  Plus,
  Check,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { allMediaItems } from '../data/mockData';
import {
  fetchAnimeById,
  fetchMangaById,
  fetchManhwaById,
  fetchPopularManhwa,
} from '../lib/api';
import { MediaItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { isValidAnimeCoverImage } from '../services/models/normalized';
import {
  getSafeCoverImage,
  getSafeBannerImage,
  isValidMediaCoverImage,
  ANIMEHUB_COVER_FALLBACK,
  ANIMEHUB_BANNER_FALLBACK,
} from '../lib/mediaImage';

interface MediaDetailPageProps {
  mediaId: string;
  expectedType?: 'ANIME' | 'MANGA' | 'MANHWA';
}

export const MediaDetailPage: React.FC<MediaDetailPageProps> = ({ mediaId, expectedType }) => {
  const { navigate, goBack } = useRouter();
  const { isInWatchlist, toggleWatchlist, openTrailer, showToast } = useWatchlist();
  const { t, resolveTitle, resolveGenre } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'episodes'>('overview');

  // Initial lookup in mock data (never for manhwa to ensure 100% live MangaDex data)
  const localMatch = expectedType !== 'MANHWA'
    ? allMediaItems.find((m) => m.id === mediaId && m.type !== 'MANHWA')
    : undefined;
  const [item, setItem] = useState<MediaItem | null>(() => localMatch || null);
  const [isLoading, setIsLoading] = useState(!localMatch);
  const [manhwaRecs, setManhwaRecs] = useState<MediaItem[]>([]);
  const [failedRecImages, setFailedRecImages] = useState<Set<string>>(new Set());
  const [posterError, setPosterError] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [coverBannerFailed, setCoverBannerFailed] = useState(false);

  // If not found in local mock items or to get full details, fetch from API
  useEffect(() => {
    let isMounted = true;
    setFailedRecImages(new Set());
    setPosterError(false);
    setBannerFailed(false);
    setCoverBannerFailed(false);

    async function loadItem() {
      try {
        let fetched: MediaItem | null = null;
        if (expectedType === 'MANGA') {
          fetched = await fetchMangaById(mediaId);
        } else if (expectedType === 'MANHWA') {
          fetched = await fetchManhwaById(mediaId);
          fetchPopularManhwa(8)
            .then((list) => {
              if (isMounted) {
                setManhwaRecs(list.filter((m) => m.id !== mediaId).slice(0, 6));
              }
            })
            .catch(() => {});
        } else {
          // Default to anime, or try anime first then manga
          fetched = await fetchAnimeById(mediaId);
          if (!fetched) {
            fetched = await fetchMangaById(mediaId);
          }
        }

        if (isMounted && fetched) {
          setItem(fetched);
        }
      } catch (err) {
        console.warn('[AnimeHub] Failed to fetch item by ID from API', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadItem();

    return () => {
      isMounted = false;
    };
  }, [mediaId, expectedType]);

  if (isLoading || !item) {
    if (isLoading) {
      return (
        <div className="min-h-screen pt-20 pb-20">
          <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] bg-slate-900 animate-pulse">
            <div className="absolute top-6 left-4 sm:left-8 z-20">
              <button
                id="back-button"
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 text-slate-200 border border-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('back')}</span>
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-56 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4 lg:col-span-3">
                <div className="aspect-[3/4.4] w-56 sm:w-64 md:w-full rounded-2xl bg-slate-800 animate-pulse border border-white/10" />
              </div>
              <div className="md:col-span-8 lg:col-span-9 space-y-4">
                <div className="h-8 bg-slate-800 rounded-lg w-2/3 animate-pulse" />
                <div className="h-4 bg-slate-800/80 rounded w-1/3 animate-pulse" />
                <div className="h-24 bg-slate-800/60 rounded-xl w-full animate-pulse mt-6" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-2">{t('noManhwaFound')}</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-md">
          {expectedType === 'MANHWA'
            ? 'The requested manhwa could not be found or is unavailable.'
            : 'The requested title could not be found.'}
        </p>
        <button
          id="back-button"
          type="button"
          onClick={goBack}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  const inList = isInWatchlist(item.id);
  const displayTitle = resolveTitle(item);

  let safeBannerSrc = ANIMEHUB_BANNER_FALLBACK;
  if (!bannerFailed && isValidMediaCoverImage(item.bannerImage)) {
    safeBannerSrc = item.bannerImage.trim();
  } else if (!coverBannerFailed && isValidMediaCoverImage(item.posterImage)) {
    safeBannerSrc = item.posterImage.trim();
  } else {
    safeBannerSrc = ANIMEHUB_BANNER_FALLBACK;
  }

  const handleBannerError = () => {
    if (!bannerFailed && isValidMediaCoverImage(item.bannerImage)) {
      // Primary bannerImage failed (e.g. 404) -> switch to valid coverImage
      setBannerFailed(true);
    } else {
      // Cover fallback failed or unavailable -> switch to safe AnimeHub banner fallback
      setCoverBannerFailed(true);
    }
  };

  const safePosterSrc = posterError
    ? ANIMEHUB_COVER_FALLBACK
    : getSafeCoverImage(item.posterImage);

  // Recommendations (Use ONLY real coverImage returned by AniList/Jikan for each recommended anime)
  // If a recommendation has no valid coverImage, hide that recommendation instead of showing a random image.
  const rawRecommendations = (item.recommendations && item.recommendations.length > 0)
    ? item.recommendations
        .filter((r) => isValidAnimeCoverImage(r.posterImage))
        .map((r) => ({
          id: r.id,
          title: r.title,
          posterImage: r.posterImage,
          type: r.type,
          rating: typeof r.rating === 'number' ? r.rating : (typeof item.rating === 'number' ? item.rating : 8.0),
          releaseYear: r.releaseYear ?? item.releaseYear,
          russianTitle: r.russianTitle,
          englishTitle: r.englishTitle,
          romajiTitle: r.romajiTitle,
        }))
    : item.type === 'MANHWA'
    ? manhwaRecs
        .filter((m) => isValidAnimeCoverImage(m.posterImage))
        .map((m) => ({
          id: m.id,
          title: m.title,
          posterImage: m.posterImage,
          type: m.type,
          rating: m.rating,
          releaseYear: m.releaseYear,
          russianTitle: m.russianTitle,
          englishTitle: m.englishTitle,
          romajiTitle: m.titles?.romaji,
        }))
    : []; // For Anime, NEVER fallback to mockData with random/unsplash/nature/abstract images.

  const recommendations = rawRecommendations.filter((rec) => !failedRecImages.has(rec.id));

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast(t('linkCopied'), t('linkCopied'));
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      {/* Cinematic Backdrop Banner */}
      <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] overflow-hidden bg-black">
        <img
          key={`${item.id}-${safeBannerSrc}`}
          src={safeBannerSrc}
          alt={displayTitle}
          onError={handleBannerError}
          className="w-full h-full object-cover object-center opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/60 to-black/50" />

        {/* Back Button */}
        <div className="absolute top-6 left-4 sm:left-8 z-20">
          <button
            id="back-button"
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-slate-200 border border-white/10 backdrop-blur-md transition-colors text-xs sm:text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Container Overlapping Backdrop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-56 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
          {/* Left Column: Poster & Quick Actions */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center md:items-start">
            <div className="w-56 sm:w-64 md:w-full aspect-[3/4.4] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-black bg-slate-900 mb-5 relative group">
              <img
                src={safePosterSrc}
                alt={displayTitle}
                onError={() => setPosterError(true)}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 text-amber-400 text-xs font-bold backdrop-blur-md border border-white/10">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{item.rating ? item.rating.toFixed(1) : '8.5'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2.5">
              <button
                id="media-primary-action"
                type="button"
                onClick={() => openTrailer(item)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-xl shadow-rose-900/40 active:scale-98 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{item.type === 'ANIME' ? `${t('previewTrailer')}` : t('readMore')}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="media-toggle-watchlist"
                  type="button"
                  onClick={() => toggleWatchlist(item)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all ${
                    inList
                      ? 'bg-emerald-600/90 text-white border-emerald-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                  }`}
                >
                  {inList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{inList ? t('inLibrary') : t('addToLibrary')}</span>
                </button>

                <button
                  id="media-share-button"
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t('share')}</span>
                </button>
              </div>
            </div>

            {/* Sidebar Metadata Card */}
            <div className="w-full mt-6 p-4 rounded-xl bg-[#121420] border border-white/8 space-y-3 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] pb-2 border-b border-white/6">
                {t('overview')}
              </h4>
              <div className="flex justify-between text-slate-400">
                <span>{t('format')}:</span>
                <span className="font-medium text-slate-200">{item.format || 'TV Series'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t('status')}:</span>
                <span className="font-medium text-emerald-400">{item.status || 'Finished'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{item.type === 'ANIME' ? t('studio') : t('author')}:</span>
                <span className="font-medium text-slate-200 text-right truncate max-w-[140px]">
                  {item.studioOrAuthor || 'Original Staff'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t('year')}:</span>
                <span className="font-medium text-slate-200">{item.releaseYear || 2024}</span>
              </div>
              {item.episodes && (
                <div className="flex justify-between text-slate-400">
                  <span>{t('episodes')}:</span>
                  <span className="font-medium text-slate-200">{item.episodes} eps</span>
                </div>
              )}
              {item.chapters && (
                <div className="flex justify-between text-slate-400">
                  <span>{t('chapters')}:</span>
                  <span className="font-medium text-slate-200">{item.chapters}</span>
                </div>
              )}
              {item.rank && (
                <div className="flex justify-between text-slate-400">
                  <span>{t('rank')}:</span>
                  <span className="font-medium text-amber-400">#{item.rank}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Title, Synopsis, Tabs, Characters */}
          <div className="md:col-span-8 lg:col-span-9 pt-4 md:pt-12">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-600/20 text-rose-400 border border-rose-500/30">
                {item.type}
              </span>
              {item.season && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-300">
                  {item.season} {item.releaseYear}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-display mb-2">
              {displayTitle}
            </h1>

            {item.englishTitle && item.englishTitle !== displayTitle && (
              <p className="text-sm text-slate-400 mb-1">{item.englishTitle}</p>
            )}
            {item.japaneseTitle && (
              <p className="text-xs text-slate-400 mb-4">{item.japaneseTitle}</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 my-4">
              {(item.genres || []).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(genre)}`)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/8 transition-colors"
                >
                  {resolveGenre(genre)}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 mt-8 mb-4 border-b border-white/8 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-3 transition-colors relative ${
                  activeTab === 'overview' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('overview')}
                {activeTab === 'overview' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('characters')}
                className={`pb-3 transition-colors relative ${
                  activeTab === 'characters' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('characters')}
                {activeTab === 'characters' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('episodes')}
                className={`pb-3 transition-colors relative ${
                  activeTab === 'episodes' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.type === 'ANIME' ? t('episodes') : t('chapters')}
                {activeTab === 'episodes' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-2">{t('synopsis')}</h3>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                    {item.synopsis || 'No synopsis available for this title.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#141724] border border-white/6 text-xs text-slate-400 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">Real-Time Data Active</p>
                    <p className="mt-0.5">
                      Information is retrieved and normalized dynamically from the AnimeHub API layer (AniList GraphQL & Jikan fallback) with in-memory caching and safe-for-work filtration.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div>
                <h3 className="text-base font-bold text-white mb-4">{t('characters')}</h3>
                {item.characters && item.characters.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {item.characters.map((char) => (
                      <div
                        key={char.id}
                        className="flex items-center gap-3 p-3 bg-[#131520] border border-white/6 rounded-xl"
                      >
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                        />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-white">{char.name}</p>
                          <p className="text-[11px] text-slate-400">{char.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#131520] rounded-xl border border-white/6 text-slate-400 text-xs">
                    No character data available for this title.
                  </div>
                )}

                {item.staff && item.staff.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-base font-bold text-white mb-4">{t('staff')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {item.staff.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-2.5 bg-[#131520] border border-white/6 rounded-xl"
                        >
                          {member.image ? (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs text-slate-400 font-bold flex-shrink-0">
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{member.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'episodes' && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white mb-3">
                  {item.type === 'ANIME' ? t('episodes') : t('chapters')}
                </h3>
                <div className="divide-y divide-white/6 bg-[#131520] border border-white/8 rounded-xl overflow-hidden">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-bold text-slate-400 text-xs">
                          {idx}
                        </span>
                        <div>
                          <p className="font-semibold text-white">
                            {item.type === 'ANIME' ? `${t('episodes')} ${idx}` : `${t('chapters')} ${idx}`}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.type === 'ANIME' ? 'Broadcast • 24m HD' : item.type === 'MANHWA' ? 'Webtoon • Full Color' : 'Manga Chapter • Digital'}
                          </p>
                        </div>
                      </div>

                      {item.type === 'ANIME' ? (
                        <button
                          type="button"
                          onClick={() => openTrailer(item)}
                          className="px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-lg bg-white/5 text-slate-400 text-xs font-medium">
                          Read
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Section (Only displayed when valid real cover recommendations exist) */}
            {recommendations.length > 0 && (
              <div className="mt-14 pt-10 border-t border-white/8">
                <h3 className="text-xl font-bold text-white font-display mb-4">
                  {t('recommendations')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => {
                        navigate(rec.type === 'MANGA' ? `/manga/${rec.id}` : rec.type === 'MANHWA' ? `/manhwa/${rec.id}` : `/anime/${rec.id}`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="cursor-pointer group"
                    >
                      <div className="aspect-[3/4.2] rounded-xl overflow-hidden bg-slate-900 border border-white/8 mb-2">
                        <img
                          src={rec.posterImage}
                          alt={resolveTitle(rec as any)}
                          onError={() => {
                            // If cover fails to load, hide this recommendation rather than showing a placeholder or random image
                            setFailedRecImages((prev) => new Set(prev).add(rec.id));
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="text-xs font-semibold text-white group-hover:text-rose-400 line-clamp-1">
                        {resolveTitle(rec as any)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {rec.releaseYear ? `${rec.releaseYear} • ` : ''}★ {(rec.rating ?? 8.0).toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
