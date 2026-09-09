import React, { useState } from 'react';
import { Star, Bookmark, Play, Plus, Check } from 'lucide-react';
import { MediaItem } from '../types';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';
import { getSafeCoverImage, ANIMEHUB_COVER_FALLBACK } from '../lib/mediaImage';

interface AnimeCardProps {
  anime: MediaItem;
  layout?: 'standard' | 'compact' | 'horizontal';
  showGenres?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  layout = 'standard',
  showGenres = true,
}) => {
  const { navigate } = useRouter();
  const { isInWatchlist, toggleWatchlist, openTrailer } = useWatchlist();
  const { resolveTitle, resolveGenre, t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const inList = isInWatchlist(anime.id);

  const displayTitle = resolveTitle(anime);
  const posterSrc = imgError ? ANIMEHUB_COVER_FALLBACK : getSafeCoverImage(anime.posterImage);

  const handleClick = (e: React.MouseEvent) => {
    // If target was bookmark or trailer, don't trigger full card click
    const target = e.target as HTMLElement;
    if (target.closest('button[data-action]')) return;
    navigate(`/anime/${anime.id}`);
  };

  const statusColor =
    anime.status === 'Airing'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : anime.status === 'Completed'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

  const statusLabel =
    anime.status === 'Airing'
      ? t('airing')
      : anime.status === 'Completed'
      ? t('completed')
      : anime.status === 'Upcoming'
      ? t('upcoming')
      : anime.status;

  return (
    <div
      id={`anime-card-${anime.id}`}
      onClick={handleClick}
      className="group relative flex flex-col bg-[#13151f] hover:bg-[#181b28] border border-white/6 hover:border-white/15 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/60 hover:-translate-y-1"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-slate-900">
        <img
          src={posterSrc}
          alt={displayTitle}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13151f] via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-amber-400 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{anime.rating.toFixed(1)}</span>
          </div>

          <button
            data-action="watchlist"
            type="button"
            id={`btn-watchlist-${anime.id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(anime);
            }}
            title={inList ? t('removeFromLibrary') : t('addToLibrary')}
            aria-label={inList ? t('removeFromLibrary') : t('addToLibrary')}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
              inList
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-black/60 text-slate-300 border-white/15 hover:bg-rose-500 hover:text-white hover:border-rose-400'
            }`}
          >
            {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick play preview button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <button
            data-action="trailer"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openTrailer(anime);
            }}
            className="pointer-events-auto p-3.5 rounded-full bg-rose-600/90 text-white shadow-lg shadow-rose-600/30 hover:scale-110 active:scale-95 transition-transform"
            title={t('previewTrailer')}
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
        </div>

        {/* Bottom meta badge in image */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-black/70 backdrop-blur-sm text-slate-200 border border-white/10">
            {anime.format}
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border backdrop-blur-sm ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Content Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3
            className="font-semibold text-sm sm:text-base text-white line-clamp-1 group-hover:text-rose-400 transition-colors"
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{anime.releaseYear}</span>
            <span>•</span>
            <span className="truncate max-w-[120px]">{anime.studioOrAuthor}</span>
            {anime.episodes && (
              <>
                <span>•</span>
                <span>{anime.episodes} {t('eps')}</span>
              </>
            )}
          </div>
        </div>

        {showGenres && anime.genres && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {anime.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5"
              >
                {resolveGenre(genre)}
              </span>
            ))}
            {anime.genres.length > 2 && (
              <span className="text-[10px] px-1 py-0.5 text-slate-400">
                +{anime.genres.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
