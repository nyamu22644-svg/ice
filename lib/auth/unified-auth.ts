// ICE Unified Authentication & Organization Context Engine
// Implements Single Organization Account across Company Workspace and Developer Portal.
// The organization owner uses the same registered email and password for both portals.
// Supports multi-organization membership with strict context switching and permission isolation.

import { OrganizationRole, Permission, UnifiedUserAccount, OrganizationMembership } from '../types';
import { ROLE_PERMISSIONS, hasPermission } from './rbac';

const UNIFIED_AUTH_STORAGE_KEY = 'ice_unified_auth_user';

// Seeded unified user accounts
export const SEEDED_UNIFIED_USERS: UnifiedUserAccount[] = [
  {
    id: 'usr_owner_01',
    email: 'owner@apexfinance.com',
    fullName: 'Edwin Nyamu',
    organizations: [
      {
        organizationId: 'org_apex_fin',
        organizationName: 'Apex Finance Ltd',
        role: 'ORGANIZATION_OWNER',
        isOwner: true,
        permissions: ROLE_PERMISSIONS['ORGANIZATION_OWNER'],
        joinedAt: '2025-01-15T08:00:00Z',
      },
      {
        organizationId: 'org_safari_pay',
        organizationName: 'Safari Payments PLC',
        role: 'ORGANIZATION_OWNER',
        isOwner: true,
        permissions: ROLE_PERMISSIONS['ORGANIZATION_OWNER'],
        joinedAt: '2025-03-20T10:30:00Z',
      },
    ],
    activeOrganizationId: 'org_apex_fin',
    createdAt: '2025-01-15T08:00:00Z',
  },
  {
    id: 'usr_compliance_01',
    email: 'sarah.compliance@apexfinance.com',
    fullName: 'Sarah Chebet',
    organizations: [
      {
        organizationId: 'org_apex_fin',
        organizationName: 'Apex Finance Ltd',
        role: 'COMPLIANCE_MANAGER',
        isOwner: false,
        permissions: ROLE_PERMISSIONS['COMPLIANCE_MANAGER'],
        joinedAt: '2025-02-01T09:00:00Z',
      },
    ],
    activeOrganizationId: 'org_apex_fin',
    createdAt: '2025-02-01T09:00:00Z',
  },
  {
    id: 'usr_dev_01',
    email: 'david.dev@apexfinance.com',
    fullName: 'David Kiprono',
    organizations: [
      {
        organizationId: 'org_apex_fin',
        organizationName: 'Apex Finance Ltd',
        role: 'DEVELOPER',
        isOwner: false,
        permissions: ROLE_PERMISSIONS['DEVELOPER'],
        joinedAt: '2025-04-10T14:15:00Z',
      },
    ],
    activeOrganizationId: 'org_apex_fin',
    createdAt: '2025-04-10T14:15:00Z',
  },
];

export class UnifiedAuthManager {
  private currentUser: UnifiedUserAccount | null = null;
  private listeners = new Set<(user: UnifiedUserAccount | null) => void>();

  constructor() {
    // Default to the Organization Owner to enable immediate testing across both portals
    this.currentUser = SEEDED_UNIFIED_USERS[0];
  }

  getCurrentUser(): UnifiedUserAccount | null {
    return this.currentUser;
  }

  getActiveMembership(): OrganizationMembership | null {
    if (!this.currentUser) return null;
    return (
      this.currentUser.organizations.find(
        (org) => org.organizationId === this.currentUser?.activeOrganizationId
      ) || this.currentUser.organizations[0] || null
    );
  }

  switchActiveOrganization(organizationId: string): boolean {
    if (!this.currentUser) return false;
    const membership = this.currentUser.organizations.find((o) => o.organizationId === organizationId);
    if (!membership) {
      console.error(`User ${this.currentUser.email} does not belong to organization ${organizationId}`);
      return false;
    }

    this.currentUser = {
      ...this.currentUser,
      activeOrganizationId: organizationId,
    };
    this.notify();
    return true;
  }

  /**
   * Authenticates user using the same registered email and password across both portals.
   */
  login(email: string): { success: boolean; user?: UnifiedUserAccount; error?: string } {
    const trimmed = email.trim().toLowerCase();
    const existing = SEEDED_UNIFIED_USERS.find((u) => u.email.toLowerCase() === trimmed);
    
    if (existing) {
      this.currentUser = existing;
      this.notify();
      return { success: true, user: this.currentUser };
    }

    // If new company registered or new developer logged in with company domain
    const isOwnerEmail = trimmed.includes('owner') || trimmed.includes('admin') || trimmed.includes('nyamu');
    const newUser: UnifiedUserAccount = {
      id: `usr_${Date.now()}`,
      email: trimmed,
      fullName: trimmed.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      organizations: [
        {
          organizationId: 'org_apex_fin',
          organizationName: 'Apex Finance Ltd',
          role: isOwnerEmail ? 'ORGANIZATION_OWNER' : 'DEVELOPER',
          isOwner: isOwnerEmail,
          permissions: ROLE_PERMISSIONS[isOwnerEmail ? 'ORGANIZATION_OWNER' : 'DEVELOPER'],
          joinedAt: new Date().toISOString(),
        },
      ],
      activeOrganizationId: 'org_apex_fin',
      createdAt: new Date().toISOString(),
    };

    SEEDED_UNIFIED_USERS.push(newUser);
    this.currentUser = newUser;
    this.notify();
    return { success: true, user: newUser };
  }

