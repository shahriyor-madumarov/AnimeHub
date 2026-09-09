import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { MangaCard } from '../components/MangaCard';
import { FilterBar } from '../components/FilterBar';
import { CardGridSkeleton } from '../components/Skeletons';
import { fetchMangaList } from '../lib/api';
import { mockMangaList } from '../data/mockData';
import { MediaItem, PageInfo } from '../types';
import { useLanguage } from '../context/LanguageContext';

const MANGA_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

export const MangaPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSort, setSelectedSort] = useState('rating');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>(() => mockMangaList);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    currentPage: 1,
    hasNextPage: true,
    perPage: 18,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadData() {
      try {
        const res = await fetchMangaList({
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
          console.warn('[AnimeHub] Failed to fetch from /api/manga, using filtered mock data');
          const filtered = mockMangaList.filter((item) => {
            const matchesGenre = selectedGenre === 'All' || item.genres.includes(selectedGenre);
            const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
            return matchesGenre && matchesStatus;
          });
          setItems(filtered);
          setPageInfo({ currentPage: 1, hasNextPage: false, perPage: 18, total: filtered.length });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedGenre, selectedStatus, selectedSort, page]);

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

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              {t('printSerializations')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            {t('navManga')}
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            {t('mangaSubtitle')}
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          genres={MANGA_GENRES}
          selectedGenre={selectedGenre}
          onSelectGenre={handleSelectGenre}
          selectedStatus={selectedStatus}
          onSelectStatus={handleSelectStatus}
          selectedSort={selectedSort}
          onSelectSort={handleSelectSort}
          statuses={['All', 'Publishing', 'Completed', 'Hiatus']}
        />

        {/* Counter */}
        <div className="flex items-center justify-between mb-6 text-xs text-slate-400">
          <p>
            {t('showing')} <span className="font-semibold text-white">{items.length}</span> {t('titles')}
            {pageInfo.total ? ` ${t('of')} ${pageInfo.total}` : ''}
          </p>
          {(selectedGenre !== 'All' || selectedStatus !== 'All') && (
            <button
              onClick={() => {
                setSelectedGenre('All');
                setSelectedStatus('All');
                setPage(1);
              }}
              className="text-indigo-400 hover:underline font-medium"
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
            {items.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        ) : (
          <div className="bg-[#131521] border border-white/8 rounded-2xl p-12 text-center">
            <p className="text-base text-white font-semibold">{t('noMangaFound')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('tryDifferentGenre')}</p>
            <button
              onClick={() => {
                setSelectedGenre('All');
                setSelectedStatus('All');
                setPage(1);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              {t('resetFilters')}
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-center gap-3 mt-12">
          <button
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
