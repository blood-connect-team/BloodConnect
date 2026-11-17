import { createClient } from '@supabase/supabase-js';

// Public configuration only: the URL and the PUBLISHABLE (anon) key are meant to be in the
// browser bundle. Security comes from Row Level Security in the database (supabase/migrations).
// Never put a service_role / secret key here.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !String(anonKey).startsWith('your_'));

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (see .env.example).');
}

// A placeholder URL keeps the app rendering (with clear errors) when configuration is missing.
export const supabase = createClient(url || 'http://localhost:55321', anonKey || 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
