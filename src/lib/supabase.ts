import { createClient, User, Session, AuthError } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || (import.meta.env as any).SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta.env as any).SUPABASE_ANON_KEY || '').trim();

function formatSupabaseUrl(url: string): string {
  if (!url) return '';
  const clean = url.trim().replace(/\/+$/, '');
  const withoutProtocol = clean.replace(/^https?:\/\//, '');
  if (!withoutProtocol.includes('.')) {
    return `https://${withoutProtocol}.supabase.co`;
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return `https://${clean}`;
  }
  return clean;
}

// Format URL if protocol or domain is omitted
const supabaseUrl = formatSupabaseUrl(rawUrl);
const supabaseAnonKey = rawAnonKey;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

// Fallback dummy URL to prevent createClient from crashing if env vars are not set during preview
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export type { User, Session, AuthError };
