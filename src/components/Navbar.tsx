import React, { useState, useEffect } from 'react';
import { Search, User, Menu, X, Play, Bookmark, Bell, Compass, Flame, LogOut, LogIn } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { SearchBar } from './SearchBar';

export const Navbar: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { watchlistIds } = useWatchlist();
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut, openAuthModal } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const userDisplayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    (user?.email ? user.email.split('@')[0] : null);

  const userInitials = userDisplayName
    ? userDisplayName.slice(0, 2).toUpperCase()
    : 'AH';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut Ctrl+K or / to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { label: t('navHome'), path: '/' },
    { label: t('navAnime'), path: '/anime' },
    { label: t('navManga'), path: '/manga' },
    { label: t('navManhwa'), path: '/manhwa' },
    { label: t('navNews'), path: '/news' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#090a0f]/90 backdrop-blur-md border-b border-white/8 py-2 min-[360px]:py-2.5 sm:py-3 shadow-lg shadow-black/40'
            : 'bg-gradient-to-b from-[#090a0f]/95 to-transparent py-2.5 min-[360px]:py-3 sm:py-4 md:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 min-[360px]:px-2.5 min-[390px]:px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4 w-full">
          {/* Left: Logo and Brand */}
          <div className="flex items-center gap-3 sm:gap-8 flex-shrink-0 min-w-0">
            <button
              id="brand-logo-btn"
              type="button"
              onClick={() => navigate('/')}
              className="group flex items-center gap-1.5 min-[360px]:gap-2 sm:gap-2.5 text-left focus:outline-none flex-shrink-0"
            >
              <div className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform flex-shrink-0">
                <Play className="w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 sm:w-4 sm:h-4 fill-white ml-0.5" />
              </div>
              <div className="flex items-center">
                <span className="text-base min-[360px]:text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white font-display whitespace-nowrap">
                  Anime<span className="text-rose-500">Hub</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">
                  Discovery
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <button
                    key={link.path}
                    id={`nav-link-${link.label.toLowerCase()}`}
                    type="button"
                    onClick={() => navigate(link.path)}
                    className={`relative px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      active
                        ? 'text-white bg-white/10'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-rose-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Watchlist, Profile */}
          <div className="flex items-center gap-1 min-[360px]:gap-1.5 min-[390px]:gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick Search trigger button */}
            <button
              id="nav-search-button"
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2.5 p-1.5 min-[360px]:p-2 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/8 transition-all text-sm group flex-shrink-0"
              title="Search titles (Ctrl+K)"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
              <span className="hidden lg:inline text-xs text-slate-400">Search Anime, Manga...</span>
              <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 bg-white/10 text-slate-400 rounded border border-white/10">
                ⌘K
              </kbd>
            </button>

            {/* Language Selector */}
            <div
              id="language-switcher"
              className="flex items-center bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-0.5 text-[10px] min-[360px]:text-xs font-bold flex-shrink-0"
            >
              <button
                id="lang-btn-en"
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-1.5 min-[360px]:px-2 py-0.5 min-[360px]:py-1 rounded-md sm:rounded-lg transition-all leading-none ${
                  language === 'en'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                id="lang-btn-ru"
                type="button"
                onClick={() => setLanguage('ru')}
                className={`px-1.5 min-[360px]:px-2 py-0.5 min-[360px]:py-1 rounded-md sm:rounded-lg transition-all leading-none ${
                  language === 'ru'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Переключить на русский"
              >
                RU
              </button>
            </div>

            {/* Watchlist Counter */}
            <button
              id="nav-watchlist-button"
              type="button"
              onClick={() => navigate('/search?tab=library')}
              className="relative flex items-center justify-center p-1.5 min-[360px]:p-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/8 transition-colors flex-shrink-0"
              title={t('navLibrary')}
              aria-label={t('navLibrary')}
            >
              <Bookmark className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 text-slate-300" />
              {watchlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 min-[360px]:min-w-[16px] min-[360px]:h-4 px-0.5 bg-rose-500 text-white text-[9px] min-[360px]:text-[10px] font-bold rounded-full flex items-center justify-center">
                  {watchlistIds.length}
                </span>
              )}
            </button>

            {/* Profile / Auth Button */}
            <div className="relative flex-shrink-0">
              {user ? (
                <button
                  id="nav-profile-button"
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 min-[360px]:p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-slate-200 transition-colors"
                  title={userDisplayName || t('authAccount')}
                  aria-label="Profile menu"
                >
                  <div className="w-6 h-6 min-[360px]:w-6.5 min-[360px]:h-6.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white text-[10px] min-[360px]:text-xs font-bold flex-shrink-0">
                    {userInitials}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[90px] truncate">
                    {userDisplayName}
                  </span>
                </button>
              ) : (
                <button
                  id="nav-login-button"
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 min-[360px]:p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-slate-200 transition-colors"
                  title={t('authSignIn')}
                  aria-label={t('authSignIn')}
                >
                  <div className="w-6 h-6 min-[360px]:w-6.5 min-[360px]:h-6.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white/10 flex items-center justify-center text-slate-300 text-[10px] min-[360px]:text-xs font-bold flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-200">
                    {t('authSignIn')}
                  </span>
                </button>
              )}

              {/* Profile Popover Menu (when logged in) */}
              {isProfileOpen && user && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-[#131522] border border-white/10 rounded-xl p-3 shadow-2xl z-50 animate-fadeIn">
                  <div className="p-2 border-b border-white/8 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {userInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {userDisplayName || 'AnimeHub User'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user.email}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                        {t('authUserId')}: {user.id.slice(0, 10)}...
                      </p>
                    </div>
                  </div>
                  <div className="py-2 space-y-1">
                    <div className="px-2 py-1.5 text-xs text-slate-300 flex items-center justify-between">
                      <span>{t('navSavedCount')}</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold text-[10px]">
                        {watchlistIds.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/search');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-white/5 text-slate-200 transition-colors"
                    >
                      {t('navSearch')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/news');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-white/5 text-slate-200 transition-colors"
                    >
                      {t('navNews')}
                    </button>
                  </div>
                  <div className="pt-2 border-t border-white/8">
                    <button
                      id="profile-logout-btn"
                      type="button"
                      onClick={async () => {
                        setIsProfileOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{t('authSignOut')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger toggle */}
            <button
              id="mobile-hamburger-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden flex items-center justify-center p-1.5 min-[360px]:p-2 rounded-lg sm:rounded-xl bg-white/5 text-slate-300 hover:text-white border border-white/8 transition-colors flex-shrink-0"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 min-[360px]:w-5 min-[360px]:h-5" />
              ) : (
                <Menu className="w-4 h-4 min-[360px]:w-5 min-[360px]:h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#0e1019] border-b border-white/10 px-4 py-4 space-y-2 animate-fadeIn">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => {
                    navigate(link.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                navigate('/search?tab=library');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-slate-300 hover:bg-white/5"
            >
              <span>{t('navLibrary')}</span>
              {watchlistIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
                  {watchlistIds.length}
                </span>
              )}
            </button>

            {/* Mobile Auth Actions */}
            <div className="pt-2 mt-2 border-t border-white/10">
              {user ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {userInitials}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="text-xs font-semibold text-white truncate">
                        {userDisplayName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMobileMenuOpen(false);
                      await signOut();
                    }}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                    title={t('authSignOut')}
                    aria-label={t('authSignOut')}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold text-center transition-colors"
                  >
                    {t('authSignIn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuthModal('register');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold text-center shadow-sm transition-all"
                  >
                    {t('authRegister')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </header>

      {/* Global Search Modal */}
      <SearchBar
        isOpen={isSearchModalOpen}
        variant="modal"
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};
