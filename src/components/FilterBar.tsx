import React from 'react';
import { Filter, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FilterBarProps {
  genres: string[];
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  selectedSort: string;
  onSelectSort: (sort: string) => void;
  statuses?: string[];
  sortOptions?: { label: string; value: string }[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  genres,
  selectedGenre,
  onSelectGenre,
  selectedStatus,
  onSelectStatus,
  selectedSort,
  onSelectSort,
  statuses = ['All', 'Airing', 'Completed', 'Upcoming'],
  sortOptions,
}) => {
  const { t, resolveGenre } = useLanguage();

  const defaultSortOptions = [
    { label: t('sortHighestRated'), value: 'rating' },
    { label: t('sortMostPopular'), value: 'popularity' },
    { label: t('sortReleaseDate'), value: 'release' },
    { label: t('sortTitleAZ'), value: 'title' },
  ];

  const resolvedSortOptions = sortOptions || defaultSortOptions;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'All':
        return t('all');
      case 'Airing':
        return t('airing');
      case 'Completed':
        return t('completed');
      case 'Upcoming':
        return t('upcoming');
      case 'Publishing':
        return t('publishing');
      case 'Hiatus':
        return t('hiatus');
      default:
        return status;
    }
  };

  const handleGenreClick = (genre: string) => {
    if (selectedGenre === genre) {
      onSelectGenre('All');
    } else {
      onSelectGenre(genre);
    }
  };

  const isAllSelected = selectedGenre === 'All' || !selectedGenre;

  return (
    <div className="bg-[#12141e] border border-white/8 rounded-2xl p-3.5 sm:p-5 mb-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t('status')}:
          </span>
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onSelectStatus(status)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === status
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
              }`}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            {t('sort')}:
          </span>
          <select
            value={selectedSort}
            onChange={(e) => onSelectSort(e.target.value)}
            className="bg-[#191c2c] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            {resolvedSortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Genres Wrapping Grid */}
      <div className="pt-3.5 border-t border-white/6 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-rose-400" />
              {t('genres')}:
            </span>
            {!isAllSelected && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">
                {resolveGenre(selectedGenre)}
              </span>
            )}
          </div>

          {!isAllSelected && (
            <button
              type="button"
              onClick={() => onSelectGenre('All')}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors font-medium flex items-center gap-1 cursor-pointer"
              title={t('clearGenre')}
            >
              <X className="w-3 h-3" />
              <span>{t('clearGenre')}</span>
            </button>
          )}
        </div>

        {/* Responsive Wrapping Grid of Genre Buttons */}
        <div
          id="genre-filter-grid"
          className="grid grid-cols-2 min-[370px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2 w-full"
        >
          {/* 'All' / 'All Genres' Option */}
          <button
            id="genre-pill-all"
            type="button"
            onClick={() => onSelectGenre('All')}
            className={`h-9 px-2 min-[360px]:px-2.5 sm:px-3 rounded-xl text-xs font-medium min-w-0 flex items-center justify-center text-center transition-all ${
              isAllSelected
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold shadow-sm shadow-rose-950/30'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/6'
            }`}
          >
            <span className="truncate w-full text-center px-0.5">{t('allGenres')}</span>
          </button>

          {/* Supported Genre Options */}
          {genres.map((genre) => {
            const isActive = selectedGenre === genre;
            const label = resolveGenre(genre);
            return (
              <button
                key={genre}
                id={`genre-pill-${genre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                type="button"
                onClick={() => handleGenreClick(genre)}
                title={label}
                className={`h-9 px-2 min-[360px]:px-2.5 sm:px-3 rounded-xl text-xs font-medium min-w-0 flex items-center justify-center text-center transition-all ${
                  isActive
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold shadow-sm shadow-rose-950/30'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/6'
                }`}
              >
                <span className="truncate w-full text-center px-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
