import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Bookmark, Film, BookOpen, Sparkles, X } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { allMediaItems } from '../data/mockData';
import { MediaItem } from '../types';
import { AnimeCard } from '../components/AnimeCard';
import { MangaCard } from '../components/MangaCard';
import { ManhwaCard } from '../components/ManhwaCard';
import { CardGridSkeleton } from '../components/Skeletons';
import { universalSearch, fetchPopularManhwa } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { getSafeCoverImage } from '../lib/mediaImage';

export const SearchPage: React.FC = () => {
  const { searchParams } = useRouter();
  const { watchlistIds, watchlistItems } = useWatchlist();
  const { t, resolveGenre } = useLanguage();

  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'ALL';
  const isLibraryTab = searchParams.get('tab') === 'library';

  const [query, setQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState<string>(isLibraryTab ? 'LIBRARY' : initialType);
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [minRating, setMinRating] = useState<number>(0);
  const [apiResults, setApiResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if URL query changes
  useEffect(() => {
    if (searchParams.get('q') !== null) {
      setQuery(searchParams.get('q') || '');
    }
    if (searchParams.get('tab') === 'library') {
      setSelectedType('LIBRARY');
    } else if (searchParams.get('type')) {
      setSelectedType(searchParams.get('type') || 'ALL');
    }
  }, [searchParams]);

  // Debounced API search
  useEffect(() => {
    let isMounted = true;
    if (selectedType === 'LIBRARY') {
      setIsLoading(false);
      return;
    }

    if (!query.trim()) {
      if (selectedType === 'MANHWA') {
        setIsLoading(true);
        fetchPopularManhwa(24)
          .then((items) => {
            if (isMounted) setApiResults(items);
          })
          .catch(() => {
            if (isMounted) setApiResults([]);
          })
          .finally(() => {
            if (isMounted) setIsLoading(false);
          });
        return;
      }
      setApiResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await universalSearch(query.trim(), selectedType, 30);
        if (isMounted && res && res.data) {
          setApiResults(res.data);
        }
      } catch (err) {
        console.warn('[AnimeHub] Universal search failed, falling back to local search');
        if (isMounted) setApiResults([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, selectedType]);

  // All genres across mock items for filter dropdown
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    allMediaItems.forEach((m) => m.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, []);

  // Filter items based on active criteria
  const results = useMemo(() => {
    // 1. Library mode: combine saved watchlist items and known media items
    if (selectedType === 'LIBRARY') {
      const libraryMap = new Map<string, MediaItem>();

      // Populate from known allMediaItems if in watchlistIds
      allMediaItems.forEach((item) => {
        if (watchlistIds.includes(item.id)) {
          libraryMap.set(item.id, {
            ...item,
            posterImage: getSafeCoverImage(item.posterImage),
          });
        }
      });

      // Overlay with saved watchlist items (which preserve dynamic items and saved covers)
      watchlistItems.forEach((item) => {
        if (watchlistIds.includes(item.id)) {
          libraryMap.set(item.id, {
            ...item,
            posterImage: getSafeCoverImage(item.posterImage),
          });
        }
      });

      const libraryList = Array.from(libraryMap.values());

      return libraryList.filter((item) => {
        if (query.trim()) {
          const q = query.toLowerCase().trim();
          const matches =
            item.title.toLowerCase().includes(q) ||
            (item.englishTitle && item.englishTitle.toLowerCase().includes(q)) ||
            item.genres.some((g) => g.toLowerCase().includes(q));
          if (!matches) return false;
        }
        if (selectedGenre !== 'ALL' && !item.genres.includes(selectedGenre)) return false;
        if (minRating > 0 && item.rating < minRating) return false;
        return true;
      });
    }

    // 2. Query search mode (prefer API results if available, else local fallback)
    const baseList =
      query.trim() && apiResults.length > 0
        ? apiResults
        : allMediaItems.filter((item) => {
            if (selectedType !== 'ALL' && item.type !== selectedType) return false;
            if (query.trim()) {
              const q = query.toLowerCase().trim();
              return (
                item.title.toLowerCase().includes(q) ||
                (item.englishTitle && item.englishTitle.toLowerCase().includes(q)) ||
                item.studioOrAuthor.toLowerCase().includes(q) ||
                item.genres.some((g) => g.toLowerCase().includes(q))
              );
            }
            return true;
          });

    return baseList.filter((item) => {
      if (selectedGenre !== 'ALL' && !item.genres.includes(selectedGenre)) {
        return false;
      }
      if (minRating > 0 && item.rating < minRating) {
        return false;
      }
      return true;
    });
  }, [query, selectedType, selectedGenre, minRating, watchlistIds, watchlistItems, apiResults]);

  const renderMediaCard = (item: MediaItem) => {
    switch (item.type) {
      case 'ANIME':
        return <AnimeCard key={item.id} anime={item} />;
      case 'MANGA':
        return <MangaCard key={item.id} manga={item} />;
      case 'MANHWA':
        return <ManhwaCard key={item.id} manhwa={item} />;
      default:
        return <AnimeCard key={item.id} anime={item} />;
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            {selectedType === 'LIBRARY' ? t('libraryTitle') : t('searchTitle')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {selectedType === 'LIBRARY'
              ? `${t('showing')} ${watchlistIds.length} ${t('titles')}`
              : t('searchSubtitle')}
          </p>
        </div>

        {/* Search Bar Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-12 pr-10 py-3.5 bg-[#121420] text-white border border-white/10 rounded-2xl focus:outline-none focus:border-rose-500 placeholder-slate-400 text-sm sm:text-base transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs: All, Anime, Manga, Manhwa, Library */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-white/8">
          {[
            { label: t('allFormats'), val: 'ALL', icon: null },
            { label: t('animeOnly'), val: 'ANIME', icon: Film },
            { label: t('mangaOnly'), val: 'MANGA', icon: BookOpen },
            { label: t('manhwaOnly'), val: 'MANHWA', icon: Sparkles },
            { label: `${t('myLibrary')} (${watchlistIds.length})`, val: 'LIBRARY', icon: Bookmark },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedType === tab.val;
            return (
              <button
                key={tab.val}
                type="button"
                onClick={() => setSelectedType(tab.val)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                    : 'bg-[#141724] hover:bg-white/10 text-slate-300 border border-white/6'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Row: Genre + Rating */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#10121c] p-3.5 rounded-xl border border-white/6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-semibold text-slate-400">{t('genres')}:</span>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-[#181a28] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">{t('allGenres')}</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>
                  {resolveGenre(g)}
                </option>
              ))}
            </select>

            <span className="text-xs font-semibold text-slate-400 ml-2">{t('minRating')}:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="bg-[#181a28] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value={0}>{t('anyScore')}</option>
              <option value={8.0}>8.0+</option>
              <option value={8.5}>8.5+</option>
              <option value={9.0}>9.0+</option>
            </select>
          </div>

          <p className="text-xs text-slate-400">
            {t('foundResults')} <span className="font-bold text-white">{results.length}</span> {t('resultsWord')}
          </p>
        </div>

        {/* Search Results Grid */}
        {isLoading ? (
          <CardGridSkeleton count={12} />
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {results.map((item) => renderMediaCard(item))}
          </div>
        ) : (
          <div className="bg-[#121420] border border-white/8 rounded-2xl p-12 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{t('noDiscoveryResults')}</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {selectedType === 'LIBRARY'
                ? t('emptyLibraryDesc')
                : t('noDiscoveryDesc')}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedType('ALL');
                  setSelectedGenre('ALL');
                  setMinRating(0);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
              >
                {t('resetAllFilters')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
