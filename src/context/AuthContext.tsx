import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  requiresEmailConfirmation: boolean;
  error: AuthError | Error | null;
}

export interface SignInResult {
  user: User | null;
  session: Session | null;
  error: AuthError | Error | null;
}

export interface SignOutResult {
  error: AuthError | Error | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<SignOutResult>;
  
  // Auth modal controls
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Auth modal management
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Retrieve initial active session
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn('[AnimeHub Auth] Initial getSession error:', error.message);
      }
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      if (!mounted) return;
      console.warn('[AnimeHub Auth] Unexpected getSession failure:', err);
      setLoading(false);
    });

    // 2. Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string): Promise<SignUpResult> => {
    if (!isSupabaseConfigured) {
      return {
        user: null,
        session: null,
        requiresEmailConfirmation: false,
        error: new Error('SUPABASE_NOT_CONFIGURED'),
      };
    }

    try {
      const cleanEmail = email.trim();
      const name = displayName?.trim() || cleanEmail.split('@')[0];

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: name,
            username: name,
          },
        },
      });

      if (error) {
        return {
          user: null,
          session: null,
          requiresEmailConfirmation: false,
          error,
        };
      }

      // If Supabase has email confirmation enabled, user is created but session is null
      const requiresEmailConfirmation = Boolean(data.user && !data.session);

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return {
        user: data.user,
        session: data.session,
        requiresEmailConfirmation,
        error: null,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        requiresEmailConfirmation: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    if (!isSupabaseConfigured) {
      return {
        user: null,
        session: null,
        error: new Error('SUPABASE_NOT_CONFIGURED'),
      };
    }

    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          error,
        };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  };

  const signOut = async (): Promise<SignOutResult> => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      return { error };
    } catch (err: any) {
      setUser(null);
      setSession(null);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      setAuthModalMode,
    }),
    [user, session, loading, isAuthModalOpen, authModalMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
