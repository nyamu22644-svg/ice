import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { db } from '@/lib/store/synthetic-db';
import { SEEDED_UNIFIED_USERS } from '@/lib/auth/unified-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: 'userId or email is required.' },
        { status: 400 }
      );
    }

    if (isSupabaseAdminConfigured) {
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Supabase admin client unavailable.' },
          { status: 500 }
        );
      }

      // Query public.users with joined organization
      let query = admin.from('users').select('id, email, name, role, is_active, organizations(*)');
      if (userId) {
        query = query.eq('id', userId);
      } else if (email) {
        query = query.eq('email', email.toLowerCase());
      }

      const { data: userRecord, error: userError } = await query.maybeSingle();

      if (userRecord && userRecord.organizations) {
        const org = Array.isArray(userRecord.organizations)
          ? userRecord.organizations[0]
          : userRecord.organizations;

        return NextResponse.json({
          success: true,
          user: {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            role: userRecord.role,
          },
          organization: org,
        });
      }

      // If user exists in auth.users but not in public.users, create their organization
      if (userId && email) {
        const companyName = email.split('@')[1]?.split('.')[0] || 'My Organization';
        const formattedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
        const orgSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const { data: createdOrg } = await admin
          .from('organizations')
          .insert({
            name: formattedName,
            slug: `${orgSlug}-${Date.now().toString(36).slice(-4)}`,
            tier: 'STARTER',
            environment: 'SANDBOX',
          })
          .select()
          .single();

        if (createdOrg) {
          await admin.from('users').upsert({
            id: userId,
            organization_id: createdOrg.id,
            email: email.toLowerCase(),
            name: email.split('@')[0],
            role: 'ORGANIZATION_OWNER',
            is_active: true,
          });

          return NextResponse.json({
            success: true,
            user: { id: userId, email, role: 'ORGANIZATION_OWNER' },
            organization: createdOrg,
          });
        }
      }
    }

    // Local fallback
    const targetEmail = (email || '').toLowerCase();
    const localUser = SEEDED_UNIFIED_USERS.find((u) => u.email.toLowerCase() === targetEmail);
    const activeOrgMembership = localUser?.organizations[0];
    const localOrg = activeOrgMembership
      ? db.organizations.find((o) => o.id === activeOrgMembership.organizationId)
      : db.organizations[0];

    return NextResponse.json({
      success: true,
      user: localUser
        ? {
            id: localUser.id,
            email: localUser.email,
            name: localUser.fullName,
            role: activeOrgMembership?.role || 'ORGANIZATION_OWNER',
          }
        : { id: userId || 'usr_local', email: targetEmail, role: 'ORGANIZATION_OWNER' },
      organization: localOrg || { id: 'org_apex_fin', name: 'Apex Finance Ltd' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server error fetching user profile.' },
      { status: 500 }
    );
  }
}
