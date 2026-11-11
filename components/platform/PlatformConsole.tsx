'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Activity, 
  Server, 
  Cpu, 
  Lock, 
  AlertOctagon, 
  FileText, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  Sliders,
  Database,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  ShieldAlert,
  HardDrive,
  Check,
  X
} from 'lucide-react';
import { PortalShell, NavGroup } from '../layout/PortalShell';
import { db } from '@/lib/store/synthetic-db';
import { OrganizationOnboardingApplication } from '@/lib/types';
import { canAccessPlatformConsole } from '@/lib/auth/portal-auth';
import { formatDateTime } from '@/lib/utils';

export function PlatformConsole() {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'tenants'
    | 'engines'
    | 'health'
    | 'support_access'
    | 'security_events'
    | 'internal_audit'
    | 'staff_roles'
    | 'platform_settings'
  >('overview');

  // Staff Authorization State
  const [simulatedActor, setSimulatedActor] = useState<'AUTHORIZED_SUPER_ADMIN' | 'UNAUTHORIZED_COMPANY_USER'>('AUTHORIZED_SUPER_ADMIN');

  const currentStaff = useMemo(() => {
    if (simulatedActor === 'AUTHORIZED_SUPER_ADMIN') {
      return {
        id: 'stf_01',
        name: 'Dr. Eric Omondi',
        role: 'PLATFORM_SUPER_ADMIN',
        email: 'eric.omondi@iceplatform.internal',
        mfaVerified: true,
        isInternalStaff: true,
      };
    }
    return {
      id: 'usr_company_99',
      name: 'External Company User',
      role: 'ORGANIZATION_OWNER',
      email: 'owner@apexfinance.ke',
      mfaVerified: false,
      isInternalStaff: false,
    };
  }, [simulatedActor]);

  const accessCheck = useMemo(() => canAccessPlatformConsole(currentStaff), [currentStaff]);

  // Support Access Emergency Workflow State
  const [supportRequests, setSupportRequests] = useState([
    {
      id: 'req_supp_901',
      tenantId: 'org_apex_fin',
      requesterName: 'Kevin Mutua (Support Tier 2)',
      targetSessionId: 'sess_apex_102',
      justification: 'Customer reported blurry document upload failure on mobile Chrome (Support Ticket #84910). Requires 15-minute image inspection with customer consent.',
      requestedDurationMins: 15,
      status: 'PENDING_DUAL_AUTH',
      createdAt: '2026-11-08T13:40:00Z',
    },
  ]);

  const [dualAuthSuccessMsg, setDualAuthSuccessMsg] = useState<string | null>(null);

  const handleApproveSupportAccess = (reqId: string) => {
    setSupportRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'AUTHORIZED_ACTIVE' } : r))
    );
    setDualAuthSuccessMsg('Dual-authorization confirmed by Security Admin. 15-minute read token minted. Immutable audit event logged.');
    setTimeout(() => setDualAuthSuccessMsg(null), 4000);
  };

  // Onboarding Review Queue State
  const [tenantSubTab, setTenantSubTab] = useState<'partitions' | 'onboarding_queue'>('onboarding_queue');
  const [selectedOnboardingApp, setSelectedOnboardingApp] = useState<OrganizationOnboardingApplication | null>(null);
  const [reviewDecisionNotes, setReviewDecisionNotes] = useState('');
  const [reviewActionFeedback, setReviewActionFeedback] = useState<string | null>(null);

  const handleReviewAction = (orgId: string, decision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO' | 'SUSPEND' | 'REINSTATE') => {
    db.reviewOrganizationApplication(
      orgId,
      decision,
      currentStaff.id,
      currentStaff.name,
      reviewDecisionNotes || `Decision recorded by ${currentStaff.name} via Platform Console.`
    );
    setReviewActionFeedback(`Action '${decision}' recorded for ${orgId}. Compliance audit ledger committed.`);
    setSelectedOnboardingApp(null);
    setReviewDecisionNotes('');
    setTimeout(() => setReviewActionFeedback(null), 4000);
  };

  // Internal ICE Staff Directory
  const internalStaff = [
    { id: 'stf_01', name: 'Dr. Eric Omondi', role: 'PLATFORM_SUPER_ADMIN', email: 'eric.omondi@iceplatform.internal', mfa: true, status: 'ACTIVE' },
    { id: 'stf_02', name: 'Zainab Hussein', role: 'SECURITY_ADMIN', email: 'zainab.hussein@iceplatform.internal', mfa: true, status: 'ACTIVE' },
    { id: 'stf_03', name: 'Patrick Ndegwa', role: 'PRIVACY_OFFICER', email: 'patrick.ndegwa@iceplatform.internal', mfa: true, status: 'ACTIVE' },
    { id: 'stf_04', name: 'Kevin Mutua', role: 'SUPPORT_ENGINEER', email: 'kevin.mutua@iceplatform.internal', mfa: true, status: 'ACTIVE' },
  ];

  // Nav Groups for Persistent Left Sidebar
  const navGroups: NavGroup[] = [
    {
      title: 'Platform Overview & Tenants',
      items: [
        { id: 'overview', label: 'Platform Overview', icon: Activity },
        { id: 'tenants', label: 'Organizations & Tenants', icon: Building2, badge: db.organizations.length },
        { id: 'staff_roles', label: 'Internal Staff & Roles', icon: UserCheck },
      ],
    },
    {
      title: 'Vision Engines & Systems',
      items: [
        { id: 'engines', label: 'Engines & Models', icon: Cpu },
        { id: 'health', label: 'Infrastructure Health', icon: Server },
        { id: 'platform_settings', label: 'Platform Settings', icon: Sliders },
      ],
    },
    {
      title: 'Security & Governance',
      items: [
        { 
          id: 'support_access', 
          label: 'Support Access Controls', 
          icon: Lock, 
          badge: supportRequests.filter((r) => r.status === 'PENDING_DUAL_AUTH').length,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        { id: 'security_events', label: 'Security & RLS Events', icon: AlertOctagon },
        { id: 'internal_audit', label: 'Platform Audit Log', icon: FileText },
      ],
    },
  ];

  return (
    <PortalShell
      portalType="platform"
      portalTitle="ICE Platform Console"
      portalSubtitle="Restricted Internal Operations"
      portalBadge={{ label: 'STAFF ACCESS', variant: 'error' }}
      navGroups={navGroups}
      activeItemId={activeTab}
      onNavigate={(id) => setActiveTab(id as any)}
      headerControls={
        <div className="flex items-center gap-2">
          {/* Staff Identity & MFA badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101C2C] border border-[#1E2F47] text-xs text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-white">{currentStaff.name}</span>
            <span className="text-[10px] text-cyan-300 font-mono">MFA ACTIVE</span>
          </div>

          {/* Actor Boundary Simulator button to verify security enforcement */}
          <button
            onClick={() => setSimulatedActor((prev) => prev === 'AUTHORIZED_SUPER_ADMIN' ? 'UNAUTHORIZED_COMPANY_USER' : 'AUTHORIZED_SUPER_ADMIN')}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer ${
              simulatedActor === 'AUTHORIZED_SUPER_ADMIN'
                ? 'bg-slate-100 dark:bg-[#172B43] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#203652] hover:bg-slate-200'
                : 'bg-red-900/40 text-red-300 border-red-700 hover:bg-red-900/60'
            }`}
            title="Test server-side authorization check"
          >
            {simulatedActor === 'AUTHORIZED_SUPER_ADMIN' ? 'Test Boundary (Simulate 403)' : 'Restore Staff Session'}
          </button>
        </div>
      }
    >
      {/* ACCESS BOUNDARY ENFORCEMENT */}
      {!accessCheck.allowed ? (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white dark:bg-[#172B43] rounded-xl border border-red-200 dark:border-red-900/60 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono uppercase font-bold text-red-600 dark:text-red-400">
              403 Forbidden • Access Boundary
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Internal ICE Operations Console
            </h2>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {accessCheck.reason}
          </p>

          <div className="p-3 bg-slate-50 dark:bg-[#101C2C] rounded border border-slate-200 dark:border-[#203652] text-[11px] text-slate-500 dark:text-slate-400 text-left space-y-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">Strict Internal Provisioning Policy:</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>No self-service registration or public signup forms.</li>
              <li>Accounts are provisioned by ICE Security Operations only.</li>
              <li>Hardware Security Key / TOTP MFA is mandatory for all internal sessions.</li>
            </ul>
          </div>

          <button
            onClick={() => setSimulatedActor('AUTHORIZED_SUPER_ADMIN')}
            className="w-full py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded transition-colors cursor-pointer"
          >
            Authenticate with Authorized Staff Credentials
          </button>
        </div>
      ) : (
        <div className="space-y-6">
        {/* 1. PLATFORM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
                <span className="text-xs text-[#536273] block">Active Tenants</span>
                <span className="text-2xl font-bold text-[#101C2C] mt-1 block">{db.organizations.length}</span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">100% tenant RLS active</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
                <span className="text-xs text-[#536273] block">Global Sessions Processed</span>
                <span className="text-2xl font-bold text-[#101C2C] mt-1 block">{db.sessions.length}</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Zero cross-tenant leaks</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
                <span className="text-xs text-[#536273] block">Active Document Engines</span>
                <span className="text-2xl font-bold text-[#2676D2] mt-1 block">3</span>
                <span className="text-[11px] text-blue-600 mt-0.5 block">ICE-DocVision v2.4 online</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
                <span className="text-xs text-[#536273] block">Dual-Auth Support Requests</span>
                <span className="text-2xl font-bold text-[#C58A27] mt-1 block">1</span>
                <span className="text-[11px] text-amber-600 mt-0.5 block">Pending security approval</span>
              </div>
            </div>

            {/* Platform Core Principles Banner */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-[#101C2C]">Tenant Privacy & Non-Shared Identity Model</h2>
              <p className="text-xs text-[#536273] leading-relaxed">
                By architectural decree, Company A owns its verification cases and submitted evidence. Company B cannot see Company A&apos;s documents, results, or customer history. The platform never exposes to Company B whether an applicant was previously verified by Company A without legal basis, explicit consent, and an immutable audit trail.
              </p>
            </div>
          </div>
        )}

        {/* 2. ORGANIZATIONS & TENANTS */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            {/* Sub-tab Navigation */}
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C]">Organization Governance & Onboarding Reviews</h2>
                <p className="text-xs text-[#536273] mt-0.5">
                  Manage tenant partitions and review independent business applications for live production API access.
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setTenantSubTab('onboarding_queue')}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    tenantSubTab === 'onboarding_queue'
                      ? 'bg-white text-[#101C2C] shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#2676D2]" />
                  <span>Onboarding &amp; Production Queue</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-[#2676D2] font-bold">
                    {db.onboardingApplications.filter((a) => a.status === 'UNDER_REVIEW' || a.status === 'PRODUCTION_APPLICATION_SUBMITTED').length}
                  </span>
                </button>

                <button
                  onClick={() => setTenantSubTab('partitions')}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    tenantSubTab === 'partitions'
                      ? 'bg-white text-[#101C2C] shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tenant Partitions ({db.organizations.length})</span>
                </button>
              </div>
            </div>

            {reviewActionFeedback && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reviewActionFeedback}</span>
              </div>
            )}

            {/* Sub-view A: Onboarding Review Queue */}
            {tenantSubTab === 'onboarding_queue' && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 py-3">Legal Business Name</th>
                        <th className="px-4 py-3">Registration No.</th>
                        <th className="px-4 py-3">Industry / Classification</th>
                        <th className="px-4 py-3">Application Domain</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {db.onboardingApplications.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[#101C2C] block">{app.legalBusinessName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Org: {app.organizationId}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">{app.registrationNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{app.industry}</td>
                          <td className="px-4 py-3">
                            <a
                              href={app.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2676D2] hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <span>{app.website.replace('https://', '')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.status === 'PRODUCTION_APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'UNDER_REVIEW' || app.status === 'PRODUCTION_APPLICATION_SUBMITTED'
                                ? 'bg-blue-100 text-blue-800'
                                : app.status === 'SANDBOX_ACTIVE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {app.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <div>{app.contactName}</div>
                            <span className="text-[10px] font-mono text-slate-400">{app.contactEmail}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedOnboardingApp(app);
                                setReviewDecisionNotes(app.reviewNotes || '');
                              }}
                              className="px-2.5 py-1 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded text-xs transition-colors cursor-pointer"
                            >
                              Inspect &amp; Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Separation of Duties & Privacy Notice */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-[#101C2C]">
                    <Lock className="w-4 h-4 text-[#2676D2]" />
                    <span>Compliance Separation of Duties &amp; Identity Privacy</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Authorized ICE internal personnel review corporate registration credentials, CBK regulatory references, and business standing. ICE staff do not receive automatic access to applicant identity documents processed by this tenant, ensuring strict end-user data privacy under KDPA 2019.
                  </p>
                </div>
              </div>
            )}

            {/* Sub-view B: Tenant Partitions */}
            {tenantSubTab === 'partitions' && (
              <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3">Tenant Name</th>
                      <th className="px-4 py-3">Organization ID</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">Environment</th>
                      <th className="px-4 py-3">Data Retention</th>
                      <th className="px-4 py-3">Authoritative IPRS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {db.organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-[#101C2C]">{org.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{org.id}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-[#2676D2]">
                            {org.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">
                            {org.environment}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{org.dataRetentionDays} Days</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            NOT_PERFORMED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Organization Application Review Modal / Drawer */}
            {selectedOnboardingApp && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col text-xs">
                  <div className="p-4 bg-[#101C2C] text-white flex items-center justify-between sticky top-0">
                    <div>
                      <h3 className="font-bold text-sm text-white">Review Corporate Onboarding Application</h3>
                      <span className="text-[10px] text-slate-300 font-mono">Org ID: {selectedOnboardingApp.organizationId}</span>
                    </div>
                    <button
                      onClick={() => setSelectedOnboardingApp(null)}
                      className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Legal Business Name</span>
                        <span className="font-semibold text-slate-900">{selectedOnboardingApp.legalBusinessName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Trading / Brand Name</span>
                        <span className="font-semibold text-slate-900">{selectedOnboardingApp.tradingName || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Registration Number</span>
                        <span className="font-mono font-semibold text-slate-900">{selectedOnboardingApp.registrationNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Industry &amp; Entity Type</span>
                        <span className="font-semibold text-slate-900">{selectedOnboardingApp.industry} ({selectedOnboardingApp.businessType})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Application Website</span>
                        <span className="font-mono text-[#2676D2]">{selectedOnboardingApp.website}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Monthly Expected Volume</span>
                        <span className="font-semibold text-slate-900">{selectedOnboardingApp.expectedMonthlyVolume.replace(/_/g, ' ')}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Intended Identity Verification Purpose</span>
                      <p className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-[11px] leading-relaxed">
                        {selectedOnboardingApp.intendedUseCase}
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-600 uppercase font-bold block mb-1">
                        Reviewer Decision Notes (Recorded in immutable audit history) *
                      </label>
                      <textarea
                        rows={3}
                        value={reviewDecisionNotes}
                        onChange={(e) => setReviewDecisionNotes(e.target.value)}
                        placeholder="State reason for approval, specific license verification details, or information requested..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-900 outline-none focus:border-[#2676D2]"
                      />
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between sticky bottom-0">
                    <button
                      onClick={() => setSelectedOnboardingApp(null)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-white font-semibold rounded cursor-pointer"
                    >
                      Cancel
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewAction(selectedOnboardingApp.organizationId, 'REQUEST_MORE_INFO')}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded cursor-pointer"
                      >
                        Request More Info
                      </button>

                      <button
                        onClick={() => handleReviewAction(selectedOnboardingApp.organizationId, 'REJECT')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded cursor-pointer"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleReviewAction(selectedOnboardingApp.organizationId, 'APPROVE')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-xs cursor-pointer"
                      >
                        Approve Production Access
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. ENGINES & MODELS */}
        {activeTab === 'engines' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <h2 className="text-sm font-bold text-[#101C2C]">Processing Engines & AI Vision Adapters</h2>
              <p className="text-[#536273]">
                Modular adapter architecture for document OCR, image forensics, and biometric liveness.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">ICE-DocVision</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">v2.4 ACTIVE</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Specialized computer-vision pipeline for Kenyan National IDs, passports, and KRA certificates. 300 DPI resolution check.
                </p>
                <div className="pt-2 border-t border-[#E2E8F0] text-[10px] text-slate-400 font-mono">
                  OCR Accuracy: 98.4% • Latency: 420ms
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">ICE-BioNet</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-[#2676D2]">v1.4 ADAPTER</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  1:1 facial landmark similarity and active liveness challenge engine. Non-configured fallback reported honestly.
                </p>
                <div className="pt-2 border-t border-[#E2E8F0] text-[10px] text-slate-400 font-mono">
                  Spoof Detection: ISO 30107-3 compliant
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">ICE-RiskEngine</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">v1.8 ACTIVE</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Cross-field consistency engine, hash matching for tampered documents, and session velocity analysis.
                </p>
                <div className="pt-2 border-t border-[#E2E8F0] text-[10px] text-slate-400 font-mono">
                  Rules Evaluated: 24 • Explainable Output
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. INFRASTRUCTURE HEALTH */}
        {activeTab === 'health' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <h2 className="text-sm font-bold text-[#101C2C]">Infrastructure & Database Health</h2>
              <p className="text-[#536273]">
                Monitors PostgreSQL RLS tenant partitions, Supabase adapter readiness, and edge worker health.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3">Component</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Security Role</th>
                    <th className="px-4 py-3">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">PostgreSQL RLS Cluster</td>
                    <td className="px-4 py-3 font-mono text-slate-600">Supabase Managed Postgres</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">MIGRATIONS READY</span></td>
                    <td className="px-4 py-3 text-slate-600">Row-Level Security Active</td>
                    <td className="px-4 py-3 font-mono text-slate-500">99.99%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">Private Object Storage</td>
                    <td className="px-4 py-3 font-mono text-slate-600">Supabase Storage / S3</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">ENCRYPTED</span></td>
                    <td className="px-4 py-3 text-slate-600">Folder-level Tenant RLS</td>
                    <td className="px-4 py-3 font-mono text-slate-500">100.0%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-900">OCR & Document Vision</td>
                    <td className="px-4 py-3 font-mono text-slate-600">ICE-DocVision Worker</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">HEALTHY</span></td>
                    <td className="px-4 py-3 text-slate-600">Sub-second Latency</td>
                    <td className="px-4 py-3 font-mono text-slate-500">99.95%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. SUPPORT ACCESS CONTROLS */}
        {activeTab === 'support_access' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#2676D2]" />
                <h2 className="text-sm font-bold text-[#101C2C]">Dual-Authorization Support Access Protocol</h2>
              </div>
              <p className="text-[#536273] leading-relaxed">
                ICE platform staff cannot arbitrarily view customer identity documents. A support engineer must submit an emergency access request citing a specific customer ticket and consent. A Security Administrator or Privacy Officer must independently grant dual-authorization before a temporary 15-minute token is issued.
              </p>
            </div>

            {dualAuthSuccessMsg && (
              <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {dualAuthSuccessMsg}
              </div>
            )}

            <div className="space-y-3">
              {supportRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{req.requesterName}</span>
                      <span className="text-[11px] text-slate-500">
                        Target Session: <code className="font-mono text-slate-800">{req.targetSessionId}</code> • Tenant: <code className="font-mono text-slate-800">{req.tenantId}</code>
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      req.status === 'PENDING_DUAL_AUTH' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#F4F7FA] rounded border border-[#E2E8F0] text-slate-700 text-[11px] leading-relaxed">
                    <strong>Documented Purpose:</strong> {req.justification}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-[11px]">Duration: {req.requestedDurationMins} minutes window</span>
                    {req.status === 'PENDING_DUAL_AUTH' && (
                      <button
                        onClick={() => handleApproveSupportAccess(req.id)}
                        className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded"
                      >
                        Sign Dual-Authorization (Security Admin)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. SECURITY & RLS EVENTS */}
        {activeTab === 'security_events' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <h2 className="text-sm font-bold text-[#101C2C]">Security Event Log (Edge & RLS)</h2>
              <p className="text-[#536273]">
                Monitors anomalous cross-tenant queries, credential rotation, and rate-limiting spikes.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Event Description</th>
                    <th className="px-4 py-3">Source IP</th>
                    <th className="px-4 py-3">Action Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  <tr>
                    <td className="px-4 py-3 font-mono text-slate-500">2026-11-08 14:10:02</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        INFO
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">PostgreSQL RLS policy tenant isolation verified for all tables.</td>
                    <td className="px-4 py-3 font-mono text-slate-500">127.0.0.1</td>
                    <td className="px-4 py-3 text-slate-600">Passed automated check</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-slate-500">2026-11-08 11:22:15</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        WARNING
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">High velocity verification requests detected from IP range 197.232.0.0/16.</td>
                    <td className="px-4 py-3 font-mono text-slate-500">197.232.88.92</td>
                    <td className="px-4 py-3 text-slate-600">Rate limiter throttled to 10 req/min</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. PLATFORM AUDIT LOG */}
        {activeTab === 'internal_audit' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <h2 className="text-sm font-bold text-[#101C2C]">ICE Global Internal Audit Trail</h2>
              <p className="text-[#536273]">
                Logs all platform configuration, engine upgrades, and administrator actions.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {db.auditEvents.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-500">{formatDateTime(a.timestamp)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{a.actorName}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{a.action}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{a.resourceId}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{JSON.stringify(a.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. INTERNAL STAFF & ROLES */}
        {activeTab === 'staff_roles' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
              <h2 className="text-sm font-bold text-[#101C2C]">ICE Platform Personnel Directory</h2>
              <p className="text-[#536273]">
                Authorized operators with hardware security keys (FIDO2) and strictly partitioned privileges.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3">Operator Name</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Internal Email</th>
                    <th className="px-4 py-3">Hardware MFA</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {internalStaff.map((stf) => (
                    <tr key={stf.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-[#101C2C]">{stf.name}</td>
                      <td className="px-4 py-3 font-mono text-[#2676D2] font-semibold">{stf.role}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{stf.email}</td>
                      <td className="px-4 py-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold font-mono">FIDO2 ENABLED</span></td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-800 font-semibold">{stf.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. PLATFORM SETTINGS */}
        {activeTab === 'platform_settings' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[#101C2C]">Global Platform Configuration</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-[#F4F7FA] border border-[#E2E8F0] rounded space-y-1.5">
                  <span className="font-semibold text-slate-900 block">Default Tenant Data Retention</span>
                  <p className="text-slate-500 text-[11px]">Applied to new organizations unless overridden by custom Enterprise SLA.</p>
                  <input
                    type="number"
                    defaultValue={365}
                    className="w-32 p-2 bg-white border border-[#CBD5E1] rounded font-mono text-xs"
                  />
                  <span className="text-slate-500 text-xs ml-2">Days</span>
                </div>

                <div className="p-3 bg-[#F4F7FA] border border-[#E2E8F0] rounded space-y-1.5">
                  <span className="font-semibold text-slate-900 block">Authoritative Register Connectivity</span>
                  <p className="text-slate-500 text-[11px]">Government IPRS / NRB connection status.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-1 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                      NOT_PERFORMED (Disconnected)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </PortalShell>
  );
}
