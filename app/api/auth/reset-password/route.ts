import { NextRequest, NextResponse } from 'next/server';
import { deriveSupabaseUrl } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 });
    }

    const serverPub = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serverUrl = deriveSupabaseUrl(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      serverPub || process.env.SUPABASE_SECRET_KEY
    );

    if (serverUrl && serverPub && !serverPub.includes('placeholder')) {
      const client = createClient(serverUrl, serverPub);
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const { error } = await client.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Password reset link dispatched to ${trimmedEmail}. Please check your inbox.`,
      });
    }

    return NextResponse.json({
      success: true,
      sandbox: true,
      message: `Password reset dispatched to ${trimmedEmail} (simulated in sandbox mode).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server error processing password reset.' },
      { status: 500 }
    );
  }
}
