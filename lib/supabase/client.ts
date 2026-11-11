// ICE Supabase Browser Client Architecture
// Browser-safe client using public publishable / anon key for authentication and standard queries.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Extracts a Supabase project reference from modern keys (sb_publishable_<ref>_... / sbp_<ref>_...)
 * or from legacy JWT tokens containing { ref: string }.
 */
export function extractProjectRefFromKey(key?: string): string | null {
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();

  // Modern keys: sb_publishable_<ref>_..., sbp_<ref>_..., sb_secret_<ref>_..., sbs_<ref>_...
  const match = trimmed.match(/^sb(?:_publishable|_secret|p|s)_([a-zA-Z0-9]+)/);
  if (match && match[1] && match[1].length >= 10) {
    return match[1];
  }

  // Legacy JWT tokens: ey...
  if (trimmed.startsWith('ey') && trimmed.includes('.')) {
    try {
      const parts = trimmed.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = typeof window !== 'undefined'
          ? window.atob(base64)
          : Buffer.from(base64, 'base64').toString('utf-8');
        const payload = JSON.parse(jsonStr);
        if (payload.ref && typeof payload.ref === 'string') {
          return payload.ref;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Derives a valid Supabase project URL from explicit URL or key extraction.
 */
export function deriveSupabaseUrl(explicitUrl?: string, key?: string): string {
  if (explicitUrl && !explicitUrl.includes('placeholder') && !explicitUrl.includes('your-project-id')) {
    return explicitUrl.trim().replace(/\/+$/, '');
  }

  const extractedRef = extractProjectRefFromKey(key);
  if (extractedRef) {
    return `https://${extractedRef}.supabase.co`;
  }

  return '';
}

// Initial client-side env inspection
const rawEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

export const supabaseUrl = deriveSupabaseUrl(rawEnvUrl, supabasePublishableKey);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !supabasePublishableKey.includes('placeholder')
);

/**
 * Checks if a key follows modern Supabase publishable key format
 */
export function isModernPublishableKey(key: string): boolean {
  return typeof key === 'string' && (
    key.startsWith('sb_publishable_') ||
    key.startsWith('sbp_') ||
    key.startsWith('pk_')
  );
}

// In-memory cached browser client instance
let cachedBrowserClient: SupabaseClient | null = null;
let runtimeConfigOverride: { url: string; key: string } | null = null;

export function setRuntimeSupabaseConfig(url: string, key: string) {
  if (url && key) {
    runtimeConfigOverride = { url, key };
    cachedBrowserClient = null;
  }
}

/**
 * Creates or retrieves a browser-safe Supabase client.
 * Returns null if Supabase environment variables have not been configured.
 */
export function createBrowserClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const activeUrl = customUrl || runtimeConfigOverride?.url || supabaseUrl;
  const activeKey = customKey || runtimeConfigOverride?.key || supabasePublishableKey;

  if (!activeUrl || !activeKey || activeKey.includes('placeholder')) {
    return null;
  }

  if (cachedBrowserClient && !customUrl && !customKey) {
    return cachedBrowserClient;
  }

  try {
    const client = createClient(activeUrl, activeKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    if (!customUrl && !customKey) {
      cachedBrowserClient = client;
    }

    return client;
  } catch (err) {
    console.warn('[ICE Supabase] Client initialization warning:', err);
    return null;
  }
}
