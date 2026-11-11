// ICE Supabase Server Client Architecture
// Server-side scoped client for Next.js App Router API routes and server components.

import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabasePublishableKey = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  '';

/**
 * Creates a server-side Supabase client for authenticated user requests.
 * Passes the user's JWT authorization header to enforce PostgreSQL RLS policies.
 */
export function createServerClient(accessToken?: string, tenantId?: string) {
  if (!isSupabaseConfigured) {
    return null;
  }

  const globalHeaders: Record<string, string> = {};
  if (accessToken) {
    globalHeaders['Authorization'] = `Bearer ${accessToken}`;
  }
  if (tenantId) {
    globalHeaders['x-ice-tenant-id'] = tenantId;
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: globalHeaders,
    },
  });
}
