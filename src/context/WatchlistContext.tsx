import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MediaItem, MediaType, SavedItemRow } from '../types';
import { getSafeCoverImage, getSafeBannerImage } from '../lib/mediaImage';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface WatchlistContextType {
  watchlistIds: string[];
  watchlistItems: MediaItem[];
  addToWatchlist: (item: MediaItem) => void;
  removeFromWatchlist: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  toggleWatchlist: (item: MediaItem) => void;
  activeTrailer: MediaItem | null;
  openTrailer: (item: MediaItem) => void;
  closeTrailer: () => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  showToast: (title: string, message: string) => void;
  isLoading: boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

// Helper to sanitize an item's cover and banner images
function sanitizeMediaItem(item: MediaItem): MediaItem {
  const safeCover = getSafeCoverImage(item.posterImage);
  const safeBanner = getSafeBannerImage(item.bannerImage, safeCover);
  return {
    ...item,
    posterImage: safeCover,
    bannerImage: safeBanner,
  };
}

/**
 * Reconstructs a full MediaItem from a public.saved_items database row.
 * Prefers media_snapshot if available, otherwise reconstructs from columns.
 */
function parseSavedItemRow(row: any): MediaItem {
  // 1. Prioritize restoring from complete media_snapshot
  if (row.media_snapshot && typeof row.media_snapshot === 'object' && row.media_snapshot.id) {
    return sanitizeMediaItem(row.media_snapshot as MediaItem);
  }

  // 2. Reconstruct from table columns
  const rawType = String(row.media_type || 'ANIME').toUpperCase();
  const validMediaType: MediaType = (['ANIME', 'MANGA', 'MANHWA'].includes(rawType)
    ? rawType
    : 'ANIME') as MediaType;

  const item: MediaItem = {
    id: String(row.media_id || row.id),
    title: String(row.title || 'Untitled'),
    englishTitle: row.english_title || undefined,
    type: validMediaType,
    format: row.format || (validMediaType === 'ANIME' ? 'TV' : 'Manga'),
    rating: typeof row.rating === 'number' ? row.rating : Number(row.rating) || 0,
    releaseYear: typeof row.release_year === 'number' ? row.release_year : new Date().getFullYear(),
    status: row.status || 'Completed',
    genres: Array.isArray(row.genres) ? row.genres : [],
    synopsis: row.synopsis || '',
    posterImage: row.poster_image || '',
    bannerImage: row.banner_image || row.poster_image || '',
    episodes: typeof row.episodes === 'number' ? row.episodes : undefined,
    chapters: typeof row.chapters === 'number' ? row.chapters : undefined,
    studioOrAuthor: row.studio_or_author || 'Unknown',
    sourceProvider: row.source_provider || undefined,
  };

  return sanitizeMediaItem(item);
}

/**
 * Maps a MediaItem into a public.saved_items database payload for Supabase.
 */
function mediaItemToSavedRow(item: MediaItem, userId: string): SavedItemRow {
  return {
    user_id: userId,
    media_id: String(item.id),
    media_type: item.type,
    title: item.title,
    english_title: item.englishTitle || null,
    poster_image: item.posterImage,
    banner_image: item.bannerImage || null,
    rating: typeof item.rating === 'number' ? item.rating : null,
    format: item.format || null,
    status: item.status || null,
    release_year: typeof item.releaseYear === 'number' ? item.releaseYear : null,
    genres: Array.isArray(item.genres) ? item.genres : [],
    episodes: typeof item.episodes === 'number' ? item.episodes : null,
    chapters: typeof item.chapters === 'number' ? item.chapters : null,
    studio_or_author: item.studioOrAuthor || null,
    source_provider: item.sourceProvider || null,
    media_snapshot: item,
  };
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState<MediaItem[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTrailer, setActiveTrailer] = useState<MediaItem | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastLoadedUserIdRef = useRef<string | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  // Load / Sync library items whenever user auth state changes or session is restored
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Logged-out user: clear library items so no user's private library is exposed
      lastLoadedUserIdRef.current = null;
      setWatchlistItems([]);
      setWatchlistIds([]);
      setIsLoading(false);
      return;
    }

    // Already loaded for this user session
    if (lastLoadedUserIdRef.current === user.id) return;
    lastLoadedUserIdRef.current = user.id;

    let isMounted = true;
    setIsLoading(true);

    // 1. Hydrate from user-specific local storage cache immediately for fast zero-latency render
    try {
      const cached = localStorage.getItem(`animehub_library_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map(sanitizeMediaItem);
          setWatchlistItems(sanitized);
          setWatchlistIds(sanitized.map((i) => i.id));
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch fresh saved items from Supabase public.saved_items
    async function loadUserSavedItems() {
      if (!isSupabaseConfigured || !user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        // Ensure user profile exists in public.profiles for relationship integrity
        supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email,
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'AnimeHub User',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .then(({ error: profileErr }) => {
            if (profileErr) {
              console.debug('[AnimeHub] Profile upsert notice:', profileErr.message);
            }
          });

        const { data, error } = await supabase
          .from('saved_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[AnimeHub Saved] Error loading saved items from Supabase:', error.message);
          return;
        }

        if (isMounted && data) {
          const items = data.map(parseSavedItemRow);
          // Deduplicate items by media id
          const seen = new Set<string>();
          const uniqueItems: MediaItem[] = [];
          for (const item of items) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              uniqueItems.push(item);
            }
          }

          setWatchlistItems(uniqueItems);
          setWatchlistIds(uniqueItems.map((i) => i.id));

          // Keep user-specific local cache in sync
          try {
            localStorage.setItem(`animehub_library_${user.id}`, JSON.stringify(uniqueItems));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('[AnimeHub Saved] Unexpected error fetching library:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUserSavedItems();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // Save an item to the user's library
  const addToWatchlist = useCallback(async (item: MediaItem) => {
    const sanitized = sanitizeMediaItem(item);

    if (!user) {
      // Guest state: Add to session memory and notify to sign in for persistence
      setWatchlistItems((prev) => {
        const filtered = prev.filter((i) => i.id !== sanitized.id);
        return [sanitized, ...filtered];
      });
      setWatchlistIds((prev) => (prev.includes(sanitized.id) ? prev : [sanitized.id, ...prev]));
      showToast('Added to List', `"${sanitized.title}" was added. Sign in to save to your cloud library.`);
      return;
    }

    // Optimistic UI state update
    setWatchlistItems((prev) => {
      const filtered = prev.filter((i) => i.id !== sanitized.id);
      const next = [sanitized, ...filtered];
      try {
        localStorage.setItem(`animehub_library_${user.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    setWatchlistIds((prev) => {
      if (prev.includes(sanitized.id)) return prev;
      return [sanitized.id, ...prev];
    });

    showToast('Saved to Library', `"${sanitized.title}" was saved to your library.`);

    // Persist to Supabase public.saved_items
    if (isSupabaseConfigured) {
      try {
        const row = mediaItemToSavedRow(sanitized, user.id);
        // Use onConflict on user_id,media_id to prevent duplicates cleanly
        const { error } = await supabase
          .from('saved_items')
          .upsert(row, { onConflict: 'user_id,media_id' });

        if (error) {
          console.warn('[AnimeHub Saved] Failed to upsert to saved_items:', error.message);
        }
      } catch (err) {
        console.warn('[AnimeHub Saved] Error saving to Supabase:', err);
      }
    }
  }, [user, showToast]);

  // Remove an item from the user's library
  const removeFromWatchlist = useCallback(async (id: string) => {
    // Optimistic UI state update
    setWatchlistIds((prev) => prev.filter((itemId) => itemId !== id));
    setWatchlistItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (user) {
        try {
          localStorage.setItem(`animehub_library_${user.id}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    showToast('Removed from Library', 'Item removed from your personal library.');

    // Remove from Supabase public.saved_items
    if (user && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', id);

        if (error) {
          console.warn('[AnimeHub Saved] Failed to remove from saved_items:', error.message);
        }
      } catch (err) {
        console.warn('[AnimeHub Saved] Error removing from Supabase:', err);
      }
    }
  }, [user, showToast]);

  const isInWatchlist = useCallback((id: string) => watchlistIds.includes(id), [watchlistIds]);

  const toggleWatchlist = useCallback((item: MediaItem) => {
    if (isInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist(item);
    }
  }, [isInWatchlist, removeFromWatchlist, addToWatchlist]);

  const openTrailer = useCallback((item: MediaItem) => setActiveTrailer(item), []);
  const closeTrailer = useCallback(() => setActiveTrailer(null), []);

  return (
    <WatchlistContext.Provider
      value={{
        watchlistIds,
        watchlistItems,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        toggleWatchlist,
        activeTrailer,
        openTrailer,
        closeTrailer,
        toasts,
        dismissToast,
        showToast,
        isLoading,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
