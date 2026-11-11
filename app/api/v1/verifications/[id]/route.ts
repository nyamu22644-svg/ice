// GET /api/v1/verifications/[id]
// Retrieve verification results with data-minimization for external integration clients.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store/synthetic-db';
import { OrganizationRole } from '@/lib/types';
import { hasPermission } from '@/lib/auth/rbac';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization') || '';
    let tenantId = req.headers.get('x-ice-tenant-id') || 'org_apex_fin';
    let role: OrganizationRole = (req.headers.get('x-ice-role') as OrganizationRole) || 'DEVELOPER';

    // If API client Bearer token is provided
    if (authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '').trim();
      const credential = db.apiCredentials.find(
        (c) => c.status === 'ACTIVE' && (apiKey.startsWith(c.keyPrefix) || c.keyPrefix.startsWith(apiKey.substring(0, 10)))
      );
      if (credential) {
        tenantId = credential.organizationId;
        role = 'DEVELOPER'; // External API callers have DEVELOPER privileges
      }
    }

    const verification = db.getVerificationById(tenantId, id, role);

    // Data-Minimization check:
    // Independent external apps (e.g. Lending App) receive minimum necessary claims and risk band.
    // Raw document buffers and biometrics are never exposed to API callers without explicit compliance role.
    const canViewRawDocuments = hasPermission(role, 'DOCUMENTS_VIEW_RAW');

    if (!canViewRawDocuments) {
      return NextResponse.json({
        id: verification.id,
        status: verification.status,
        customer_reference_id: verification.externalReferenceId,
        workflow_version: verification.workflowVersion,
        verified_claims: {
          is_verified: verification.status === 'VERIFIED',
          full_name: verification.submittedData.fullName,
          national_id_masked: verification.submittedData.nationalIdNumber.replace(/^(\d{4})(\d+)/, '$1****'),
          dob: verification.submittedData.dob,
          nationality: verification.submittedData.nationality,
        },
        risk_assessment: {
          overall_risk_score: verification.overallRiskScore,
          risk_band: verification.overallRiskScore <= 20 ? 'LOW' : verification.overallRiskScore <= 60 ? 'MEDIUM' : 'HIGH',
          flags: verification.riskIndicators.map((r) => r.signalType),
        },
        authoritative_check_status: verification.authoritativeCheckStatus,
        completed_at: verification.completedAt,
        decision_reason: verification.finalDecision?.reason,
      });
    }

    // Full evidence for authorized internal compliance staff
    return NextResponse.json({
      data: verification,
    });
  } catch (error: any) {
    if (error.name === 'TenantIsolationError') {
      return NextResponse.json(
        { error: 'Security Violation: Cross-tenant access prohibited.', code: 'TENANT_BOUNDARY_BREACH' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
