// POST /api/v1/verifications/[id]/decision

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store/synthetic-db';
import { OrganizationRole } from '@/lib/types';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const body = await req.json();
    const tenantId = req.headers.get('x-ice-tenant-id') || 'org_apex_fin';
    const role = (req.headers.get('x-ice-role') as OrganizationRole) || 'COMPLIANCE_MANAGER';

    const { status, reason, reviewer_id, reviewer_name } = body;

    if (!status || !reason) {
      return NextResponse.json(
        { error: 'Missing decision status or justification reason' },
        { status: 400 }
      );
    }

    const updated = db.recordDecision(
      tenantId,
      id,
      reviewer_id || 'api_reviewer',
      reviewer_name || 'API Compliance Reviewer',
      role,
      {
        status,
        reason,
        reviewerId: reviewer_id || 'api_reviewer',
        reviewerName: reviewer_name || 'API Reviewer',
      }
    );

    return NextResponse.json({
      message: 'Decision recorded successfully',
      session_id: updated.id,
      new_status: updated.status,
      completed_at: updated.completedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
