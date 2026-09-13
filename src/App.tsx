import React, { Suspense } from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { MobileNavigation } from './components/MobileNavigation';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { CardGridSkeleton } from './components/Skeletons';

import { HomePage } from './pages/HomePage';

// Route-based code-splitting: Lazy load non-homepage pages to shrink initial bundle
const AnimePage = React.lazy(() => import('./pages/AnimePage').then((m) => ({ default: m.AnimePage })));
const MangaPage = React.lazy(() => import('./pages/MangaPage').then((m) => ({ default: m.MangaPage })));
const ManhwaPage = React.lazy(() => import('./pages/ManhwaPage').then((m) => ({ default: m.ManhwaPage })));
const NewsPage = React.lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const SearchPage = React.lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const MediaDetailPage = React.lazy(() => import('./pages/MediaDetailPage').then((m) => ({ default: m.MediaDetailPage })));
const NewsDetailPage = React.lazy(() => import('./pages/NewsDetailPage').then((m) => ({ default: m.NewsDetailPage })));

// Lazy-load interactive modals only when needed
const TrailerModal = React.lazy(() => import('./components/TrailerModal').then((m) => ({ default: m.TrailerModal })));
const AuthModal = React.lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));

function RouteFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <CardGridSkeleton count={12} />
    </div>
  );
}

function AppRoutes() {
  const { currentPath } = useRouter();

  let routeContent: React.ReactNode;

  // Detail route matchers
  const animeMatch = currentPath.match(/^\/anime\/([a-zA-Z0-9_-]+)/);
  if (animeMatch) {
    routeContent = <MediaDetailPage mediaId={animeMatch[1]} expectedType="ANIME" />;
  } else {
    const mangaMatch = currentPath.match(/^\/manga\/([a-zA-Z0-9_-]+)/);
    if (mangaMatch) {
      routeContent = <MediaDetailPage mediaId={mangaMatch[1]} expectedType="MANGA" />;
    } else {
      const manhwaMatch = currentPath.match(/^\/manhwa\/([a-zA-Z0-9_-]+)/);
      if (manhwaMatch) {
        routeContent = <MediaDetailPage mediaId={manhwaMatch[1]} expectedType="MANHWA" />;
      } else {
        const newsMatch = currentPath.match(/^\/news\/([^/?#]+)/);
        if (newsMatch && newsMatch[1]) {
          routeContent = <NewsDetailPage articleId={decodeURIComponent(newsMatch[1])} />;
        } else if (currentPath.startsWith('/anime')) {
          routeContent = <AnimePage />;
        } else if (currentPath.startsWith('/manga')) {
          routeContent = <MangaPage />;
        } else if (currentPath.startsWith('/manhwa')) {
          routeContent = <ManhwaPage />;
        } else if (currentPath.startsWith('/news')) {
          routeContent = <NewsPage />;
        } else if (currentPath.startsWith('/search')) {
          routeContent = <SearchPage />;
        } else {
          // Default / Home
          return <HomePage />;
        }
      }
    }
  }

  return <Suspense fallback={<RouteFallback />}>{routeContent}</Suspense>;
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
              <Suspense fallback={null}>
                <TrailerModal />
                <AuthModal />
              </Suspense>
              <ToastContainer />
            </div>
          </WatchlistProvider>
        </AuthProvider>
      </LanguageProvider>
    </RouterProvider>
  );
}
