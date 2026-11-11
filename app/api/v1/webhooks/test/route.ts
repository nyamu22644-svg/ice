// POST /api/v1/webhooks/test
// Dispatch an interactive test webhook event to verify external endpoint receipt and HMAC signature.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store/synthetic-db';

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-ice-tenant-id') || 'org_apex_fin';
    const body = await req.json();

    const { endpoint_id, event_type = 'verification.completed', sample_session_id } = body;

    const session = db.sessions.find((s) => s.id === sample_session_id) || db.sessions[0];

    const deliveries = db.triggerWebhookDelivery(
      tenantId,
      event_type,
      {
        sessionId: session.id,
        externalReferenceId: session.externalReferenceId || 'TEST-REF-9921',
        status: session.status,
        workflowId: session.workflowId,
        workflowVersion: session.workflowVersion,
        riskScore: session.overallRiskScore,
        authoritativeStatus: session.authoritativeCheckStatus,
        completedAt: new Date().toISOString(),
      },
      session.projectId
    );

    return NextResponse.json({
      success: true,
      deliveries_count: deliveries.length,
      sample_delivery: deliveries[0] || null,
      message: 'Test webhook event dispatched with HMAC-SHA256 signature.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
