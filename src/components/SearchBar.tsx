import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Film, BookOpen, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { allMediaItems } from '../data/mockData';
import { MediaItem } from '../types';
import { universalSearch } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';

interface SearchBarProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'modal' | 'inline';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen = true,
  onClose,
  variant = 'inline',
}) => {
  const { navigate } = useRouter();
  const { t, resolveTitle } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ANIME' | 'MANGA' | 'MANHWA'>('ALL');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const apiRes = await universalSearch(query.trim(), activeTab, 6);
        if (apiRes && apiRes.data && apiRes.data.length > 0) {
          setResults(apiRes.data);
          return;
        }
      } catch {
        // Ignore, fallback to local search
      }

      // Local filter fallback
      const cleanQuery = query.toLowerCase().trim();
      const filtered = allMediaItems.filter((item) => {
        const matchesTab = activeTab === 'ALL' || item.type === activeTab;
        const matchesText =
          item.title.toLowerCase().includes(cleanQuery) ||
          (item.englishTitle && item.englishTitle.toLowerCase().includes(cleanQuery)) ||
          item.genres.some((g) => g.toLowerCase().includes(cleanQuery)) ||
          item.studioOrAuthor.toLowerCase().includes(cleanQuery);
        return matchesTab && matchesText;
      });

      setResults(filtered.slice(0, 6));
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}&type=${activeTab}`);
      if (onClose) onClose();
    }
  };

  const handleSelect = (item: MediaItem) => {
    const route =
      item.type === 'ANIME'
        ? `/anime/${item.id}`
        : item.type === 'MANGA'
        ? `/manga/${item.id}`
        : `/manhwa/${item.id}`;
    navigate(route);
    if (onClose) onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANIME':
        return <Film className="w-3.5 h-3.5 text-rose-400" />;
      case 'MANGA':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-400" />;
      case 'MANHWA':
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return null;
    }
  };

  const tabs = [
    { key: 'ALL', label: t('all') },
    { key: 'ANIME', label: t('navAnime') },
    { key: 'MANGA', label: t('navManga') },
    { key: 'MANHWA', label: t('navManhwa') },
  ] as const;

  const content = (
    <div className="w-full">
      {/* Search Input Container */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-12 pr-10 py-3.5 bg-[#141724] hover:bg-[#181b2a] focus:bg-[#181b2a] text-white placeholder-slate-400 border border-white/10 focus:border-rose-500 rounded-xl outline-none transition-all text-sm sm:text-base shadow-inner"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs text-slate-400 mr-1 font-medium">{t('filters')}:</span>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === tab.key
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Results Dropdown */}
      {query && (
        <div className="mt-3 bg-[#131521] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          {results.length > 0 ? (
            <div className="divide-y divide-white/5">
              {results.map((item) => {
                const title = resolveTitle(item);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.posterImage}
                        alt={title}
                        className="w-10 h-14 rounded object-cover flex-shrink-0 bg-slate-800"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors truncate">
                          {title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1 capitalize">
                            {getTypeIcon(item.type)}
                            {item.type.toLowerCase()}
                          </span>
                          <span>•</span>
                          <span>{item.releaseYear}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-medium">★ {item.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0 ml-3" />
                  </div>
                );
              })}

              <div className="p-3 bg-[#0d0f18] text-center">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  {t('viewAll')} →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  {t('loading')}
                </div>
              ) : (
                <p className="text-sm">{t('searchNoResults')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Suggested Quick Searches when empty */}
      {!query && (
        <div className="mt-3.5">
          <p className="text-xs text-slate-400 font-medium mb-2">{t('trending')}:</p>
          <div className="flex flex-wrap gap-1.5">
            {['Solo Leveling', 'Jujutsu Kaisen', 'Berserk', 'Omniscient Reader', 'Frieren', 'MAPPA'].map(
              (term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-colors"
                >
                  {term}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (variant === 'modal') {
    if (!isOpen) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl bg-[#0e1019] border border-white/10 rounded-2xl p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              {t('searchTitle')}
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