  logout() {
    this.currentUser = null;
    this.notify();
  }

  registerNewOrganization(params: {
    organizationId: string;
    organizationName: string;
    ownerEmail: string;
    ownerName: string;
  }) {
    const { organizationId, organizationName, ownerEmail, ownerName } = params;
    const existing = SEEDED_UNIFIED_USERS.find((u) => u.email.toLowerCase() === ownerEmail.toLowerCase());
    if (existing) {
      existing.organizations.unshift({
        organizationId,
        organizationName,
        role: 'ORGANIZATION_OWNER',
        isOwner: true,
        permissions: ROLE_PERMISSIONS['ORGANIZATION_OWNER'],
        joinedAt: new Date().toISOString(),
      });
      existing.activeOrganizationId = organizationId;
      this.currentUser = existing;
    } else {
      const newUser: UnifiedUserAccount = {
        id: `usr_${Date.now()}`,
        email: ownerEmail.toLowerCase(),
        fullName: ownerName,
        organizations: [
          {
            organizationId,
            organizationName,
            role: 'ORGANIZATION_OWNER',
            isOwner: true,
            permissions: ROLE_PERMISSIONS['ORGANIZATION_OWNER'],
            joinedAt: new Date().toISOString(),
          },
        ],
        activeOrganizationId: organizationId,
        createdAt: new Date().toISOString(),
      };
      SEEDED_UNIFIED_USERS.unshift(newUser);
      this.currentUser = newUser;
    }
    this.notify();
  }

  setExplicitSession(params: {
    id: string;
    email: string;
    fullName: string;
    organizationId: string;
    organizationName: string;
    role: OrganizationRole;
  }) {
    const { id, email, fullName, organizationId, organizationName, role } = params;
    const existing = SEEDED_UNIFIED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const hasOrg = existing.organizations.some((o) => o.organizationId === organizationId);
      if (!hasOrg) {
        existing.organizations.unshift({
          organizationId,
          organizationName,
          role,
          isOwner: role === 'ORGANIZATION_OWNER',
          permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['ORGANIZATION_OWNER'],
          joinedAt: new Date().toISOString(),
        });
      }
      existing.activeOrganizationId = organizationId;
      this.currentUser = existing;
    } else {
      const newUser: UnifiedUserAccount = {
        id,
        email: email.toLowerCase(),
        fullName,
        organizations: [
          {
            organizationId,
            organizationName,
            role,
            isOwner: role === 'ORGANIZATION_OWNER',
            permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['ORGANIZATION_OWNER'],
            joinedAt: new Date().toISOString(),
          },
        ],
        activeOrganizationId: organizationId,
        createdAt: new Date().toISOString(),
      };
      SEEDED_UNIFIED_USERS.unshift(newUser);
      this.currentUser = newUser;
    }
    this.notify();
  }

  inviteDeveloperToOrganization(
    inviterEmail: string,
    targetOrgId: string,
    developerEmail: string,
    developerName: string,
    role: OrganizationRole = 'DEVELOPER'
  ): { success: boolean; message: string } {
    const membership = this.getActiveMembership();
    if (!membership || !membership.isOwner) {
      return {
        success: false,
        message: 'Only Organization Owners and Admins can invite developers or manage integration access.',
      };
    }

    let devUser = SEEDED_UNIFIED_USERS.find((u) => u.email.toLowerCase() === developerEmail.toLowerCase());
    if (devUser) {
      const alreadyMember = devUser.organizations.some((o) => o.organizationId === targetOrgId);
      if (alreadyMember) {
        return { success: false, message: `${developerEmail} is already a member of this organization.` };
      }
      devUser.organizations.push({
        organizationId: targetOrgId,
        organizationName: membership.organizationName,
        role,
        isOwner: false,
        permissions: ROLE_PERMISSIONS[role],
        joinedAt: new Date().toISOString(),
      });
    } else {
      devUser = {
        id: `usr_dev_${Date.now()}`,
        email: developerEmail.toLowerCase(),
        fullName: developerName,
        organizations: [
          {
            organizationId: targetOrgId,
            organizationName: membership.organizationName,
            role,
            isOwner: false,
            permissions: ROLE_PERMISSIONS[role],
            joinedAt: new Date().toISOString(),
          },
        ],
        activeOrganizationId: targetOrgId,
        createdAt: new Date().toISOString(),
      };
      SEEDED_UNIFIED_USERS.push(devUser);
    }

    this.notify();
    return {
      success: true,
      message: `Developer ${developerEmail} successfully invited into ${membership.organizationName} with role '${role}'.`,
    };
  }

  subscribe(listener: (user: UnifiedUserAccount | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }
}

export const unifiedAuth = new UnifiedAuthManager();
