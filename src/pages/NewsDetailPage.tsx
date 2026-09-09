import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, Share2, Tag, ChevronRight, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchNewsArticleById, fetchNewsByCategory, fetchLatestNews } from '../lib/api';
import { NewsArticle } from '../types';
import { getNewsArticleImage, ANIMEHUB_NEWS_FALLBACK_IMAGE } from '../lib/newsImage';

interface NewsDetailPageProps {
  articleId: string;
}

export const NewsDetailPage: React.FC<NewsDetailPageProps> = ({ articleId }) => {
  const { navigate, goBack } = useRouter();
  const { showToast } = useWatchlist();
  const { t, language } = useLanguage();

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setImgError(false);

    async function loadArticleData() {
      try {
        const item = await fetchNewsArticleById(articleId);
        if (!isMounted) return;

        if (item) {
          setArticle(item);

          // Fetch related articles from same category or latest
          try {
            let related = await fetchNewsByCategory(item.category, 5);
            related = related.filter((r) => r.id !== item.id);
            if (related.length < 3) {
              const latest = await fetchLatestNews(5);
              const extra = latest.filter((l) => l.id !== item.id && !related.some((r) => r.id === l.id));
              related = [...related, ...extra];
            }
            if (isMounted) {
              setRelatedArticles(related.slice(0, 3));
            }
          } catch {
            if (isMounted) setRelatedArticles([]);
          }
        } else {
          setArticle(null);
        }
      } catch {
        if (isMounted) setArticle(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadArticleData();

    return () => {
      isMounted = false;
    };
  }, [articleId]);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast(t('linkCopied'), 'Story link copied to clipboard.');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ---------------- LOADING SKELETON ----------------
  if (isLoading) {
    return (
      <div className="pt-24 pb-20 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-4 w-28 bg-white/10 rounded mb-6 animate-pulse" />
          
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 w-20 bg-rose-600/20 rounded-md animate-pulse" />
            <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
          </div>

          <div className="h-10 w-3/4 bg-white/10 rounded-xl mb-3 animate-pulse" />
          <div className="h-8 w-1/2 bg-white/10 rounded-xl mb-6 animate-pulse" />

          <div className="py-4 border-y border-white/8 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-20 bg-white/10 rounded-xl animate-pulse" />
          </div>

          <div className="aspect-[16/9] w-full rounded-2xl bg-white/5 border border-white/10 mb-8 animate-pulse" />

          <div className="space-y-4">
            <div className="h-20 w-full bg-white/5 rounded-xl animate-pulse" />
            <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ---------------- EMPTY / NOT FOUND STATE ----------------
  if (!article) {
    return (
      <div className="pt-24 pb-20 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/news')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('backToNews')}</span>
          </button>

          <div className="bg-[#121420] border border-white/8 rounded-2xl p-12 text-center max-w-xl mx-auto">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Newspaper className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-display">
              {t('emptyStateTitle')}
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t('emptyStateDesc')}
            </p>
            <button
              onClick={() => navigate('/news')}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-rose-900/30"
            >
              {t('backToNews')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const coverSrc = imgError ? ANIMEHUB_NEWS_FALLBACK_IMAGE : getNewsArticleImage(article);
  const sourceName = article.sourceName || article.source || 'Crunchyroll News';
  const sourceUrl = article.sourceUrl || 'https://crunchyroll.com/news';

  return (
    <div className="pt-24 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToNews')}</span>
        </button>

        {/* Category & Date */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-600/20 text-rose-400 border border-rose-500/30">
            {article.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('published')}:</span>
            <span className="text-slate-300">{formatDate(article.publishedAt)}</span>
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-400">{article.readTime}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-display mb-6">
          {article.title}
        </h1>

        {/* Author Byline & Source Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-white/8 mb-8">
          <div className="flex items-center gap-3">
            {article.author.avatar ? (
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-white">{article.author.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{t('source')}:</span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-400 hover:text-rose-300 underline underline-offset-2 inline-flex items-center gap-1 font-medium"
                >
                  {sourceName}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
            >
              <span>{t('source')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/8 text-xs font-semibold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('share')}</span>
            </button>
          </div>
        </div>

        {/* Cover Image */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10 mb-8 shadow-2xl">
          <img
            src={coverSrc}
            alt={article.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Summary / Body */}
        <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-5 text-sm sm:text-base font-normal">
          {(article.summary || article.excerpt) && (
            <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/8">
              {article.summary || article.excerpt}
            </p>
          )}

          {article.content ? (
            article.content.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))
          ) : (
            <p>{article.summary || article.excerpt}</p>
          )}
        </div>

        {/* Original Article Citation Notice */}
        <div className="mt-8 p-4 rounded-xl bg-[#11131c] border border-white/8 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200">{t('source')}: </span>
            <span>{sourceName} — </span>
            <span className="text-slate-400">Content indexed from official media dispatch.</span>
          </div>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold"
          >
            <span>Read full original story</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-8 mt-10 border-t border-white/8">
            <Tag className="w-4 h-4 text-slate-400 mr-1" />
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-md text-xs bg-white/5 text-slate-300 border border-white/8"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-14 pt-10 border-t border-white/8">
            <h3 className="text-xl font-bold text-white font-display mb-6">
              {t('relatedTitles')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedArticles.map((rel) => {
                const relImg = getNewsArticleImage(rel);
                return (
                  <div
                    key={rel.id}
                    onClick={() => {
                      navigate(`/news/${rel.id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group cursor-pointer bg-[#121420] border border-white/6 hover:border-white/15 rounded-xl overflow-hidden p-3 transition-colors"
                  >
                    <img
                      src={relImg}
                      alt={rel.title}
                      className="aspect-[16/9] w-full object-cover rounded-lg mb-2"
                    />
                    <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
                      {rel.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-rose-400 line-clamp-2 mt-1">
                      {rel.title}
                    </h4>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

