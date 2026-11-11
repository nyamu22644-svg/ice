// GET /api/v1/sessions/[id]
// Retrieve status, metadata, and lifecycle progress of a verification session.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store/synthetic-db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const session = db.sessions.find((s) => s.id === id);

    if (!session) {
      return NextResponse.json(
        { error: `Verification session '${id}' not found.`, code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      customer_reference_id: session.externalReferenceId,
      project_id: session.projectId,
      environment: session.environment || 'SANDBOX',
      workflow_id: session.workflowId,
      workflow_version: session.workflowVersion,
      risk_score: session.overallRiskScore,
      authoritative_check_status: session.authoritativeCheckStatus,
      return_url: session.returnUrl,
      cancel_url: session.cancelUrl,
      created_at: session.createdAt,
      completed_at: session.completedAt,
      expires_at: session.expiresAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
