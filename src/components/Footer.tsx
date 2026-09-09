import React, { useState } from 'react';
import { Play, Send } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { navigate } = useRouter();
  const { showToast } = useWatchlist();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      showToast(t('footerSubscribed'), t('footerDigestNotice'));
      setEmail('');
    }
  };

  return (
    <footer className="w-full bg-[#07080c] border-t border-white/8 pt-12 pb-20 md:pb-12 mt-20 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 pb-12 border-b border-white/6">
          {/* Brand & Mission */}
          <div className="lg:col-span-2">
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 cursor-pointer mb-4 w-fit"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-600/30">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-display">
                Anime<span className="text-rose-500">Hub</span>
              </span>
            </div>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-5">
              {t('footerDesc')}
            </p>

            {/* Newsletter mock form */}
            <form onSubmit={handleSubscribe} className="flex max-w-md gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footerSubscribePlaceholder')}
                className="flex-1 min-w-0 px-3.5 py-2.5 text-xs bg-[#131520] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>{t('footerJoin')}</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              {t('footerExplore')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="hover:text-rose-400 transition-colors"
                >
                  {t('navHome')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/anime')}
                  className="hover:text-rose-400 transition-colors"
                >
                  {t('navAnime')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/manga')}
                  className="hover:text-rose-400 transition-colors"
                >
                  {t('navManga')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/manhwa')}
                  className="hover:text-rose-400 transition-colors"
                >
                  {t('navManhwa')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/news')}
                  className="hover:text-rose-400 transition-colors"
                >
                  {t('navNews')}
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Legal Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              {t('footerInfo')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/search?tab=library')}
                  className="hover:text-rose-400 transition-colors"
                >
                  {t('myLibrary')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/news')}
                  className="hover:text-rose-400 transition-colors"
                >
                  {t('latestNews')}
                </button>
              </li>
              <li>
                <span className="hover:text-rose-400 cursor-pointer transition-colors">
                  {t('footerAbout')}
                </span>
              </li>
              <li>
                <span className="hover:text-rose-400 cursor-pointer transition-colors">
                  {t('footerContact')}
                </span>
              </li>
            </ul>
          </div>

          {/* Legal / Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              {t('footerLegal')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="hover:text-rose-400 cursor-pointer transition-colors">
                  {t('footerPrivacy')}
                </span>
              </li>
              <li>
                <span className="hover:text-rose-400 cursor-pointer transition-colors">
                  {t('footerTerms')}
                </span>
              </li>
              <li>
                <span className="hover:text-rose-400 cursor-pointer transition-colors">
                  {t('footerDmca')}
                </span>
              </li>
              <li>
                <span className="hover:text-rose-400 cursor-pointer transition-colors">
                  API & Community
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} AnimeHub. {t('footerRights')}</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Anime • Manga • Manhwa</span>
            <span>•</span>
            <span className="text-slate-400">Jikan API & AniList Grounded</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
