'use client';

import React, { useState, useMemo } from 'react';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';
import { CompanyWorkspace } from '@/components/workspace/CompanyWorkspace';
import { OrganizationRole } from '@/lib/types';
import { db } from '@/lib/store/synthetic-db';

export default function WorkspacePage() {
  const [currentTenantId, setCurrentTenantId] = useState('org_apex_fin');
  const [currentRole, setCurrentRole] = useState<OrganizationRole>('COMPLIANCE_MANAGER');

  // Dynamically reflect organizations from database cache (including newly registered orgs)
  const availableTenants = db.organizations.map((org) => ({
    id: org.id,
    name: org.name,
    tier: org.tier || 'STARTER',
    environment: org.environment || 'SANDBOX',
  }));

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <GlobalHeader
        currentTenantId={currentTenantId}
        onTenantChange={setCurrentTenantId}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        tenants={availableTenants}
      />
      <main>
        <CompanyWorkspace
          tenantId={currentTenantId}
          userRole={currentRole}
          onTenantChange={setCurrentTenantId}
          onRoleChange={setCurrentRole}
        />
      </main>
    </div>
  );
}
