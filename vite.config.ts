import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

function formatSupabaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'SUPABASE_', 'APP_']);
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || env.SUPABASE_URL;
  const supabaseUrl = formatSupabaseUrl(rawSupabaseUrl);
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  const rawAppUrl =
    process.env.APP_URL ||
    env.APP_URL ||
    process.env.VITE_APP_URL ||
    env.VITE_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const appUrl = rawAppUrl
    ? (rawAppUrl.startsWith('http') ? rawAppUrl.trim().replace(/\/+$/, '') : `https://${rawAppUrl.trim().replace(/\/+$/, '')}`)
    : '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-seo-transform',
        transformIndexHtml(html) {
          const canonicalHref = appUrl ? `${appUrl}/` : '/';
          const ogImageUrl = appUrl ? `${appUrl}/og-image.svg` : '/og-image.svg';
          return html
            .replace(/__APP_CANONICAL_URL__/g, canonicalHref)
            .replace(/__APP_OG_IMAGE__/g, ogImageUrl);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    envPrefix: ['VITE_', 'SUPABASE_', 'APP_'],
    define: {
      ...(supabaseUrl ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl) } : {}),
      ...(supabaseAnonKey ? { 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey) } : {}),
      ...(appUrl ? { 'import.meta.env.VITE_APP_URL': JSON.stringify(appUrl) } : {}),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/@supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
