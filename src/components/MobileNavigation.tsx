import React from 'react';
import { Home, Film, BookOpen, Sparkles, Search } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../context/LanguageContext';

export const MobileNavigation: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { t } = useLanguage();

  const items = [
    { label: t('navHome'), path: '/', icon: Home },
    { label: t('navAnime'), path: '/anime', icon: Film },
    { label: t('navManga'), path: '/manga', icon: BookOpen },
    { label: t('navManhwa'), path: '/manhwa', icon: Sparkles },
    { label: t('navSearch'), path: '/search', icon: Search },
  ];

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0d14]/95 backdrop-blur-lg border-t border-white/8 px-2 py-2 safe-area-bottom shadow-2xl shadow-black">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              id={`mobile-nav-${item.label.toLowerCase()}`}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 min-[360px]:px-2.5 sm:px-3 rounded-xl transition-all ${
                active ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
              {active && <span className="w-1 h-1 bg-rose-500 rounded-full mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
