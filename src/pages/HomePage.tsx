import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroSection } from '../components/HeroSection';
import { SectionHeader } from '../components/SectionHeader';
import { AnimeCard } from '../components/AnimeCard';
import { MangaCard } from '../components/MangaCard';
import { ManhwaCard } from '../components/ManhwaCard';
import { NewsCard } from '../components/NewsCard';
import { CardGridSkeleton } from '../components/Skeletons';
import {
  fetchTrendingAnime,
  fetchLatestAnime,
  fetchPopularManga,
  fetchPopularManhwa,
  fetchLatestNews,
} from '../lib/api';
import { mockAnimeList, mockMangaList, mockManhwaList } from '../data/mockData';
import { MediaItem, NewsArticle } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const HomePage: React.FC = () => {
  const { t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [trendingAnime, setTrendingAnime] = useState<MediaItem[]>(() =>
    mockAnimeList.filter((a) => a.isTrending)
  );
  const [latestAnime, setLatestAnime] = useState<MediaItem[]>(() =>
    mockAnimeList.filter((a) => a.isLatest || a.releaseYear >= 2024)
  );
  const [popularManga, setPopularManga] = useState<MediaItem[]>(() =>
    mockMangaList.slice(0, 6)
  );
  const [popularManhwa, setPopularManhwa] = useState<MediaItem[]>(() =>
    mockManhwaList.slice(0, 6)
  );
  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        const [trending, latest, manga, manhwa, news] = await Promise.all([
          fetchTrendingAnime(10).catch(() => mockAnimeList.filter((a) => a.isTrending)),
          fetchLatestAnime(6).catch(() => mockAnimeList.filter((a) => a.isLatest)),
          fetchPopularManga(6).catch(() => mockMangaList.slice(0, 6)),
          fetchPopularManhwa(6).catch(() => mockManhwaList.slice(0, 6)),
          fetchLatestNews(5).catch(() => []),
        ]);

        if (isMounted) {
          if (trending && trending.length > 0) setTrendingAnime(trending);
          if (latest && latest.length > 0) setLatestAnime(latest);
          if (manga && manga.length > 0) setPopularManga(manga);
          if (manhwa && manhwa.length > 0) setPopularManhwa(manhwa);
          if (news && news.length > 0) setNewsList(news);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredNews = newsList[0];
  const otherNews = newsList.slice(1, 4);

  const scrollTrending = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* 1. Hero Section */}
      <HeroSection featuredItems={trendingAnime.slice(0, 4)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-16 sm:space-y-20">
        {/* 2. Trending Anime */}
        <section id="trending-anime-section">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              title={`🔥 ${t('trendingAnime')}`}
              subtitle={t('trendingSubtitle')}
              viewAllLink="/anime?sort=trending"
            />

            {/* Scroll Navigation Arrows for Horizontal Layout */}
            <div className="hidden sm:flex items-center gap-1.5 pb-5">
              <button
                type="button"
                onClick={() => scrollTrending('left')}
                className="p-2 rounded-xl bg-[#131521] hover:bg-white/10 text-slate-300 hover:text-white border border-white/8 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollTrending('right')}
                className="p-2 rounded-xl bg-[#131521] hover:bg-white/10 text-slate-300 hover:text-white border border-white/8 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal responsive scrolling layout */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar scroll-smooth snap-x snap-mandatory"
          >
            {trendingAnime.map((anime) => (
              <div
                key={anime.id}
                className="min-w-[180px] sm:min-w-[220px] md:min-w-[240px] max-w-[240px] flex-shrink-0 snap-start"
              >
                <AnimeCard anime={anime} />
              </div>
            ))}
          </div>
        </section>

        {/* 3. Latest Anime */}
        <section id="latest-anime-section">
          <SectionHeader
            title={`🆕 ${t('latestAnime')}`}
            subtitle={t('latestAnimeSubtitle')}
            viewAllLink="/anime?sort=latest"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
            {latestAnime.slice(0, 6).map((anime) => (
              <AnimeCard key={anime.id} anime={anime} showGenres={false} />
            ))}
          </div>
        </section>

        {/* 4. Popular Manga */}
        <section id="popular-manga-section">
          <SectionHeader
            title={`📖 ${t('popularManga')}`}
            subtitle={t('popularMangaSubtitle')}
            viewAllLink="/manga"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
            {popularManga.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        </section>

        {/* 5. Popular Manhwa */}
        <section id="popular-manhwa-section">
          <SectionHeader
            title={`📚 ${t('popularManhwa')}`}
            subtitle={t('popularManhwaSubtitle')}
            viewAllLink="/manhwa"
          />

          {isLoading && popularManhwa.length === 0 ? (
            <CardGridSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
              {popularManhwa.map((manhwa) => (
                <ManhwaCard key={manhwa.id} manhwa={manhwa} />
              ))}
            </div>
          )}
        </section>

        {/* 6. Latest News */}
        <section id="latest-news-section">
          <SectionHeader
            title={`📰 ${t('latestNews')}`}
            subtitle={t('latestNewsSubtitle')}
            viewAllLink="/news"
          />

          {featuredNews && (
            <div className="mb-6">
              <NewsCard article={featuredNews} featured={true} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {otherNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
