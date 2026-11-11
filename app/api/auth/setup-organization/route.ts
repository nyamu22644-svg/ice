import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { db } from '@/lib/store/synthetic-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, companyName, contactPerson, country = 'KE', businessType = 'Fintech' } = body;

    if (!email || !companyName) {
      return NextResponse.json(
        { success: false, error: 'Email and company name are required.' },
        { status: 400 }
      );
    }

    const orgSlug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || `org-${Date.now().toString(36)}`;

    // 1. If Supabase is configured with Admin / Secret Key
    if (isSupabaseAdminConfigured) {
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Supabase admin client unavailable.' },
          { status: 500 }
        );
      }

      // Check if user already has an organization
      if (userId) {
        const { data: existingUser } = await admin
          .from('users')
          .select('organization_id, role, organizations(*)')
          .eq('id', userId)
          .maybeSingle();

        if (existingUser && existingUser.organizations) {
          const org = Array.isArray(existingUser.organizations) 
            ? existingUser.organizations[0] 
            : existingUser.organizations;
          return NextResponse.json({
            success: true,
            organization: org,
            user: { id: userId, email, role: existingUser.role },
          });
        }
      }

      // Create new organization in public.organizations
      const { data: createdOrg, error: orgError } = await admin
        .from('organizations')
        .insert({
          name: companyName.trim(),
          slug: `${orgSlug}-${Date.now().toString(36).slice(-4)}`,
          tier: 'STARTER',
          environment: 'SANDBOX',
          data_retention_days: 365,
          authoritative_source_connected: false,
        })
        .select()
        .single();

      if (orgError) {
        console.error('[Supabase Setup] Failed to create organization:', orgError);
        return NextResponse.json(
          { success: false, error: `Database error: ${orgError.message}` },
          { status: 500 }
        );
      }

      const orgId = createdOrg.id;

      // Create organization settings
      await admin.from('organization_settings').insert({
        organization_id: orgId,
        webhook_signing_secret: `whsec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`,
        enforce_liveness: true,
        require_biometrics: true,
        allowed_document_types: ['KE_NATIONAL_ID', 'KE_PASSPORT'],
        auto_approve_max_risk_score: 20,
      });

      // Link user in public.users if userId is provided
      if (userId) {
        await admin.from('users').upsert({
          id: userId,
          organization_id: orgId,
          email: email.trim().toLowerCase(),
          name: contactPerson || companyName,
          role: 'ORGANIZATION_OWNER',
          is_active: true,
        });

        // Set organization_id in Supabase Auth user's app_metadata so RLS automatically succeeds
        try {
          await admin.auth.admin.updateUserById(userId, {
            app_metadata: {
              organization_id: orgId,
              role: 'ORGANIZATION_OWNER',
            },
            user_metadata: {
              company_name: companyName,
              full_name: contactPerson,
              country,
              business_type: businessType,
            },
          });
        } catch (metaErr) {
          console.warn('[Supabase Setup] Notice updating user metadata:', metaErr);
        }
      }

      // Seed starter integration project
      try {
        await admin.from('integration_projects').insert({
          organization_id: orgId,
          name: `${companyName} Sandbox Project`,
          description: 'Primary customer identity verification sandbox project',
          environment: 'SANDBOX',
          primary_integration_method: 'EMBEDDED_WEB_SDK',
          integration_method: 'EMBEDDED_WEB_SDK',
          allowed_origins: ['http://localhost:3000'],
          country,
          intended_use_case: businessType,
          status: 'ACTIVE',
        });
      } catch (projErr) {
        console.warn('[Supabase Setup] Notice seeding starter project:', projErr);
      }

      return NextResponse.json({
        success: true,
        organization: createdOrg,
        user: { id: userId, email, role: 'ORGANIZATION_OWNER' },
      });
    }

    // 2. Local sandbox fallback when Supabase keys are not set
    const fallbackOrgId = `org_${Date.now().toString(36)}`;
    const newOrg = {
      id: fallbackOrgId,
      name: companyName.trim(),
      slug: orgSlug,
      tier: 'STARTER' as const,
      environment: 'SANDBOX' as const,
      dataRetentionDays: 365,
      authoritativeSourceConnected: false,
      onboardingStatus: 'SANDBOX_ACTIVE' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.organizations.unshift(newOrg as any);

    return NextResponse.json({
      success: true,
      organization: newOrg,
      user: { id: userId || `usr_${Date.now()}`, email, role: 'ORGANIZATION_OWNER' },
    });
  } catch (err: any) {
    console.error('Error in /api/auth/setup-organization:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error setting up organization.' },
      { status: 500 }
    );
  }
}
