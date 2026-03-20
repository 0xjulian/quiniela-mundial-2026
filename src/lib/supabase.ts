import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    '';
  const effectiveUrl = url || 'https://placeholder.supabase.co';
  const effectiveKey = key || 'placeholder';
  if (typeof window !== 'undefined' && (effectiveUrl.includes('placeholder') || effectiveKey === 'placeholder')) {
    console.warn(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidos. Crea .env.local con esos valores (ver .env.local.example).'
    );
  }
  return createSupabaseClient(effectiveUrl, effectiveKey);
}
