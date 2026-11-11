// POST /api/v1/sessions/[id]/cancel
// Cancel a pending verification session (e.g. user aborts or loan application cancelled).

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store/synthetic-db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const session = db.sessions.find((s) => s.id === id);

    if (!session) {
      return NextResponse.json(
        { error: `Verification session '${id}' not found.`, code: 'SESSION_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (session.status === 'VERIFIED' || session.status === 'REJECTED') {
      return NextResponse.json(
        { error: `Cannot cancel session in terminal status '${session.status}'.`, code: 'SESSION_ALREADY_TERMINATED' },
        { status: 400 }
      );
    }

    session.status = 'EXPIRED';
    session.completedAt = new Date().toISOString();

    db.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: session.organizationId,
      actorId: 'api_client',
      actorName: 'API Integration Client',
      actorType: 'API_KEY',
      action: 'VERIFICATION_SESSION_CANCELLED',
      resourceType: 'VERIFICATION_SESSION',
      resourceId: session.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { previousStatus: 'PENDING_SUBMISSION', newStatus: 'EXPIRED' },
    });

    db.triggerWebhookDelivery(session.organizationId, 'verification.cancelled', {
      sessionId: session.id,
      externalReferenceId: session.externalReferenceId,
      status: 'EXPIRED',
      completedAt: session.completedAt,
    }, session.projectId);

    return NextResponse.json({
      id: session.id,
      status: 'CANCELLED',
      message: 'Verification session successfully cancelled.',
      cancelled_at: session.completedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
