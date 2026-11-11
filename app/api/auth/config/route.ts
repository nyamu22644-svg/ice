import { NextResponse } from 'next/server';
import { supabaseUrl, supabasePublishableKey, isModernPublishableKey, deriveSupabaseUrl } from '@/lib/supabase/client';
import { isSupabaseAdminConfigured, isModernSecretKey, supabaseSecretKey } from '@/lib/supabase/admin';

export async function GET() {
  const serverPub = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serverUrl = deriveSupabaseUrl(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    serverPub || supabaseSecretKey
  );

  const isConfigured = Boolean(serverUrl && serverPub && !serverPub.includes('placeholder'));

  return NextResponse.json({
    configured: isConfigured,
    supabaseUrl: serverUrl || null,
    publishableKey: isConfigured ? serverPub : null,
    isModernPublishable: isModernPublishableKey(serverPub),
    hasAdminSecret: isSupabaseAdminConfigured,
    isModernSecret: isModernSecretKey(supabaseSecretKey),
    status: isConfigured
      ? (isSupabaseAdminConfigured ? 'DATABASE_CONNECTED_WITH_ADMIN' : 'DATABASE_CONNECTED_CLIENT_ONLY')
      : 'SANDBOX_DEMO_MODE',
  });
}
