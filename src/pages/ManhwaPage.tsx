import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { ManhwaCard } from '../components/ManhwaCard';
import { FilterBar } from '../components/FilterBar';
import { CardGridSkeleton } from '../components/Skeletons';
import { fetchManhwaList } from '../lib/api';
import { mockManhwaList } from '../data/mockData';
import { MediaItem, PageInfo } from '../types';
import { useLanguage } from '../context/LanguageContext';

const POPULAR_MANHWA_GENRES = [
  'Action',
  'Adventure',
  'Apocalyptic',
  'Comedy',
  'Drama',
  'Dungeon',
  'Fantasy',
  'High School',
  'Historical',
  'Isekai',
  'Magic',
  'Martial Arts',
  'Murim',
  'Mystery',
  'Psychological',
  'Reincarnation',
  'Romance',
  'Sci-Fi',
  'Sports',
  'Supernatural',
  'System',
  'Thriller',
];

export const ManhwaPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSort, setSelectedSort] = useState('rating');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    currentPage: 1,
    hasNextPage: false,
    perPage: 18,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search input to avoid aggressive queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadData() {
      try {
        const res = await fetchManhwaList({
          search: debouncedSearch.trim() || undefined,
          genre: selectedGenre !== 'All' ? selectedGenre : undefined,
          status: selectedStatus !== 'All' ? selectedStatus : undefined,
          sort: selectedSort,
          page,
          perPage: 18,
        });

        if (isMounted && res && res.data) {
          setItems(res.data);
          setPageInfo(res.pageInfo);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[AnimeHub] Failed to fetch manhwa list from MangaDex API', err);
          const fallback = mockManhwaList.filter((item) => {
            if (selectedGenre !== 'All' && !item.genres.includes(selectedGenre)) return false;
            if (selectedStatus !== 'All' && item.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
            if (debouncedSearch.trim()) {
              const q = debouncedSearch.toLowerCase().trim();
              return item.title.toLowerCase().includes(q) || (item.englishTitle && item.englishTitle.toLowerCase().includes(q));
            }
            return true;
          });
          setItems(fallback);
          setPageInfo({ currentPage: 1, hasNextPage: false, perPage: 18, total: fallback.length });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, selectedGenre, selectedStatus, selectedSort, page]);

  const handleSelectGenre = (genre: string) => {
    setSelectedGenre(genre);
    setPage(1);
  };

  const handleSelectStatus = (status: string) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handleSelectSort = (sort: string) => {
    setSelectedSort(sort);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('All');
    setSelectedStatus('All');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedGenre !== 'All' || selectedStatus !== 'All');

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              {t('koreanWebtoons')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            {t('navManhwa')}
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            {t('manhwaSubtitle')}
          </p>
        </div>

        {/* Search Bar Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="manhwa-catalog-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t('searchPlaceholder') || 'Search manhwa by title...'}
            className="w-full pl-11 pr-10 py-3 bg-[#121420] text-white border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-500 placeholder-slate-400 text-sm transition-colors"
          />
          {searchQuery && (
            <button
              id="clear-manhwa-search-btn"
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          genres={POPULAR_MANHWA_GENRES}
          selectedGenre={selectedGenre}
          onSelectGenre={handleSelectGenre}
          selectedStatus={selectedStatus}
          onSelectStatus={handleSelectStatus}
          selectedSort={selectedSort}
          onSelectSort={handleSelectSort}
          statuses={['All', 'Publishing', 'Completed']}
        />

        {/* Results count */}
        <div className="flex items-center justify-between mb-6 text-xs text-slate-400">
          <p>
            {t('showing')} <span className="font-semibold text-white">{items.length}</span> {t('titles')}
            {pageInfo.total ? ` ${t('of')} ${pageInfo.total}` : ''}
          </p>
          {hasActiveFilters && (
            <button
              id="reset-manhwa-filters-btn"
              onClick={handleResetFilters}
              className="text-cyan-400 hover:underline font-medium"
            >
              {t('resetFilters')}
            </button>
          )}
        </div>

        {/* Grid / Skeletons */}
        {isLoading ? (
          <CardGridSkeleton count={12} />
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {items.map((manhwa) => (
              <ManhwaCard key={manhwa.id} manhwa={manhwa} />
            ))}
          </div>
        ) : (
          <div className="bg-[#131521] border border-white/8 rounded-2xl p-12 text-center">
            <p className="text-base text-white font-semibold">{t('noManhwaFound')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('tryDifferentGenre')}</p>
            {hasActiveFilters && (
              <button
                id="empty-reset-manhwa-filters-btn"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold"
              >
                {t('resetFilters')}
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-center gap-3 mt-12">
          <button
            id="manhwa-prev-page-btn"
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 200, behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#131521] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-white/8 text-xs font-semibold transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('previous')}
          </button>

          <span className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/8 text-xs font-medium text-slate-300">
            {t('page')} {page}
          </span>

          <button
            id="manhwa-next-page-btn"
            type="button"
            disabled={!pageInfo.hasNextPage || isLoading}
            onClick={() => {
              setPage((p) => p + 1);
              window.scrollTo({ top: 200, behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#131521] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-white/8 text-xs font-semibold transition-all"
          >
            {t('next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

