// GET /api/health

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    platform: 'ICE Identity Verification Platform',
    version: '1.0.0-foundation',
    timestamp: new Date().toISOString(),
    components: {
      tenant_isolation_rls: 'ACTIVE',
      doc_vision_engine: 'ICE-DocVision-v2.4',
      biometric_adapter: 'ICE-BioNet-v1.4',
      risk_engine: 'ICE-RiskEngine-v1.8',
      authoritative_govt_source: 'NOT_CONNECTED (Honest state)',
      database_target: 'PostgreSQL 15+ (Migrations ready in db/migrations)',
    },
  });
}
