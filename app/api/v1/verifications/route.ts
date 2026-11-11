// GET /api/v1/verifications

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store/synthetic-db';
import { OrganizationRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-ice-tenant-id') || 'org_apex_fin';
    const role = (req.headers.get('x-ice-role') as OrganizationRole) || 'COMPLIANCE_MANAGER';

    const verifications = db.getVerifications(tenantId, role);

    return NextResponse.json({
      tenant_id: tenantId,
      count: verifications.length,
      data: verifications,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
