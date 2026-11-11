import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { deriveSupabaseUrl, supabasePublishableKey } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/store/synthetic-db';
import { unifiedAuth, SEEDED_UNIFIED_USERS } from '@/lib/auth/unified-auth';
import { OrganizationRole } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid business email address.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required to sign in.' },
        { status: 400 }
      );
    }

    // Resolve Supabase endpoint
    const serverPub = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serverUrl = deriveSupabaseUrl(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      serverPub || process.env.SUPABASE_SECRET_KEY
    );

    const isDatabaseConfigured = Boolean(serverUrl && serverPub && !serverPub.includes('placeholder'));

    // =========================================================================
    // SCENARIO 1: SUPABASE CONNECTED VIA AUTH API
    // =========================================================================
    if (isDatabaseConfigured) {
      const client = createClient(serverUrl, serverPub);
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        let userFriendlyMsg = authError.message;
        if (msg.includes('invalid login credentials')) {
          userFriendlyMsg = 'Invalid email or password. Please check your credentials and try again.';
        } else if (msg.includes('email not confirmed')) {
          userFriendlyMsg = 'Your email has not been confirmed yet. Please verify your inbox, or disable email confirmations in your Supabase project settings.';
        }
        return NextResponse.json({ success: false, error: userFriendlyMsg }, { status: 401 });
      }

      const authUser = authData.user;
      if (!authUser) {
        return NextResponse.json({ success: false, error: 'Failed to retrieve user session profile.' }, { status: 500 });
      }

      let organizationId = authUser.app_metadata?.organization_id;
      let organizationName = authUser.user_metadata?.company_name || 'My Organization';
      let role: OrganizationRole = (authUser.app_metadata?.role as OrganizationRole) || 'ORGANIZATION_OWNER';
      let organization: any = null;

      // Query database if admin is configured
      if (isSupabaseAdminConfigured) {
        const admin = createAdminClient();
        if (admin) {
          const { data: userRec } = await admin
            .from('users')
            .select('organization_id, role, name, organizations(*)')
            .eq('id', authUser.id)
            .maybeSingle();

          if (userRec && userRec.organizations) {
            organization = Array.isArray(userRec.organizations) ? userRec.organizations[0] : userRec.organizations;
            organizationId = organization.id;
            organizationName = organization.name;
            role = (userRec.role as OrganizationRole) || role;
          } else {
            // Auto-provision if user exists in auth.users but has no tenant mapping yet
            const compName = authUser.user_metadata?.company_name || trimmedEmail.split('@')[1]?.split('.')[0] || 'My Organization';
            const formattedName = compName.charAt(0).toUpperCase() + compName.slice(1);
            const slug = compName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            const { data: newOrg } = await admin
              .from('organizations')
              .insert({
                name: formattedName,
                slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
                tier: 'STARTER',
                environment: 'SANDBOX',
              })
              .select()
              .single();

            if (newOrg) {
              organization = newOrg;
              organizationId = newOrg.id;
              organizationName = newOrg.name;

              await admin.from('users').upsert({
                id: authUser.id,
                organization_id: newOrg.id,
                email: trimmedEmail,
                name: authUser.user_metadata?.full_name || trimmedEmail.split('@')[0],
                role: 'ORGANIZATION_OWNER',
                is_active: true,
              });

              await admin.auth.admin.updateUserById(authUser.id, {
                app_metadata: { organization_id: newOrg.id, role: 'ORGANIZATION_OWNER' },
              });
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        session: authData.session,
        message: `Welcome back! Signed in as ${trimmedEmail}.`,
        user: {
          id: authUser.id,
          email: trimmedEmail,
          fullName: authUser.user_metadata?.full_name || trimmedEmail.split('@')[0],
          organizationId: organizationId || 'org_apex_fin',
          organizationName,
          role,
        },
        organization: organization || { id: organizationId || 'org_apex_fin', name: organizationName },
      });
    }

    // =========================================================================
    // SCENARIO 2: LOCAL SANDBOX DEMONSTRATION MODE
    // =========================================================================
    const loginRes = unifiedAuth.login(trimmedEmail);
    if (loginRes.success && loginRes.user) {
      const activeOrg = unifiedAuth.getActiveMembership();
      const orgRecord = db.organizations.find((o) => o.id === activeOrg?.organizationId) || db.organizations[0];

      return NextResponse.json({
        success: true,
        sandbox: true,
        message: `Welcome back! Signed in as ${trimmedEmail} (sandbox).`,
        user: {
          id: loginRes.user.id,
          email: loginRes.user.email,
          fullName: loginRes.user.fullName,
          organizationId: activeOrg?.organizationId || orgRecord.id,
          organizationName: activeOrg?.organizationName || orgRecord.name,
          role: activeOrg?.role || 'ORGANIZATION_OWNER',
        },
        organization: orgRecord,
      });
    }

    return NextResponse.json(
      { success: false, error: 'User not found in local sandbox. Please register first.' },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('[API /api/auth/login] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error processing sign-in.' },
      { status: 500 }
    );
  }
}
