import React, { useState } from 'react';
import { Clock, User, ExternalLink } from 'lucide-react';
import { NewsArticle } from '../types';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../context/LanguageContext';
import { getNewsArticleImage, ANIMEHUB_NEWS_FALLBACK_IMAGE } from '../lib/newsImage';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article, featured = false }) => {
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const articleImg = imgError ? ANIMEHUB_NEWS_FALLBACK_IMAGE : getNewsArticleImage(article);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Anime':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'Manga':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'Manhwa':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Industry':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Announcements':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const sourceName = article.sourceName || 'Anime News Network';
  const sourceUrl = article.sourceUrl || 'https://animenewsnetwork.com';
  const summaryText = article.summary || article.excerpt;

  if (featured) {
    return (
      <div
        id={`news-featured-${article.id}`}
        onClick={() => navigate(`/news/${article.id}`)}
        className="group relative grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#13151f] hover:bg-[#181b28] border border-white/8 hover:border-white/15 rounded-2xl p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/50"
      >
        <div className="md:col-span-7 relative aspect-[16/9] md:aspect-[16/10] overflow-hidden rounded-xl bg-slate-900">
          <img
            src={articleImg}
            alt={article.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border backdrop-blur-md ${getCategoryBadgeClass(
                article.category
              )}`}
            >
              {article.category}
            </span>
          </div>
        </div>

        <div className="md:col-span-5 flex flex-col justify-between py-1">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('published')}:</span>
                <span className="text-slate-300">{article.publishedAt}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>{t('source')}:</span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-rose-400 hover:text-rose-300 underline underline-offset-2 flex items-center gap-0.5"
                >
                  {sourceName}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-rose-400 transition-colors leading-snug line-clamp-3">
              {article.title}
            </h3>

            <p className="text-sm text-slate-400 mt-3 line-clamp-3 leading-relaxed">
              {summaryText}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/6">
            <div className="flex items-center gap-2">
              {article.author.avatar ? (
                <img
                  src={article.author.avatar}
                  alt={article.author.name}
                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-200">{article.author.name}</p>
                <p className="text-[11px] text-slate-400">{article.author.role}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-rose-400 group-hover:translate-x-1 transition-transform">
              {t('readStory')} →
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`news-card-${article.id}`}
      onClick={() => navigate(`/news/${article.id}`)}
      className="group flex flex-col bg-[#13151f] hover:bg-[#181b28] border border-white/6 hover:border-white/15 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-1"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
        <img
          src={articleImg}
          alt={article.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded border backdrop-blur-md ${getCategoryBadgeClass(
              article.category
            )}`}
          >
            {article.category}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{t('published')}:</span>
              <span className="text-slate-300">{article.publishedAt}</span>
            </span>
            <span>•</span>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-rose-400 hover:text-rose-300 truncate max-w-[120px] flex items-center gap-0.5"
              title={`${t('source')}: ${sourceName}`}
            >
              <span>{sourceName}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          </div>

          <h3 className="font-semibold text-sm sm:text-base text-white group-hover:text-rose-400 transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h3>

          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {summaryText}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-300 truncate max-w-[130px]">
              {article.author.name}
            </span>
          </div>
          <span className="text-xs text-rose-400 font-medium group-hover:translate-x-0.5 transition-transform">
            {t('readStory')} →
          </span>
        </div>
      </div>
    </div>
  );
};

