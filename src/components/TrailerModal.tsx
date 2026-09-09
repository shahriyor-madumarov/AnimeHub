import React, { useState, useEffect } from 'react';
import { X, Play, Volume2, Bookmark, Check, Plus, Star, ExternalLink } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../context/LanguageContext';
import { isValidMediaCoverImage, ANIMEHUB_BANNER_FALLBACK } from '../lib/mediaImage';

export const TrailerModal: React.FC = () => {
  const { activeTrailer, closeTrailer, isInWatchlist, toggleWatchlist } = useWatchlist();
  const { navigate } = useRouter();
  const { t, resolveTitle } = useLanguage();
  const [bannerFailed, setBannerFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setBannerFailed(false);
    setCoverFailed(false);
  }, [activeTrailer?.id]);

  if (!activeTrailer) return null;

  const inList = isInWatchlist(activeTrailer.id);
  const displayTitle = resolveTitle(activeTrailer);

  let bannerSrc = ANIMEHUB_BANNER_FALLBACK;
  if (!bannerFailed && isValidMediaCoverImage(activeTrailer.bannerImage)) {
    bannerSrc = activeTrailer.bannerImage.trim();
  } else if (!coverFailed && isValidMediaCoverImage(activeTrailer.posterImage)) {
    bannerSrc = activeTrailer.posterImage.trim();
  } else {
    bannerSrc = ANIMEHUB_BANNER_FALLBACK;
  }

  const handleBannerError = () => {
    if (!bannerFailed && isValidMediaCoverImage(activeTrailer.bannerImage)) {
      setBannerFailed(true);
    } else {
      setCoverFailed(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={closeTrailer}
    >
      <div
        className="relative w-full max-w-3xl bg-[#11131c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeTrailer}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 transition-colors"
          title="Close player preview"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video simulation banner */}
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
          <img
            key={`${activeTrailer.id}-${bannerSrc}`}
            src={bannerSrc}
            alt={displayTitle}
            onError={handleBannerError}
            className="w-full h-full object-cover opacity-60 scale-105"
          />

          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#11131c] via-transparent to-black/40" />

          {/* Interactive Player Simulation */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-16 h-16 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-900/50 cursor-pointer transform hover:scale-110 active:scale-95 transition-all">
              <Play className="w-7 h-7 fill-white ml-1" />
            </div>
            <p className="mt-4 text-xs sm:text-sm font-semibold text-white/90 bg-black/70 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              Official HD Trailer Stream Preview • {activeTrailer.studioOrAuthor}
            </p>
          </div>

          {/* Playback progress bar mock */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div className="h-full w-1/3 bg-rose-500 rounded-r" />
          </div>
        </div>

        {/* Details & Controls */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {activeTrailer.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-black/50 px-2 py-0.5 rounded border border-white/10">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {activeTrailer.rating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">
                  {activeTrailer.releaseYear} • {activeTrailer.format}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                {displayTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleWatchlist(activeTrailer)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                  inList
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                }`}
              >
                {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{inList ? t('inLibrary') : t('addToLibrary')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeTrailer();
                  navigate(
                    activeTrailer.type === 'ANIME'
                      ? `/anime/${activeTrailer.id}`
                      : activeTrailer.type === 'MANGA'
                      ? `/manga/${activeTrailer.id}`
                      : `/manhwa/${activeTrailer.id}`
                  );
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                <span>{t('overview')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-300 mt-4 leading-relaxed line-clamp-3">
            {activeTrailer.synopsis}
          </p>
        </div>
      </div>
    </div>
  );
};
