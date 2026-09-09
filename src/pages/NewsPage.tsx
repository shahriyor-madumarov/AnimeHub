import React, { useState, useEffect, useTransition } from 'react';
import { Newspaper, Search, X, RefreshCw } from 'lucide-react';
import { NewsCard } from '../components/NewsCard';
import { fetchNewsArticles, fetchNewsByCategory, fetchLatestNews } from '../lib/api';
import { NewsArticle, NewsCategory } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const NewsPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<'All' | NewsCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories: ('All' | NewsCategory)[] = [
    'All',
    'Anime',
    'Manga',
    'Manhwa',
    'Industry',
    'Announcements',
  ];

  const getCategoryLabel = (cat: 'All' | NewsCategory) => {
    if (cat === 'All') return t('all');
    if (cat === 'Anime') return t('navAnime');
    if (cat === 'Manga') return t('navManga');
    if (cat === 'Manhwa') return t('navManhwa');
    if (cat === 'Industry') return t('staff');
    if (cat === 'Announcements') return t('news');
    return cat;
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        let res: NewsArticle[] = [];
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery) {
          // Live search across news with optional category
          res = await fetchNewsArticles(
            selectedCategory !== 'All' ? selectedCategory : undefined,
            30,
            trimmedQuery
          );
        } else if (selectedCategory !== 'All') {
          // Category-specific endpoint
          res = await fetchNewsByCategory(selectedCategory, 30);
        } else {
          // General latest news
          res = await fetchLatestNews(30);
        }

        if (isMounted) {
          setArticles(res || []);
        }
      } catch (err) {
        if (isMounted) {
          setArticles([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, searchQuery ? 250 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedCategory, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const leadArticle = articles[0];
  const gridArticles = articles.slice(1);

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <Newspaper className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
                {t('editorialDispatch')}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
              {t('navNews')}
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              {t('dispatchSubtitle')}
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-80 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder') || 'Search news...'}
                className="w-full bg-[#121420] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar border-b border-white/8">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                  : 'bg-[#141724] hover:bg-white/10 text-slate-300 border border-white/6'
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-10">
            {/* Featured Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#13151f] border border-white/8 rounded-2xl p-4 sm:p-6 animate-pulse">
              <div className="md:col-span-7 aspect-[16/9] md:aspect-[16/10] bg-white/5 rounded-xl" />
              <div className="md:col-span-5 flex flex-col justify-between py-2 space-y-4">
                <div className="space-y-3">
                  <div className="h-4 w-32 bg-white/10 rounded" />
                  <div className="h-7 w-5/6 bg-white/10 rounded-lg" />
                  <div className="h-4 w-full bg-white/5 rounded" />
                  <div className="h-4 w-4/5 bg-white/5 rounded" />
                </div>
                <div className="pt-4 border-t border-white/6 flex items-center justify-between">
                  <div className="h-8 w-32 bg-white/10 rounded-full" />
                  <div className="h-4 w-20 bg-white/10 rounded" />
                </div>
              </div>
            </div>

            {/* Grid Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#13151f] border border-white/6 rounded-xl overflow-hidden p-4 space-y-3 animate-pulse"
                >
                  <div className="aspect-[16/9] w-full bg-white/5 rounded-lg" />
                  <div className="h-3 w-28 bg-white/10 rounded" />
                  <div className="h-5 w-4/5 bg-white/10 rounded" />
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-3/4 bg-white/5 rounded" />
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-3 w-16 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          /* Empty State */
          <div className="bg-[#121420] border border-white/8 rounded-2xl p-12 text-center max-w-xl mx-auto my-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Newspaper className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-display">
              {t('emptyStateTitle')}
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {searchQuery
                ? `No articles found matching "${searchQuery}". ${t('emptyStateDesc')}`
                : t('emptyStateDesc')}
            </p>
            {(selectedCategory !== 'All' || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-rose-900/30"
              >
                {t('resetFilters')}
              </button>
            )}
          </div>
        ) : (
          /* Live Articles View */
          <>
            {/* Featured Story */}
            {leadArticle && (
              <div className="mb-10">
                <NewsCard article={leadArticle} featured={true} />
              </div>
            )}

            {/* Grid Stories */}
            {gridArticles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridArticles.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

