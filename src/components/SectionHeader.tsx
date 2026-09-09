import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../context/LanguageContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  onViewAll?: () => void;
  badge?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  viewAllLink,
  onViewAll,
  badge,
}) => {
  const { navigate } = useRouter();
  const { t } = useLanguage();

  const handleAction = () => {
    if (onViewAll) {
      onViewAll();
    } else if (viewAllLink) {
      navigate(viewAllLink);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-2">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
            {title}
          </h2>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {(viewAllLink || onViewAll) && (
        <button
          id={`view-all-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          onClick={handleAction}
          className="group inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-300 hover:text-rose-400 transition-colors w-fit pt-1 sm:pt-0"
        >
          <span>{t('viewAll')}</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  );
};
