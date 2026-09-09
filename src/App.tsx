import React from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { MobileNavigation } from './components/MobileNavigation';
import { Footer } from './components/Footer';
import { TrailerModal } from './components/TrailerModal';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/ToastContainer';

import { HomePage } from './pages/HomePage';
import { AnimePage } from './pages/AnimePage';
import { MangaPage } from './pages/MangaPage';
import { ManhwaPage } from './pages/ManhwaPage';
import { NewsPage } from './pages/NewsPage';
import { SearchPage } from './pages/SearchPage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { NewsDetailPage } from './pages/NewsDetailPage';

function AppRoutes() {
  const { currentPath } = useRouter();

  // Detail route matchers
  const animeMatch = currentPath.match(/^\/anime\/([a-zA-Z0-9_-]+)/);
  if (animeMatch) {
    return <MediaDetailPage mediaId={animeMatch[1]} expectedType="ANIME" />;
  }

  const mangaMatch = currentPath.match(/^\/manga\/([a-zA-Z0-9_-]+)/);
  if (mangaMatch) {
    return <MediaDetailPage mediaId={mangaMatch[1]} expectedType="MANGA" />;
  }

  const manhwaMatch = currentPath.match(/^\/manhwa\/([a-zA-Z0-9_-]+)/);
  if (manhwaMatch) {
    return <MediaDetailPage mediaId={manhwaMatch[1]} expectedType="MANHWA" />;
  }

  const newsMatch = currentPath.match(/^\/news\/([^/?#]+)/);
  if (newsMatch && newsMatch[1]) {
    return <NewsDetailPage articleId={decodeURIComponent(newsMatch[1])} />;
  }

  // Exact & Prefix Main Routes
  if (currentPath.startsWith('/anime')) {
    return <AnimePage />;
  }
  if (currentPath.startsWith('/manga')) {
    return <MangaPage />;
  }
  if (currentPath.startsWith('/manhwa')) {
    return <ManhwaPage />;
  }
  if (currentPath.startsWith('/news')) {
    return <NewsPage />;
  }
  if (currentPath.startsWith('/search')) {
    return <SearchPage />;
  }

  // Default / Home
  return <HomePage />;
}

export default function App() {
  return (
    <RouterProvider>
      <LanguageProvider>
        <AuthProvider>
          <WatchlistProvider>
            <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
              <Navbar />
              <main className="flex-1 w-full">
                <AppRoutes />
              </main>
              <Footer />
              <MobileNavigation />
              <TrailerModal />
              <AuthModal />
              <ToastContainer />
            </div>
          </WatchlistProvider>
        </AuthProvider>
      </LanguageProvider>
    </RouterProvider>
  );
}
