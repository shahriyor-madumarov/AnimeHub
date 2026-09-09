import React, { useState } from 'react';
import { Star, BookOpen, Plus, Check } from 'lucide-react';
import { MediaItem } from '../types';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';
import { getSafeCoverImage, ANIMEHUB_COVER_FALLBACK } from '../lib/mediaImage';

interface MangaCardProps {
  manga: MediaItem;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga }) => {
  const { navigate } = useRouter();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { resolveTitle, t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const inList = isInWatchlist(manga.id);

  const displayTitle = resolveTitle(manga);
  const posterSrc = imgError ? ANIMEHUB_COVER_FALLBACK : getSafeCoverImage(manga.posterImage);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button[data-action]')) return;
    navigate(`/manga/${manga.id}`);
  };

  return (
    <div
      id={`manga-card-${manga.id}`}
      onClick={handleClick}
      className="group relative flex flex-col bg-[#12141d] hover:bg-[#171a25] border border-white/6 hover:border-indigo-500/40 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-950/20 hover:-translate-y-1"
    >
      {/* Poster */}
      <div className="relative aspect-[3/4.4] w-full overflow-hidden bg-slate-900">
        <img
          src={posterSrc}
          alt={displayTitle}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter group-hover:contrast-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#12141d] via-transparent to-black/40 opacity-85 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-amber-400 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{manga.rating.toFixed(1)}</span>
          </div>

          <button
            data-action="watchlist"
            type="button"
            id={`btn-watchlist-manga-${manga.id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(manga);
            }}
            title={inList ? t('removeFromLibrary') : t('addToLibrary')}
            aria-label={inList ? t('removeFromLibrary') : t('addToLibrary')}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
              inList
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-black/60 text-slate-300 border-white/15 hover:bg-indigo-600 hover:text-white'
            }`}
          >
            {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Format & Chapter badges */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 backdrop-blur-sm">
            <BookOpen className="w-3 h-3" />
            <span>{t('format')}</span>
          </span>
          {manga.chapters && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-black/80 text-slate-300 border border-white/10 backdrop-blur-sm">
              {t('chapters')} {manga.chapters}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3
            className="font-semibold text-sm sm:text-base text-white line-clamp-1 group-hover:text-indigo-400 transition-colors"
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="truncate max-w-[130px]">{manga.studioOrAuthor}</span>
            <span>•</span>
            <span>{manga.releaseYear}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-xs text-slate-400">
          <span className="text-[11px] text-slate-400">
            {manga.volumes ? `${manga.volumes} ${t('volumes')}` : manga.status}
          </span>
          <span className="text-[11px] font-medium text-indigo-400 group-hover:translate-x-0.5 transition-transform">
            {t('overview')} →
          </span>
        </div>
      </div>
    </div>
  );
};
