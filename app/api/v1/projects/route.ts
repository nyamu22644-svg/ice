// GET & POST /api/v1/projects
// REST API for managing integration projects for the authenticated organization.

import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-ice-tenant-id') || 'org_apex_fin';
    const repo = getRepository();
    const projects = await repo.getProjects(tenantId);
    return NextResponse.json({
      data: projects,
      provider: repo.getConnectionInfo().provider,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-ice-tenant-id') || 'org_apex_fin';
    const body = await req.json();

    const { 
      name, 
      description, 
      allowed_origins, 
      country, 
      intended_use_case, 
      default_workflow_id,
      integration_method,
      environment 
    } = body;

    if (!name || !intended_use_case) {
      return NextResponse.json(
        { error: 'Missing required project attributes (name, intended_use_case).', code: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const project = await repo.createProject(tenantId, {
      name,
      description,
      allowedOrigins: allowed_origins || [],
      country,
      intendedUseCase: intended_use_case,
      defaultWorkflowId: default_workflow_id,
      primaryIntegrationMethod: integration_method,
      environment,
    });

    return NextResponse.json(
      {
        data: project,
        message: 'Integration project created successfully.',
        provider: repo.getConnectionInfo().provider,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
