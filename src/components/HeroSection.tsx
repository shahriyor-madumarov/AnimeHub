import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Star, Info, Sparkles } from 'lucide-react';
import { MediaItem } from '../types';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';
import { getSafeBannerImage, isValidMediaCoverImage, ANIMEHUB_BANNER_FALLBACK } from '../lib/mediaImage';

interface HeroSectionProps {
  featuredItems: MediaItem[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ featuredItems }) => {
  const { navigate } = useRouter();
  const { isInWatchlist, toggleWatchlist, openTrailer } = useWatchlist();
  const { resolveTitle, resolveGenre, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedBanners, setFailedBanners] = useState<Record<string, boolean>>({});
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});

  const activeItem = featuredItems[currentIndex] || featuredItems[0];
  const inList = activeItem ? isInWatchlist(activeItem.id) : false;
  const displayTitle = activeItem ? resolveTitle(activeItem) : '';

  // Auto rotate banner every 8 seconds if user doesn't manually switch
  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredItems.length, currentIndex]);

  if (!activeItem) return null;

  const hasBannerFailed = Boolean(failedBanners[activeItem.id]);
  const hasCoverFailed = Boolean(failedCovers[activeItem.id]);

  let bannerSrc = ANIMEHUB_BANNER_FALLBACK;
  if (!hasBannerFailed && isValidMediaCoverImage(activeItem.bannerImage)) {
    bannerSrc = activeItem.bannerImage.trim();
  } else if (!hasCoverFailed && isValidMediaCoverImage(activeItem.posterImage)) {
    bannerSrc = activeItem.posterImage.trim();
  } else {
    bannerSrc = ANIMEHUB_BANNER_FALLBACK;
  }

  const handleBannerError = () => {
    if (!hasBannerFailed && isValidMediaCoverImage(activeItem.bannerImage)) {
      // Primary bannerImage failed (e.g. 404) -> switch to coverImage
      setFailedBanners((prev) => ({ ...prev, [activeItem.id]: true }));
    } else {
      // Cover fallback failed or unavailable -> switch to safe AnimeHub banner fallback
      setFailedCovers((prev) => ({ ...prev, [activeItem.id]: true }));
    }
  };

  return (
    <section className="relative w-full h-[580px] sm:h-[640px] lg:h-[720px] overflow-hidden bg-black select-none">
      {/* Background Banner Image with Multi-layer Cinematic Vignettes */}
      <div className="absolute inset-0">
        <img
          key={`${activeItem.id}-${bannerSrc}`}
          src={bannerSrc}
          alt={displayTitle}
          onError={handleBannerError}
          className="w-full h-full object-cover object-center scale-100 animate-fadeIn transition-transform duration-1000 ease-out"
        />

        {/* Gradient overlays to guarantee text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f] via-[#090a0f]/80 to-transparent w-full md:w-3/4" />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Main Content Area */}
      <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-end pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-2xl">
          {/* Top Pill / Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-900/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>#1 {t('spotlight')}</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-amber-400 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{activeItem.rating.toFixed(1)} {t('score')}</span>
            </div>

            <span className="text-xs text-slate-300 font-medium px-2 py-0.5 rounded bg-white/10 backdrop-blur-md">
              {activeItem.format}
            </span>

            <span className="text-xs text-slate-300 font-medium">
              {activeItem.releaseYear}
            </span>

            {activeItem.episodes && (
              <span className="text-xs text-slate-400">
                • {activeItem.episodes} {t('episodes')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight font-display mb-3 drop-shadow-md">
            {displayTitle}
          </h1>

          {/* Genres Chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {activeItem.genres.map((genre) => (
              <span
                key={genre}
                className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 backdrop-blur-sm transition-colors"
              >
                {resolveGenre(genre)}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed mb-6 drop-shadow">
            {activeItem.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="hero-watch-button"
              type="button"
              onClick={() => openTrailer(activeItem)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-xl shadow-rose-900/40 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{t('watchNow')}</span>
            </button>

            <button
              id="hero-add-to-list-button"
              type="button"
              onClick={() => toggleWatchlist(activeItem)}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm backdrop-blur-md border transition-all active:scale-95 ${
                inList
                  ? 'bg-emerald-600/90 text-white border-emerald-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
            >
              {inList ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>{t('inLibrary')}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{t('saveToLibrary')}</span>
                </>
              )}
            </button>

            <button
              id="hero-details-button"
              type="button"
              onClick={() => navigate(`/anime/${activeItem.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-colors"
            >
              <Info className="w-4 h-4" />
              <span>{t('details')}</span>
            </button>
          </div>
        </div>

        {/* Carousel slide indicators on bottom right */}
        {featuredItems.length > 1 && (
          <div className="absolute bottom-6 right-4 sm:right-8 flex items-center gap-2 z-20">
            {featuredItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(idx)}
                title={resolveTitle(item)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-8 bg-rose-500'
                    : 'w-2.5 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
