import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createBrowserClient, isSupabaseConfigured, deriveSupabaseUrl, supabasePublishableKey } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/store/synthetic-db';
import { unifiedAuth } from '@/lib/auth/unified-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      email, 
      password, 
      companyName, 
      contactPerson, 
      country = 'KE', 
      businessType = 'Fintech & Payments' 
    } = body;

    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedCompany = (companyName || '').trim();
    const trimmedContact = (contactPerson || '').trim() || trimmedCompany;

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid business email is required.' }, { status: 400 });
    }
    if (!trimmedCompany) {
      return NextResponse.json({ success: false, error: 'Company legal name is required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const orgSlug = trimmedCompany
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || `org-${Date.now().toString(36)}`;

    // =========================================================================
    // SCENARIO 1: SUPABASE CONNECTED WITH ADMIN SECRET KEY
    // =========================================================================
    if (isSupabaseAdminConfigured) {
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json({ success: false, error: 'Supabase admin client unavailable.' }, { status: 500 });
      }

      // 1. Create or verify auth.users profile with pre-confirmed email
      let userId: string | null = null;

      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email: trimmedEmail,
        password: password,
        email_confirm: true, // Pre-confirm so user can sign in immediately
        user_metadata: {
          full_name: trimmedContact,
          company_name: trimmedCompany,
          country,
          business_type: businessType,
        },
      });

      if (createError) {
        const errMsg = createError.message.toLowerCase();
        if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
          // Find existing user to update password & company metadata
          try {
            const { data: listData } = await admin.auth.admin.listUsers();
            const existing = listData?.users?.find((u) => u.email?.toLowerCase() === trimmedEmail);
            if (existing) {
              userId = existing.id;
              await admin.auth.admin.updateUserById(existing.id, {
                password,
                email_confirm: true,
                user_metadata: {
                  full_name: trimmedContact,
                  company_name: trimmedCompany,
                  country,
                  business_type: businessType,
                },
              });
            }
          } catch (listErr) {
            console.warn('[Supabase Register] User list warning:', listErr);
          }
        }
        
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: 'An account with this email is already registered. Please sign in with your credentials, or choose Forgot Password.',
          }, { status: 409 });
        }
      } else {
        userId = userData.user?.id || null;
      }

      if (!userId) {
        return NextResponse.json({ success: false, error: 'Failed to create user account profile.' }, { status: 500 });
      }

      // 2. Create organization in public.organizations (or fallback if tables not yet created in PostgreSQL)
      let createdOrg: any = null;
      let orgId: string = `org_${Date.now().toString(36)}`;

      try {
        const { data: dbOrg, error: orgError } = await admin
          .from('organizations')
          .insert({
            name: trimmedCompany,
            slug: `${orgSlug}-${Date.now().toString(36).slice(-4)}`,
            tier: 'STARTER',
            environment: 'SANDBOX',
            data_retention_days: 365,
            authoritative_source_connected: false,
          })
          .select()
          .single();

        if (orgError) {
          console.warn('[Supabase Register] Note: public.organizations table not present yet:', orgError.message);
        } else {
          createdOrg = dbOrg;
          orgId = dbOrg.id;
        }
      } catch (insertErr: any) {
        console.warn('[Supabase Register] DB insertion note:', insertErr.message);
      }

      if (!createdOrg) {
        createdOrg = {
          id: orgId,
          name: trimmedCompany,
          slug: orgSlug,
          tier: 'STARTER',
          environment: 'SANDBOX',
          dataRetentionDays: 365,
          authoritativeSourceConnected: false,
          onboardingStatus: 'SANDBOX_ACTIVE',
          createdAt: new Date().toISOString(),
        };
      }

      // 3. Organization Settings
      try {
        await admin.from('organization_settings').insert({
          organization_id: orgId,
          webhook_signing_secret: `whsec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`,
          enforce_liveness: true,
          require_biometrics: true,
          allowed_document_types: ['KE_NATIONAL_ID', 'KE_PASSPORT'],
          auto_approve_max_risk_score: 20,
        });
      } catch (e: any) {
        console.warn('[Supabase Register] Warning inserting settings:', e.message);
      }

      // 4. Link user in public.users
      try {
        await admin.from('users').upsert({
          id: userId,
          organization_id: orgId,
          email: trimmedEmail,
          name: trimmedContact,
          role: 'ORGANIZATION_OWNER',
          is_active: true,
        });
      } catch (e: any) {
        console.warn('[Supabase Register] Warning linking public.users:', e.message);
      }

      // 5. Update auth user app_metadata with organization_id for RLS enforcement
      try {
        await admin.auth.admin.updateUserById(userId, {
          app_metadata: {
            organization_id: orgId,
            role: 'ORGANIZATION_OWNER',
          },
        });
      } catch (e: any) {
        console.warn('[Supabase Register] Warning setting app_metadata:', e.message);
      }

      // 6. Seed starter integration project
      try {
        await admin.from('integration_projects').insert({
          organization_id: orgId,
          name: `${trimmedCompany} Sandbox`,
          description: 'Primary customer identity verification sandbox project',
          environment: 'SANDBOX',
          primary_integration_method: 'EMBEDDED_WEB_SDK',
          integration_method: 'EMBEDDED_WEB_SDK',
          allowed_origins: ['http://localhost:3000'],
          country,
          intended_use_case: businessType,
          status: 'ACTIVE',
        });
      } catch (e: any) {
        console.warn('[Supabase Register] Warning creating initial project:', e.message);
      }

      // Sync into local cache as well
      db.organizations.unshift({
        id: orgId,
        name: trimmedCompany,
        slug: createdOrg.slug,
        tier: 'STARTER',
        environment: 'SANDBOX',
        dataRetentionDays: 365,
        authoritativeSourceConnected: false,
        onboardingStatus: 'SANDBOX_ACTIVE',
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Welcome! Company ${trimmedCompany} registered successfully.`,
        user: {
          id: userId,
          email: trimmedEmail,
          fullName: trimmedContact,
          organizationId: orgId,
          organizationName: trimmedCompany,
          role: 'ORGANIZATION_OWNER',
        },
        organization: createdOrg,
      });
    }

    // =========================================================================
    // SCENARIO 2: SUPABASE CONNECTED CLIENT-ONLY (PUBLISHABLE/ANON KEY)
    // =========================================================================
    const serverPub = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serverUrl = deriveSupabaseUrl(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      serverPub
    );

    if (serverUrl && serverPub && !serverPub.includes('placeholder')) {
      const client = createClient(serverUrl, serverPub);
      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            company_name: trimmedCompany,
            full_name: trimmedContact,
            country,
            business_type: businessType,
          },
        },
      });

      if (signUpError) {
        return NextResponse.json({ success: false, error: signUpError.message }, { status: 400 });
      }

      const user = signUpData.user;
      const requiresEmailConfirmation = Boolean(
        !signUpData.session && user?.identities && user.identities.length > 0 && !user.confirmed_at
      );

      const orgId = `org_${Date.now().toString(36)}`;
      const localOrg = {
        id: orgId,
        name: trimmedCompany,
        slug: orgSlug,
        tier: 'STARTER' as const,
        environment: 'SANDBOX' as const,
        dataRetentionDays: 365,
        authoritativeSourceConnected: false,
        onboardingStatus: 'SANDBOX_ACTIVE' as const,
        createdAt: new Date().toISOString(),
      };
      db.organizations.unshift(localOrg as any);

      return NextResponse.json({
        success: true,
        requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? `Registration received! Please check ${trimmedEmail} to confirm your account.`
          : `Welcome! Organization ${trimmedCompany} registered.`,
        user: {
          id: user?.id || `usr_${Date.now()}`,
          email: trimmedEmail,
          fullName: trimmedContact,
          organizationId: orgId,
          organizationName: trimmedCompany,
          role: 'ORGANIZATION_OWNER',
        },
        organization: localOrg,
      });
    }

    // =========================================================================
    // SCENARIO 3: LOCAL SANDBOX DEMONSTRATION MODE
    // =========================================================================
    const orgId = `org_${Date.now().toString(36)}`;
    const newOrg = {
      id: orgId,
      name: trimmedCompany,
      slug: orgSlug,
      tier: 'STARTER' as const,
      environment: 'SANDBOX' as const,
      dataRetentionDays: 365,
      authoritativeSourceConnected: false,
      onboardingStatus: 'SANDBOX_ACTIVE' as const,
      createdAt: new Date().toISOString(),
    };
    db.organizations.unshift(newOrg as any);

    unifiedAuth.registerNewOrganization({
      organizationId: orgId,
      organizationName: trimmedCompany,
      ownerEmail: trimmedEmail,
      ownerName: trimmedContact,
    });

    return NextResponse.json({
      success: true,
      sandbox: true,
      message: `Company ${trimmedCompany} registered in sandbox mode.`,
      user: {
        id: `usr_${Date.now()}`,
        email: trimmedEmail,
        fullName: trimmedContact,
        organizationId: orgId,
        organizationName: trimmedCompany,
        role: 'ORGANIZATION_OWNER',
      },
      organization: newOrg,
    });
  } catch (err: any) {
    console.error('[API /api/auth/register] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'An internal registration server error occurred.' },
      { status: 500 }
    );
  }
}
