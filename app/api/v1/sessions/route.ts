// POST & GET /api/v1/sessions
// Technology-Independent REST API for creating and querying verification sessions.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store/synthetic-db';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    let tenantId = req.headers.get('x-ice-tenant-id') || '';
    let projectId = req.headers.get('x-ice-project-id') || undefined;

    // Bearer Token Authentication
    if (authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '').trim();
      
      // Look up credential in db by matching prefix or test key
      const credential = db.apiCredentials.find(
        (c) => c.status === 'ACTIVE' && (apiKey.startsWith(c.keyPrefix) || c.keyPrefix.startsWith(apiKey.substring(0, 10)))
      );

      if (!credential) {
        // Fallback check: check if it's a validly formatted synthetic key
        if (apiKey.startsWith('ice_test_') || apiKey.startsWith('ice_live_')) {
          const isLive = apiKey.startsWith('ice_live_');
          // Find any org matching environment
          const matchedOrg = db.organizations.find((o) => (isLive ? o.onboardingStatus === 'PRODUCTION_APPROVED' : true));
          tenantId = matchedOrg?.id || 'org_apex_fin';
        } else {
          return NextResponse.json(
            { error: 'Unauthorized: Invalid or revoked API key.', code: 'INVALID_CREDENTIALS' },
            { status: 401 }
          );
        }
      } else {
        tenantId = credential.organizationId;
        projectId = credential.projectId;

        // Security check: Live production key must only be usable by approved organizations
        if (credential.environment === 'PRODUCTION') {
          const org = db.organizations.find((o) => o.id === tenantId);
          if (org?.onboardingStatus !== 'PRODUCTION_APPROVED') {
            return NextResponse.json(
              { error: 'Forbidden: Organization is not approved for live production API traffic.', code: 'PRODUCTION_ACCESS_DENIED' },
              { status: 403 }
            );
          }
        }
      }
    }

    if (!tenantId) {
      tenantId = 'org_apex_fin'; // Default fallback during direct browser demo
    }

    const body = await req.json();
    const { 
      customer, 
      applicant,
      workflow_id, 
      verification_profile_id,
      verification_profile,
      external_reference,
      customer_reference_id, 
      project_id: bodyProjectId,
      return_url, 
      cancel_url, 
      integration_method 
    } = body;

    const resolvedProjectId = bodyProjectId || projectId;
    const resolvedProfileId = verification_profile_id || verification_profile;
    const resolvedExternalRef = external_reference || customer_reference_id;

    // Normalize applicant / customer details
    const applicantData = applicant || customer || {};
    const fullName = applicantData.full_name || 
      (applicantData.first_name && applicantData.last_name ? `${applicantData.first_name} ${applicantData.last_name}`.trim() : applicantData.first_name || 'Applicant');
    
    // In extract-from-document workflows, applicant ID can be extracted directly from captured ID
    const idNumber = applicantData.national_id_number || applicantData.id_number || applicantData.idNumber || 'PENDING_OCR_CAPTURE';
    const dob = applicantData.dob || applicantData.date_of_birth || '1990-01-01';
    const email = applicantData.email || `${idNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@applicant.example.com`;
    const phone = applicantData.phone || applicantData.phone_number || '+254700000000';

    // Call database to create session with profile and domain validation
    const session = db.createSession(tenantId, {
      fullName,
      dob,
      idNumber,
      email,
      phone,
      workflowId: workflow_id,
      verificationProfileId: resolvedProfileId,
      projectId: resolvedProjectId,
      returnUrl: return_url,
      cancelUrl: cancel_url,
      customerReferenceId: resolvedExternalRef,
      integrationMethod: integration_method,
    });

    const origin = req.nextUrl.origin || 'https://verify.ice.example.com';
    const sessionToken = session.sessionToken || `tok_${session.id}_${Math.random().toString(36).substring(2, 8)}`;
    const hostedUrl = `${origin}/verify/${session.id}?session_token=${encodeURIComponent(sessionToken)}&embed=false`;
    const embeddedUrl = `${origin}/verify/${session.id}?session_token=${encodeURIComponent(sessionToken)}&embed=true`;

    const response = NextResponse.json(
      {
        id: session.id,
        session_token: sessionToken,
        status: session.status,
        external_reference: session.externalReferenceId,
        customer_reference_id: session.externalReferenceId,
        verification_profile_id: session.verificationProfileId,
        verification_profile_name: session.verificationProfileName,
        project_id: session.projectId,
        environment: session.environment,
        workflow_id: session.workflowId,
        workflow_version: session.workflowVersion,
        identity_collection_mode: session.identityCollectionMode,
        required_steps: session.requiredStepsSummary,
        hosted_url: hostedUrl,
        embedded_url: embeddedUrl,
        return_url: session.returnUrl,
        cancel_url: session.cancelUrl,
        authoritative_check_status: session.authoritativeCheckStatus,
        expires_at: session.expiresAt,
        created_at: session.createdAt,
      },
      { status: 201 }
    );

    // Record redacted integration traffic log
    try {
      db.recordIntegrationLog({
        organizationId: tenantId,
        projectId: session.projectId || projectId,
        environment: session.environment || 'SANDBOX',
        method: 'POST',
        endpoint: '/api/v1/sessions',
        statusCode: 201,
        durationMs: Math.floor(45 + Math.random() * 60),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'External-API-Client',
        requestBodyMasked: {
          verification_profile_id: session.verificationProfileId,
          external_reference: session.externalReferenceId,
          applicant: { first_name: applicant?.first_name || 'Applicant', last_name: '••••••' },
        },
        responseSnippet: JSON.stringify({ id: session.id, status: session.status }),
      });
    } catch {
      // Non-blocking log recording
    }

    return response;
  } catch (error: any) {
    try {
      db.recordIntegrationLog({
        organizationId: 'org_apex_fin',
        environment: 'SANDBOX',
        method: 'POST',
        endpoint: '/api/v1/sessions',
        statusCode: error.name === 'DomainValidationError' ? 422 : error.name === 'ProfileStatusError' ? 400 : 500,
        durationMs: 25,
        requestId: `req_err_${Date.now()}`,
        clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
        errorMessage: error.message,
      });
    } catch {
      // Non-blocking
    }

    if (error.name === 'DomainValidationError') {
      return NextResponse.json(
        { error: error.message, code: 'UNREGISTERED_REDIRECT_ORIGIN' },
        { status: 422 }
      );
    }
    if (error.name === 'ProfileStatusError') {
      return NextResponse.json(
        { error: error.message, code: 'DRAFT_PROFILE_IN_PRODUCTION' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-ice-tenant-id') || 'org_apex_fin';
    const sessions = db.getVerifications(tenantId, 'DEVELOPER');
    return NextResponse.json({
      data: sessions.slice(0, 20).map((s) => ({
        id: s.id,
        status: s.status,
        customer_reference_id: s.externalReferenceId,
        created_at: s.createdAt,
        expires_at: s.expiresAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
