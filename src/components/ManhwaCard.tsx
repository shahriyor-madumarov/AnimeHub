import React, { useState } from 'react';
import { Star, Sparkles, Plus, Check } from 'lucide-react';
import { MediaItem } from '../types';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';
import { getSafeCoverImage, ANIMEHUB_COVER_FALLBACK } from '../lib/mediaImage';

interface ManhwaCardProps {
  manhwa: MediaItem;
}

export const ManhwaCard: React.FC<ManhwaCardProps> = ({ manhwa }) => {
  const { navigate } = useRouter();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { resolveTitle, resolveGenre, t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const inList = isInWatchlist(manhwa.id);

  const displayTitle = resolveTitle(manhwa);
  const posterSrc = imgError ? ANIMEHUB_COVER_FALLBACK : getSafeCoverImage(manhwa.posterImage);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button[data-action]')) return;
    navigate(`/manhwa/${manhwa.id}`);
  };

  return (
    <div
      id={`manhwa-card-${manhwa.id}`}
      onClick={handleClick}
      className="group relative flex flex-col bg-[#11131c] hover:bg-[#161824] border border-white/6 hover:border-cyan-500/40 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/20 hover:-translate-y-1"
    >
      {/* Poster with vertical webtoon aspect ratio */}
      <div className="relative aspect-[3/4.3] w-full overflow-hidden bg-slate-900">
        <img
          src={posterSrc}
          alt={displayTitle}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#11131c] via-transparent to-black/40 opacity-85 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-amber-400 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{manhwa.rating.toFixed(1)}</span>
          </div>

          <button
            data-action="watchlist"
            type="button"
            id={`btn-watchlist-manhwa-${manhwa.id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(manhwa);
            }}
            title={inList ? t('removeFromLibrary') : t('addToLibrary')}
            aria-label={inList ? t('removeFromLibrary') : t('addToLibrary')}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
              inList
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-black/60 text-slate-300 border-white/15 hover:bg-cyan-600 hover:text-white'
            }`}
          >
            {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Manhwa Pill */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{t('webtoon')}</span>
          </span>
          {manhwa.chapters && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-black/80 text-slate-300 border border-white/10 backdrop-blur-sm">
              {manhwa.chapters} {t('chapters')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3
            className="font-semibold text-sm sm:text-base text-white line-clamp-1 group-hover:text-cyan-400 transition-colors"
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="truncate max-w-[130px]">{manhwa.studioOrAuthor}</span>
            <span>•</span>
            <span>{manhwa.releaseYear}</span>
          </div>
        </div>

        {manhwa.genres && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {manhwa.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5"
              >
                {resolveGenre(genre)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
