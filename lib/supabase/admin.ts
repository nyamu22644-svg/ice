// ICE Supabase Privileged Admin Client Architecture
// STRICTLY SERVER-SIDE ONLY. Uses secret / service-role key for background workers,
// system migrations, administrative auth operations, and platform tasks.
// NEVER exposed to browser bundles.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { deriveSupabaseUrl, extractProjectRefFromKey } from './client';

const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

export const adminSupabaseUrl = deriveSupabaseUrl(rawUrl, supabaseSecretKey);

export const isSupabaseAdminConfigured = Boolean(
  adminSupabaseUrl &&
  supabaseSecretKey &&
  !supabaseSecretKey.includes('placeholder')
);

/**
 * Checks if a key follows the modern Supabase secret key format
 */
export function isModernSecretKey(key: string): boolean {
  return typeof key === 'string' && (
    key.startsWith('sb_secret_') ||
    key.startsWith('sbs_') ||
    key.startsWith('sk_')
  );
}

let cachedAdminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient | null {
  // Guard against browser execution
  if (typeof window !== 'undefined') {
    throw new Error('[ICE Security Breach] Supabase Admin Client cannot be initialized in browser context.');
  }

  if (!isSupabaseAdminConfigured) {
    return null;
  }

  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  try {
    cachedAdminClient = createClient(adminSupabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return cachedAdminClient;
  } catch (err) {
    console.error('[ICE Supabase Admin] Initialization error:', err);
    return null;
  }
}
