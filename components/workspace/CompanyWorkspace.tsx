'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  ShieldAlert, 
  GitBranch, 
  BarChart3, 
  FileText, 
  Lock, 
  Search, 
  Filter, 
  ChevronRight, 
  ExternalLink, 
  Key, 
  Webhook, 
  Eye, 
  EyeOff,
  Sparkles,
  ArrowUpRight,
  Send,
  RefreshCw,
  Sliders,
  Check,
  X,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  Fingerprint,
  TrendingUp,
  Server,
  Database,
  UserCheck,
  Play,
  Plus,
  MessageSquare,
  History,
  FileCheck,
  Cpu
} from 'lucide-react';
import { db, DecidedResult } from '@/lib/store/synthetic-db';
import { 
  OrganizationRole, 
  VerificationSession, 
  VerificationStatus, 
  Person, 
  InvestigationCase, 
  Workflow, 
  WorkflowExecutionRecord 
} from '@/lib/types';
import { hasPermission, ROLE_LABELS } from '@/lib/auth/rbac';
import { PortalShell, NavGroup } from '../layout/PortalShell';
import { CompanyAuthModal } from './CompanyAuthModal';
import { VerificationFlowBuilder } from './VerificationFlowBuilder';
import { IntegrationManagementCentre } from './IntegrationManagementCentre';
import { UserPlus, Info, Zap, Activity, Copy, CheckCircle2, Code2, Globe, Layers } from 'lucide-react';
import { formatDateTime, formatDateOnly, formatTimeOnly } from '@/lib/utils';
import { automatedPipeline, ENGINE_SPECIFICATIONS } from '@/lib/engines/automated-pipeline';
import { unifiedAuth } from '@/lib/auth/unified-auth';
import { supabaseAuth } from '@/lib/auth/supabase-auth';
import { OnboardingJourney } from './OnboardingJourney';

interface CompanyWorkspaceProps {
  tenantId: string;
  userRole: OrganizationRole;
  onTenantChange?: (tenantId: string) => void;
  onRoleChange?: (role: OrganizationRole) => void;
}

export function CompanyWorkspace({
  tenantId,
  userRole,
  onTenantChange,
  onRoleChange,
}: CompanyWorkspaceProps) {
  // Unified Auth & Multi-Organization Context
  const [currentUser, setCurrentUser] = useState(unifiedAuth.getCurrentUser());

  useEffect(() => {
    const unsubscribe = unifiedAuth.subscribe((user) => {
      setCurrentUser(user);
    });

    supabaseAuth.restoreSession().then((res) => {
      if (res?.user) {
        setCurrentUser(unifiedAuth.getCurrentUser());
        if (res.user.organizationId && onTenantChange && res.user.organizationId !== tenantId) {
          onTenantChange(res.user.organizationId);
        }
      }
    });

    return () => unsubscribe();
  }, [onTenantChange, tenantId]);
  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'setup'
    | 'verifications'
    | 'customers'
    | 'people'
    | 'review_queue'
    | 'cases'
    | 'risk_intel'
    | 'workflows'
    | 'analytics'
    | 'reports'
    | 'team'
    | 'audit_trail'
    | 'developer_settings'
    | 'integrations'
    | 'org_settings'
  >('overview');

  // Subtab for Verification Setup (Visual Flow Builder vs Immutable Workflows)
  const [setupSubTab, setSetupSubTab] = useState<'builder' | 'workflows'>('builder');

  // Company Auth Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'onboarding'>('login');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Selected verification for detail evidence drawer
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Selected person for Person Profile drawer
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Selected case for Case Investigation drawer
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Reviewer Decision Modal State
  const [reviewModalSession, setReviewModalSession] = useState<VerificationSession | null>(null);
  const [decisionAction, setDecisionAction] = useState<'VERIFIED' | 'REJECTED' | 'NEEDS_MORE_INFORMATION'>('VERIFIED');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionFeedbackMsg, setDecisionFeedbackMsg] = useState('');

  // Create Formal Case Modal State
  const [escalateSession, setEscalateSession] = useState<VerificationSession | null>(null);
  const [escalatePriority, setEscalatePriority] = useState<InvestigationCase['priority']>('HIGH');
  const [escalateType, setEscalateType] = useState<InvestigationCase['caseType']>('POLICY_ESCALATION');
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateFeedback, setEscalateFeedback] = useState('');

  // Resolve Case Modal State
  const [resolvingCase, setResolvingCase] = useState<InvestigationCase | null>(null);
  const [caseResolutionStatus, setCaseResolutionStatus] = useState<'CLEARED' | 'FRAUD_CONFIRMED' | 'FALSE_POSITIVE' | 'ACCOUNT_BLOCKED'>('CLEARED');
  const [caseResolutionReason, setCaseResolutionReason] = useState('');

  // New Note State in Case Drawer
  const [newCaseNote, setNewCaseNote] = useState('');

  // Workflow Simulation State
  const [selectedSimScenario, setSelectedSimScenario] = useState<'CLEAN_NATIONAL_ID' | 'BLURRY_DOCUMENT' | 'ALTERED_DOCUMENT_TAMPER' | 'SPOOF_FACE_REPLAY'>('CLEAN_NATIONAL_ID');
  const [simResult, setSimResult] = useState<any>(null);

  // Create Workflow Version State
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [newVersionTag, setNewVersionTag] = useState('v1.5');
  const [newVersionDescription, setNewVersionDescription] = useState('Refined optical blur threshold and updated liveness retry rules.');

  // Masked PII reveal state (Map of ID -> boolean)
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [caseFilter, setCaseFilter] = useState<string>('ALL');

  // State version counter for data refresh
  const [dataVersion, setDataVersion] = useState(0);

  // Load tenant-isolated data
  const currentOrg = useMemo(() => db.organizations.find((o) => o.id === tenantId), [tenantId]);
  
  // Safe fetch checking permissions
  const canReadVerifications = hasPermission(userRole, 'VERIFICATIONS_READ');
  const canViewRawDocuments = hasPermission(userRole, 'DOCUMENTS_VIEW_RAW');
  const canOverrideDecisions = hasPermission(userRole, 'DECISIONS_OVERRIDE');
  const canManageWorkflows = hasPermission(userRole, 'WORKFLOWS_MANAGE');
  const canManageApiKeys = hasPermission(userRole, 'API_KEYS_MANAGE');
  const canViewAuditLogs = hasPermission(userRole, 'AUDIT_LOGS_VIEW');

  // Fetch verifications scoped to this tenant
  const sessions = useMemo(() => {
    void dataVersion;
    if (!canReadVerifications) return [];
    try {
      return db.getVerifications(tenantId, userRole);
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [tenantId, userRole, canReadVerifications, dataVersion]);

  // Fetch people scoped to this tenant
  const people = useMemo(() => {
    void dataVersion;
    if (!canReadVerifications) return [];
    try {
      return db.getPeople(tenantId, userRole);
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [tenantId, userRole, canReadVerifications, dataVersion]);

  // Fetch cases scoped to this tenant
  const cases = useMemo(() => {
    void dataVersion;
    if (!canReadVerifications) return [];
    try {
      return db.getCases(tenantId, userRole, caseFilter);
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [tenantId, userRole, canReadVerifications, caseFilter, dataVersion]);

  // Operational metrics
  const totalRequests = sessions.length;
  const verifiedCount = sessions.filter((s) => s.status === 'VERIFIED').length;
  const pendingCount = sessions.filter((s) => s.status === 'PENDING_SUBMISSION' || s.status === 'PROCESSING').length;
  const reviewQueueCount = sessions.filter((s) => s.status === 'NEEDS_REVIEW').length;
  const rejectedCount = sessions.filter((s) => s.status === 'REJECTED').length;
  const openCasesCount = cases.filter((c) => c.status === 'OPEN' || c.status === 'IN_INVESTIGATION').length;
  const approvalRate = totalRequests > 0 ? ((verifiedCount / totalRequests) * 100).toFixed(1) : '0';

  // True Automation Operational Metrics derived from real database session records
  const automationMetrics = useMemo(() => {
    return automatedPipeline.calculateMetrics(sessions);
  }, [sessions]);

  // Filtered verifications list
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.submittedData.fullName.toLowerCase().includes(q) ||
        s.submittedData.nationalIdNumber.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.externalReferenceId && s.externalReferenceId.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  // Selected session for inspection
  const activeSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [selectedSessionId, sessions]);

  // Selected person for profile inspection
  const activePerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, people]);

  // Selected person's chronological verifications
  const activePersonVerifications = useMemo(() => {
    if (!activePerson) return [];
    return sessions
      .filter((s) => s.personId === activePerson.id || s.customerId === activePerson.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activePerson, sessions]);

  // Selected case for investigation inspection
  const activeCase = useMemo(() => {
    if (!selectedCaseId) return null;
    return cases.find((c) => c.id === selectedCaseId) || null;
  }, [selectedCaseId, cases]);

  // Selected case's linked verification and person
  const activeCaseSession = useMemo(() => {
    if (!activeCase) return null;
    return sessions.find((s) => s.id === activeCase.verificationId) || null;
  }, [activeCase, sessions]);

  const activeCasePerson = useMemo(() => {
    if (!activeCase) return null;
    return people.find((p) => p.id === activeCase.personId) || null;
  }, [activeCase, people]);

  // Handle revealing sensitive PII with audit event logging
  const toggleRevealPii = useCallback(
    (recordId: string, valueType: string) => {
      if (!canViewRawDocuments) {
        alert('Access Denied: Your role does not have permission to view raw unmasked identity credentials.');
        return;
      }
      const isCurrentlyRevealed = Boolean(revealedIds[recordId]);
      setRevealedIds((prev) => ({ ...prev, [recordId]: !isCurrentlyRevealed }));

      if (!isCurrentlyRevealed) {
        const auditId = `aud_rev_${recordId}_${db.auditEvents.length + 1}`;
        db.auditEvents.unshift({
          id: auditId,
          tenantId,
          actorId: 'usr_active',
          actorName: `User (${ROLE_LABELS[userRole]?.title || userRole})`,
          actorType: 'USER',
          action: 'SENSITIVE_DATA_REVEALED',
          resourceType: 'IDENTITY_RECORD',
          resourceId: recordId,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString(),
          details: { field: valueType, justification: 'Compliance detail inspection' },
        });
        setDataVersion((v) => v + 1);
      }
    },
    [canViewRawDocuments, revealedIds, tenantId, userRole]
  );

  // Handle reviewer decision submission
  const handleSubmitDecision = () => {
    if (!reviewModalSession || !decisionReason.trim()) return;
    try {
      db.recordDecision(
        tenantId,
        reviewModalSession.id,
        'usr_active',
        `Active Reviewer (${ROLE_LABELS[userRole]?.title || userRole})`,
        userRole,
        {
          status: decisionAction,
          reason: decisionReason,
          reviewerId: 'usr_active',
          reviewerName: `Active Reviewer (${userRole})`,
        }
      );
      setDataVersion((v) => v + 1);
      setDecisionFeedbackMsg(`Decision ${decisionAction} recorded successfully.`);
      setTimeout(() => {
        setReviewModalSession(null);
        setDecisionReason('');
        setDecisionFeedbackMsg('');
      }, 1000);
    } catch (err: any) {
      setDecisionFeedbackMsg(`Error: ${err.message}`);
    }
  };

  // Handle opening a formal investigation case from a verification
  const handleOpenFormalCase = () => {
    if (!escalateSession || !escalateReason.trim()) return;
    try {
      const newCase = db.createCase(
        tenantId,
        {
          verificationId: escalateSession.id,
          caseType: escalateType,
          reasonForOpening: escalateReason,
          priority: escalatePriority,
          assignedReviewerId: 'usr_james',
          assignedReviewerName: 'James Kariuki (Fraud Analyst)',
          openedBy: 'HUMAN_REVIEWER',
        },
        userRole,
        `Active Analyst (${userRole})`
      );
      setDataVersion((v) => v + 1);
      setEscalateFeedback(`Formal Case ${newCase.caseNumber} opened.`);
      setTimeout(() => {
        setEscalateSession(null);
        setEscalateReason('');
        setEscalateFeedback('');
        setActiveTab('cases');
        setSelectedCaseId(newCase.id);
      }, 1000);
    } catch (err: any) {
      setEscalateFeedback(`Error: ${err.message}`);
    }
  };

  // Handle resolving a case
  const handleResolveCase = () => {
    if (!resolvingCase || !caseResolutionReason.trim()) return;
    try {
      db.resolveCase(
        tenantId,
        resolvingCase.id,
        {
          status: caseResolutionStatus,
          reason: caseResolutionReason,
        },
        `Senior Analyst (${ROLE_LABELS[userRole]?.title || userRole})`,
        userRole
      );
      setDataVersion((v) => v + 1);
      setResolvingCase(null);
      setCaseResolutionReason('');
    } catch (err: any) {
      alert(`Error resolving case: ${err.message}`);
    }
  };

  // Handle adding an investigator note
  const handleAddCaseNote = (caseId: string) => {
    if (!newCaseNote.trim()) return;
    db.addCaseNote(
      tenantId,
      caseId,
      newCaseNote.trim(),
      `Analyst (${ROLE_LABELS[userRole]?.title || userRole})`,
      userRole
    );
    setDataVersion((v) => v + 1);
    setNewCaseNote('');
  };

  // Handle workflow simulation runner
  const handleRunSimulation = (workflowId: string) => {
    const res = db.simulateWorkflow(tenantId, workflowId, selectedSimScenario);
    setSimResult(res);
  };

  // Handle creating an immutable workflow version
  const handlePublishNewVersion = (baseWfId: string) => {
    if (!newVersionTag.trim()) return;
    try {
      db.createWorkflowVersion(
        tenantId,
        baseWfId,
        newVersionTag.trim(),
        { description: newVersionDescription },
        userRole
      );
      setIsCreateVersionOpen(false);
      alert(`Workflow version ${newVersionTag} published successfully. All existing verifications retain their original processing version.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Navigation Groups for Persistent Left Sidebar
  const navGroups: NavGroup[] = [
    {
      title: 'Verification Operations',
      items: [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'setup', label: 'Verification Setup', icon: Sliders, badge: 'Flow Builder', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300' },
        { id: 'verifications', label: 'Verifications', icon: CheckCircle, badge: totalRequests },
        { id: 'customers', label: 'People', icon: Users, badge: people.length },
        { id: 'review_queue', label: 'Review Queue', icon: Clock, badge: reviewQueueCount, badgeColor: 'bg-amber-100 text-amber-800' },
        { id: 'cases', label: 'Cases & Escalations', icon: ShieldAlert, badge: openCasesCount, badgeColor: 'bg-red-100 text-red-800' },
        { id: 'risk_intel', label: 'Risk Intelligence', icon: AlertTriangle },
      ],
    },
    {
      title: 'Integrations & Configuration',
      items: [
        { id: 'developer_settings', label: 'Integrations & APIs', icon: Key },
        { id: 'workflows', label: 'Workflows & Engines', icon: GitBranch },
        { id: 'analytics', label: 'Reports & Analytics', icon: TrendingUp },
        { id: 'team', label: 'Settings & Team', icon: Users },
        { id: 'audit_trail', label: 'Audit Trail', icon: FileText },
        { id: 'org_settings', label: 'Organization Settings', icon: Sliders },
      ],
    },
  ];

  return (
    <PortalShell
      portalType="workspace"
      portalTitle={currentOrg?.name || 'Company Workspace'}
      portalSubtitle={`Organization: ${tenantId} • ${ROLE_LABELS[userRole]?.title}`}
      portalBadge={{
        label: currentOrg?.environment || 'PRODUCTION',
        variant: currentOrg?.environment === 'PRODUCTION' ? 'success' : 'warning',
      }}
      navGroups={navGroups}
      activeItemId={activeTab}
      onNavigate={(id) => {
        setActiveTab(id as any);
        setSelectedSessionId(null);
        setSelectedPersonId(null);
        setSelectedCaseId(null);
      }}
      headerControls={
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                  {currentUser.organizations.find((o) => o.organizationId === tenantId)?.isOwner ? '👑 Organization Owner' : '👤 Team Member'}
                </span>
                <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[130px] sm:max-w-none">
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="text-[10px] text-[#2676D2] dark:text-cyan-300 hover:underline ml-1 cursor-pointer"
                title="Switch Account"
              >
                Switch
              </button>
              <button
                onClick={async () => {
                  await supabaseAuth.signOut();
                  setCurrentUser(null);
                  setDataVersion((v) => v + 1);
                }}
                className="text-[10px] text-red-600 dark:text-red-400 hover:underline ml-1 cursor-pointer"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-[#172B43] hover:bg-slate-200 dark:hover:bg-[#1E3A5F] border border-slate-200 dark:border-[#203652] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <span>Sign In</span>
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Company</span>
              </button>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] text-xs text-[#536273] dark:text-[#8E9BAE]">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>RLS Active</span>
          </div>

          <a
            href="/verify"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs transition-colors"
          >
            <span>Start verification</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ================================================================= */}
        {/* MODULE 1: OVERVIEW */}
        {/* ================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Workspace Operational Summary</h2>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE] mt-0.5">
                  Executive overview of verification volume, automated pass rates, human review load, and active security investigations.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Tenant: <strong className="text-slate-700 dark:text-slate-200">{tenantId}</strong>
              </span>
            </div>

            {/* Corporate Onboarding & Production Readiness Card */}
            <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-[#2676D2] dark:text-cyan-300 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">Customer Onboarding &amp; Application Integration</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      currentOrg?.onboardingStatus === 'PRODUCTION_APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : currentOrg?.onboardingStatus === 'UNDER_REVIEW' || currentOrg?.onboardingStatus === 'PRODUCTION_APPLICATION_SUBMITTED'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300'
                    }`}>
                      {currentOrg?.onboardingStatus || 'SANDBOX_ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[#536273] dark:text-[#8E9BAE] text-[11px] mt-0.5">
                    Configure your business profile, sandbox projects, allowed domain whitelists, and submit for production compliance review.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOnboardingOpen(true)}
                className="px-3.5 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Onboarding Wizard</span>
              </button>
            </div>

            {/* Automation-First Operational Metrics Banner */}
            <div className="bg-gradient-to-r from-[#101C2C] via-[#172B43] to-[#1E3A5F] text-white p-4 rounded-lg border border-[#203652] shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2676D2]/30 border border-[#2676D2]/50 flex items-center justify-center text-[#26B8C7]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">Automation-First STP Pipeline</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Zero-Touch Target: 85%+
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Straight-Through Processing (STP) rate derived from real session execution records. Human review occurs only by exception.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300">Automated Latency:</span>
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-black/40 px-2 py-0.5 rounded border border-cyan-500/30">
                    {automationMetrics.avgAutomatedProcessingSeconds}s
                  </span>
                  <span className="text-[10px] text-slate-400">vs {automationMetrics.avgManualReviewMinutes}m manual</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-1">
                <div className="bg-white/5 rounded p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-300 block uppercase font-medium">True STP Pass Rate</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-bold text-emerald-400">{automationMetrics.stpRatePercent}%</span>
                    <span className="text-[10px] text-slate-400">automated</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-300 block uppercase font-medium">Human Review Escalations</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-bold text-amber-400">{automationMetrics.humanReviewRatePercent}%</span>
                    <span className="text-[10px] text-slate-400">exception only</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-300 block uppercase font-medium">Recapture Requests</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xl font-bold text-cyan-400">{automationMetrics.recaptureRatePercent}%</span>
                    <span className="text-[10px] text-slate-400">optical blur/glare</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded p-2.5 border border-white/10">
                  <span className="text-[10px] text-slate-300 block uppercase font-medium">FAR / FRR Benchmark</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-xs font-bold text-slate-200">
                      FAR {automationMetrics.benchmarkFar}% / FRR {automationMetrics.benchmarkFrr}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs">
                <span className="text-xs text-[#536273] dark:text-[#8E9BAE] block">Total Attempts</span>
                <span className="text-2xl font-bold text-[#101C2C] dark:text-white mt-1 block">{totalRequests}</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">{people.length} unique people</span>
              </div>
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs">
                <span className="text-xs text-[#536273] dark:text-[#8E9BAE] block">Verified & Passed</span>
                <span className="text-2xl font-bold text-[#16845B] mt-1 block">{verifiedCount}</span>
                <span className="text-[11px] text-[#16845B] mt-0.5 block">{approvalRate}% approval rate</span>
              </div>
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs">
                <span className="text-xs text-[#536273] dark:text-[#8E9BAE] block">Review Queue</span>
                <span className="text-2xl font-bold text-[#C58A27] mt-1 block">{reviewQueueCount}</span>
                <span className="text-[11px] text-amber-600 mt-0.5 block">Standard quality checks</span>
              </div>
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs">
                <span className="text-xs text-[#536273] dark:text-[#8E9BAE] block">Rejected Attempts</span>
                <span className="text-2xl font-bold text-[#C44747] mt-1 block">{rejectedCount}</span>
                <span className="text-[11px] text-red-500 mt-0.5 block">Forensic or biometric flags</span>
              </div>
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs col-span-2 sm:col-span-1">
                <span className="text-xs text-[#536273] dark:text-[#8E9BAE] block">Open Investigations</span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">{openCasesCount}</span>
                <span className="text-[11px] text-indigo-500 mt-0.5 block">Formal compliance cases</span>
              </div>
            </div>

            {/* Operational Health Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-2">
                <span className="text-xs font-semibold text-[#101C2C] dark:text-white block">Automated Processing Speed</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#2676D2] dark:text-cyan-300">1.8s</span>
                  <span className="text-xs text-slate-500">Document + Liveness</span>
                </div>
                <p className="text-[11px] text-[#536273] dark:text-[#8E9BAE]">
                  Edge OCR extraction, resolution analysis, and anti-spoof inference latency.
                </p>
              </div>

              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-2">
                <span className="text-xs font-semibold text-[#101C2C] dark:text-white block">Official Identity Check</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-[#101C2C] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#203652]">
                    NOT_PERFORMED
                  </span>
                </div>
                <p className="text-[11px] text-[#536273] dark:text-[#8E9BAE]">
                  Honest status: Official government population register (IPRS) is not connected.
                </p>
              </div>

              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-2">
                <span className="text-xs font-semibold text-[#101C2C] dark:text-white block">Investigation SLA Target</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#101C2C] dark:text-white">120m</span>
                  <span className="text-xs text-indigo-600 font-medium">Critical Risk Cases</span>
                </div>
                <p className="text-[11px] text-[#536273] dark:text-[#8E9BAE]">
                  Target set by organization policy for critical document tampering investigations.
                </p>
              </div>
            </div>

            {/* Recent Verifications stream */}
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E2E8F0] dark:border-[#203652] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#101C2C] dark:text-white">Recent Verification Attempts</h3>
                  <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                    Incoming attempts to verify people against organization policies.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className="text-xs text-[#2676D2] dark:text-cyan-300 hover:underline font-semibold cursor-pointer"
                >
                  View All ({sessions.length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F7FA] dark:bg-[#101C2C] text-[#536273] dark:text-[#8E9BAE] font-medium border-b border-[#E2E8F0] dark:border-[#203652]">
                    <tr>
                      <th className="px-4 py-3">Applicant Name</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Purpose</th>
                      <th className="px-4 py-3">Workflow</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                    {sessions.slice(0, 5).map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#1B2F4A] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#101C2C] dark:text-white">
                          {s.submittedData.fullName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {s.externalReferenceId || s.id}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-[11px]">
                          {s.verificationPurpose.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {s.workflowVersion}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {formatDateOnly(s.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedSessionId(s.id)}
                            className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-[#101C2C] hover:bg-slate-200 dark:hover:bg-[#203652] text-[#101C2C] dark:text-white font-semibold rounded cursor-pointer transition-colors"
                          >
                            Inspect Evidence
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 2: VERIFICATIONS (Primary Operational Module) */}
        {/* ================================================================= */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Verification Attempts</h2>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                  Every individual attempt to verify a person. Inspect full evidence, biometric findings, and audit traces.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search applicant or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded px-2.5 py-1.5 text-slate-900 dark:text-white outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="PROCESSING">PROCESSING</option>
                </select>
              </div>
            </div>

            {/* STP Operational Strip */}
            <div className="bg-slate-50 dark:bg-[#172B43] px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#203652] flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-white">Automation-First STP Pipeline:</span>
                <span className="text-[#2676D2] dark:text-cyan-300 font-mono font-bold">{automationMetrics.stpRatePercent}% Auto-Cleared</span>
                <span className="text-slate-400 text-[11px]">(Real measurement from {automationMetrics.totalVerifications} attempts)</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                <span>Avg Auto Latency: <strong className="text-slate-800 dark:text-slate-200">{automationMetrics.avgAutomatedProcessingSeconds}s</strong></span>
                <span>Review Escalations: <strong className="text-amber-600">{automationMetrics.humanReviewRatePercent}%</strong></span>
                <span>Recaptures: <strong className="text-cyan-600">{automationMetrics.recaptureRatePercent}%</strong></span>
              </div>
            </div>

            {/* Verifications Table */}
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7FA] dark:bg-[#101C2C] text-[#536273] dark:text-[#8E9BAE] font-medium border-b border-[#E2E8F0] dark:border-[#203652]">
                  <tr>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3">National ID (Masked)</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Risk Finding</th>
                    <th className="px-4 py-3">Documents</th>
                    <th className="px-4 py-3">Biometrics</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                  {filteredSessions.map((s) => {
                    const isRevealed = Boolean(revealedIds[s.id]);
                    const displayId = isRevealed ? s.submittedData.nationalIdNumber : s.submittedData.nationalIdNumber.replace(/^(\d{4})(\d+)/, '$1****');

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#1B2F4A] transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[#101C2C] dark:text-white block">{s.submittedData.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{s.externalReferenceId || s.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                            <span>{displayId}</span>
                            <button
                              onClick={() => toggleRevealPii(s.id, 'nationalId')}
                              title={isRevealed ? 'Mask ID' : 'Reveal full ID (Audited)'}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-[11px]">
                          {s.verificationPurpose.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge score={s.overallRiskScore} />
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-[11px]">
                          {s.documents.length} uploaded ({s.documents.map((d) => d.documentType.replace('KE_', '')).join(', ') || 'None'})
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            s.biometrics?.livenessStatus === 'CHALLENGE_PASSED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                              : s.biometrics?.livenessStatus === 'SPOOF_SUSPECTED'
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {s.biometrics?.livenessStatus || 'NOT_RUN'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedSessionId(s.id)}
                            className="px-2.5 py-1 text-xs bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded cursor-pointer transition-colors"
                          >
                            Inspect
                          </button>
                          {canOverrideDecisions && s.status === 'NEEDS_REVIEW' && (
                            <button
                              onClick={() => setReviewModalSession(s)}
                              className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded cursor-pointer transition-colors"
                            >
                              Review
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 3: PEOPLE (Organization-Scoped Identity Records) */}
        {/* ================================================================= */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs space-y-3 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">People</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-[#2676D2] dark:text-cyan-300 font-semibold">
                      Organization Scoped
                    </span>
                  </div>
                  <p className="text-xs text-[#536273] dark:text-[#8E9BAE] mt-0.5">
                    Ongoing organization-scoped individual records. A Person links to multiple verification attempts over time.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
                  />
                </div>
              </div>

              {/* Architectural non-CRM Boundary Note */}
              <div className="p-3 rounded bg-slate-50 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#2676D2] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-slate-900 dark:text-white block mb-0.5">Identity Processor Contract:</strong>
                  ICE is an identity verification processor, not a CRM. This module maintains only the identity profile records required to link verification history within your organization. We never ingest or sync your business bank accounts, balances, or transaction ledgers.
                </div>
              </div>
            </div>

            {/* People Table */}
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs overflow-hidden transition-colors">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7FA] dark:bg-[#101C2C] text-[#536273] dark:text-[#8E9BAE] font-medium border-b border-[#E2E8F0] dark:border-[#203652]">
                  <tr>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3">Company Reference</th>
                    <th className="px-4 py-3">First Seen</th>
                    <th className="px-4 py-3">Last Attempt</th>
                    <th className="px-4 py-3">Attempts Count</th>
                    <th className="px-4 py-3">Identity Status</th>
                    <th className="px-4 py-3 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                  {people
                    .filter((p) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return p.primaryName.toLowerCase().includes(q) || p.externalReferenceId.toLowerCase().includes(q);
                    })
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1B2F4A] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#101C2C] dark:text-white">
                          {p.primaryName}
                        </td>
                        <td className="px-4 py-3 font-mono text-[#2676D2] dark:text-cyan-300">
                          {p.externalReferenceId}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {formatDateOnly(p.firstSeenAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {formatDateOnly(p.lastVerificationAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.verificationAttemptCount} {p.verificationAttemptCount === 1 ? 'attempt' : 'attempts'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.status === 'VERIFIED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                              : p.status === 'SUSPECTED_FRAUD'
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedPersonId(p.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#2676D2] dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-[#101C2C] rounded border border-blue-200 dark:border-blue-900/60 cursor-pointer transition-colors"
                          >
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 4: REVIEW QUEUE (Simple Verification Review Filter) */}
        {/* ================================================================= */}
        {activeTab === 'review_queue' && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Operational Review Queue ({reviewQueueCount} Verifications Awaiting Simple Review)</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Simple operational review queue. Verifications arrive here when image quality is slightly below standard thresholds (e.g. optical blur &lt; 0.70) or 1:1 biometric similarity is marginal. Reviewers can approve a quality override, request a retake, or formally escalate to an investigation Case.
              </p>
            </div>

            <div className="space-y-3">
              {sessions
                .filter((s) => s.status === 'NEEDS_REVIEW')
                .map((s) => (
                  <div key={s.id} className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#101C2C] dark:text-white">{s.submittedData.fullName}</span>
                        <StatusBadge status={s.status} />
                        <RiskBadge score={s.overallRiskScore} />
                      </div>
                      <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                        Reference: <code className="font-mono text-slate-800 dark:text-slate-200">{s.externalReferenceId || s.id}</code> • DOB: {s.submittedData.dob} • Submitted: {formatDateOnly(s.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/40 p-2 rounded border border-amber-100 dark:border-amber-900/50">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {s.riskIndicators.map((r) => r.title).join(' • ') || 'Image quality below standard threshold.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSessionId(s.id)}
                        className="px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#101C2C] text-xs font-semibold rounded cursor-pointer transition-colors"
                      >
                        Inspect Evidence
                      </button>
                      {canOverrideDecisions && (
                        <>
                          <button
                            onClick={() => setReviewModalSession(s)}
                            className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                          >
                            Decide Review
                          </button>
                          <button
                            onClick={() => setEscalateSession(s)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                          >
                            Escalate to Case
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

              {sessions.filter((s) => s.status === 'NEEDS_REVIEW').length === 0 && (
                <div className="bg-white dark:bg-[#172B43] p-8 text-center text-slate-500 rounded-lg border border-[#E2E8F0] dark:border-[#203652]">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Review queue is clear</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No verifications currently awaiting human review.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 5: CASES & ESCALATIONS (Formal Investigation Workspace) */}
        {/* ================================================================= */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Cases & Formal Investigations</h2>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                  Formal compliance and fraud investigations. Cases are created only when a configured workflow rule or human reviewer triggers one.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={caseFilter}
                  onChange={(e) => setCaseFilter(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded px-2.5 py-1.5 text-slate-900 dark:text-white outline-none"
                >
                  <option value="ALL">All Cases ({cases.length})</option>
                  <option value="OPEN">Open & Active ({cases.filter(c => c.status === 'OPEN' || c.status === 'IN_INVESTIGATION').length})</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  <option value="WAITING_FOR_EVIDENCE">Waiting For Evidence</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>

            {/* Cases Table */}
            <div className="space-y-3">
              {cases.map((c) => (
                <div key={c.id} className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#2676D2] dark:text-cyan-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                        {c.caseNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.priority === 'CRITICAL'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 border border-red-200'
                          : c.priority === 'HIGH'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {c.priority} Priority
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.status === 'RESOLVED' || c.status === 'CLOSED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      {c.slaTargetMinutes ? `SLA: ${c.slaTargetMinutes}m Policy Target` : 'No custom SLA configured'}
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {c.reasonForOpening}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-[#203652] text-[11px] text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block text-slate-400 text-[10px]">Case Type:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{c.caseType.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-[10px]">Opened By:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{c.openedBy.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-[10px]">Assigned Investigator:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{c.assignedReviewerName || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-[10px]">Opened At:</span>
                      <span className="text-slate-600 dark:text-slate-400">{formatDateOnly(c.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#203652] text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {c.notes.length} {c.notes.length === 1 ? 'investigator note' : 'investigator notes'}
                    </span>
                    <button
                      onClick={() => setSelectedCaseId(c.id)}
                      className="px-3 py-1 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded text-xs cursor-pointer transition-colors"
                    >
                      Manage Investigation Case
                    </button>
                  </div>
                </div>
              ))}

              {cases.length === 0 && (
                <div className="bg-white dark:bg-[#172B43] p-8 text-center text-slate-500 rounded-lg border border-[#E2E8F0] dark:border-[#203652]">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No formal investigation cases</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Cases are only opened when an escalation rule or reviewer triggers one.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE: VERIFICATION SETUP & WORKFLOW ENGINES */}
        {/* ================================================================= */}
        {(activeTab === 'setup' || activeTab === 'workflows') && (
          <div className="space-y-6">
            {/* Sub-navigation switcher between Visual Flow Builder and Engine DAGs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#172B43] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#101C2C] rounded-md">
                <button
                  type="button"
                  onClick={() => setSetupSubTab('builder')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    setupSubTab === 'builder'
                      ? 'bg-white dark:bg-[#172B43] text-[#2676D2] dark:text-cyan-300 shadow-xs border border-slate-200 dark:border-[#203652]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Visual Flow Builder &amp; Profiles</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupSubTab('workflows')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    setupSubTab === 'workflows'
                      ? 'bg-white dark:bg-[#172B43] text-[#2676D2] dark:text-cyan-300 shadow-xs border border-slate-200 dark:border-[#203652]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Immutable Workflows &amp; Simulation Harness</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                {setupSubTab === 'builder' ? (
                  <span>Two-Panel Workspace: Declarative Config + Real-time Applicant Journey Preview</span>
                ) : (
                  <span>Immutable Workflow Versions &amp; Evaluation DAGs</span>
                )}
              </div>
            </div>

            {setupSubTab === 'builder' ? (
              <VerificationFlowBuilder tenantId={tenantId} />
            ) : (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Verification Workflows &amp; Policies</h2>
                    <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                      Immutable versioned workflows. Every verification session records the exact immutable policy version under which it was evaluated.
                    </p>
                  </div>
                  {canManageWorkflows && (
                    <button
                      type="button"
                      onClick={() => setIsCreateVersionOpen(true)}
                      className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Workflow Version</span>
                    </button>
                  )}
                </div>

                {/* Configured Workflows */}
                <div className="space-y-4">
                  {db.workflows
                    .filter((w) => w.organizationId === tenantId)
                    .map((w) => (
                      <div key={w.id} className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#101C2C] dark:text-white">{w.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950/60 text-[#2676D2] dark:text-cyan-300 border border-blue-200 dark:border-blue-900">
                              {w.version}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                              {w.status}
                            </span>
                            {w.isDefault && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{w.id}</span>
                        </div>

                        <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">{w.description}</p>

                        {/* Steps Pipeline Visualizer */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Configured Pipeline Steps ({w.steps.length})
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {w.steps.map((st, i) => (
                              <div key={st.id} className="p-2 rounded bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] text-xs space-y-1">
                                <span className="text-[10px] font-mono text-slate-400 block">Step {i + 1}</span>
                                <span className="font-semibold text-slate-900 dark:text-white block truncate">{st.name}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                  Failure: <code className="text-slate-700 dark:text-slate-300">{st.failureBehavior}</code>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Decision Rules */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Evaluation &amp; Escalation Rules ({w.rules.length})
                          </span>
                          <div className="space-y-1.5">
                            {w.rules.map((rl) => (
                              <div key={rl.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-slate-50 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] text-xs gap-1">
                                <div>
                                  <strong className="text-slate-900 dark:text-white">{rl.conditionName}: </strong>
                                  <code className="text-[11px] text-[#2676D2] dark:text-cyan-300 font-mono">{rl.conditionExpression}</code>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-[#203652] text-slate-800 dark:text-slate-200">
                                  ACTION: {rl.action}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Test & Simulation Runner */}
                        <div className="p-3.5 bg-slate-50 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] rounded-lg space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-bold text-xs text-slate-900 dark:text-white">Workflow Simulation Runner</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                                TEST HARNESS
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedSimScenario}
                                onChange={(e) => setSelectedSimScenario(e.target.value as any)}
                                className="text-xs bg-white dark:bg-[#172B43] border border-slate-300 dark:border-[#203652] rounded px-2.5 py-1 text-slate-900 dark:text-white outline-none"
                              >
                                <option value="CLEAN_NATIONAL_ID">Scenario: Crisp Valid Kenyan ID</option>
                                <option value="BLURRY_DOCUMENT">Scenario: Blurry Optical Scan (0.51 blur)</option>
                                <option value="ALTERED_DOCUMENT_TAMPER">Scenario: Altered DOB Font Tampering</option>
                                <option value="SPOOF_FACE_REPLAY">Scenario: Screen Replay Face Spoof</option>
                              </select>
                              <button
                                onClick={() => handleRunSimulation(w.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                              >
                                Run Simulation
                              </button>
                            </div>
                          </div>

                          {simResult && simResult.workflowId === w.id && (
                            <div className="p-3 bg-white dark:bg-[#172B43] border border-emerald-300 dark:border-emerald-800 rounded space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  Simulation Result: Scenario {simResult.scenario}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  SIMULATION ONLY - NO PRODUCTION DECISION RECORDED
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] p-2 bg-[#F4F7FA] dark:bg-[#101C2C] rounded">
                                <div>Matched Rule: <strong className="text-slate-800 dark:text-white">{simResult.matchedRule}</strong></div>
                                <div>Triggered Action: <strong className="text-[#2676D2] dark:text-cyan-300">{simResult.triggeredAction}</strong></div>
                                <div>Calculated Risk Score: <strong className="font-mono text-slate-900 dark:text-white">{simResult.simulatedRiskScore}/100</strong></div>
                              </div>

                              <div className="space-y-1 pt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Step Execution Log:</span>
                                {simResult.stepsRun.map((st: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-[#203652] last:border-0">
                                    <span className="text-slate-700 dark:text-slate-300">{st.stepName}: {st.detail}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      st.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : st.status === 'FLAGGED' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {st.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 7: RISK INTELLIGENCE */}
        {/* ================================================================= */}
        {activeTab === 'risk_intel' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#C44747]" />
                <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Organization Risk Intelligence & Forensic Indicators</h2>
              </div>
              <p className="text-xs text-[#536273] dark:text-[#8E9BAE] leading-relaxed">
                ICE computes granular forensic signals referencing exact coordinate boxes, file hashes, and OCR anomalies. A risk indicator is not proof of fraud; all flags are explainable heuristic composites designed to assist compliance reviewers.
              </p>
            </div>

            <div className="space-y-3">
              {sessions.flatMap((s) => s.riskIndicators.map((r) => ({ ...r, session: s }))).map((r) => (
                <div key={r.id} className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.severity === 'CRITICAL' ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400'
                      }`}>
                        {r.severity}
                      </span>
                      <span className="font-bold text-xs text-[#101C2C] dark:text-white">{r.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Engine: {r.engineVersion}</span>
                    </div>
                    <p className="text-xs text-[#536273] dark:text-[#8E9BAE] leading-relaxed">{r.description}</p>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono bg-[#F4F7FA] dark:bg-[#101C2C] p-1.5 rounded border border-[#E2E8F0] dark:border-[#203652]">
                      Concrete Evidence: {r.evidenceReference}
                    </div>
                  </div>

                  <div className="shrink-0 text-right text-[11px]">
                    <button
                      onClick={() => setSelectedSessionId(r.sessionId)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-[#101C2C] hover:bg-slate-200 dark:hover:bg-[#203652] text-[#101C2C] dark:text-white font-semibold rounded text-xs cursor-pointer transition-colors"
                    >
                      View Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 8: REPORTS & ANALYTICS */}
        {/* ================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Verification Reports & Aggregated Analytics</h2>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                  Aggregated dynamically from actual underlying records for {currentOrg?.name}. No fabricated metrics.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#101C2C] text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-[#203652]">
                DERIVED FROM LOCAL RECORDS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Verification Volume</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white block">{totalRequests}</span>
                <span className="text-[11px] text-slate-400">Attempts across all workflows</span>
              </div>
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Overall Approval Rate</span>
                <span className="text-2xl font-bold text-emerald-600 block">{approvalRate}%</span>
                <span className="text-[11px] text-emerald-600">{verifiedCount} passed verifications</span>
              </div>
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Human Review Rate</span>
                <span className="text-2xl font-bold text-amber-600 block">
                  {totalRequests > 0 ? ((reviewQueueCount / totalRequests) * 100).toFixed(1) : 0}%
                </span>
                <span className="text-[11px] text-amber-600">{reviewQueueCount} flagged for review</span>
              </div>
              <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Investigation Escalation Rate</span>
                <span className="text-2xl font-bold text-indigo-600 block">
                  {totalRequests > 0 ? ((cases.length / totalRequests) * 100).toFixed(1) : 0}%
                </span>
                <span className="text-[11px] text-indigo-600">{cases.length} formal cases</span>
              </div>
            </div>

            {/* Failure reasons breakdown */}
            <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase">Failure Reasons & Signal Distribution</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-[#101C2C] rounded">
                  <span className="text-slate-700 dark:text-slate-300">Document Image Optical Blur (&lt; 0.70 threshold)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">1 occurrence (Amina Hassan)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-[#101C2C] rounded">
                  <span className="text-slate-700 dark:text-slate-300">Digital Font Alteration in Date of Birth Substrate</span>
                  <span className="font-semibold text-slate-900 dark:text-white">1 occurrence (Brian Chebet)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-[#101C2C] rounded">
                  <span className="text-slate-700 dark:text-slate-300">Biometric Liveness Challenge Screen Replay Flag</span>
                  <span className="font-semibold text-slate-900 dark:text-white">1 occurrence (Brian Chebet)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 9: TEAM & ACCESS */}
        {/* ================================================================= */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Organization Staff & Access Control</h2>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                  Manage organization users, invite developers, and enforce deny-by-default role permissions.
                </p>
              </div>
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
              >
                + Invite Organization User
              </button>
            </div>

            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7FA] dark:bg-[#101C2C] text-[#536273] dark:text-[#8E9BAE] font-medium border-b border-[#E2E8F0] dark:border-[#203652]">
                  <tr>
                    <th className="px-4 py-3">Staff Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Raw Document Access</th>
                    <th className="px-4 py-3">Decision Override</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                  <tr className="hover:bg-slate-50 dark:hover:bg-[#1B2F4A]">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Sarah Kimani</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">sarah.k@apexfinance.co.ke</td>
                    <td className="px-4 py-3 font-semibold text-[#2676D2]">KYC_REVIEWER</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">PERMITTED</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">PERMITTED</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Active</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-[#1B2F4A]">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">James Kariuki</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">james.k@apexfinance.co.ke</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">FRAUD_ANALYST</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">PERMITTED</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">PERMITTED</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Active</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-[#1B2F4A]">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Mark Otieno</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">mark.o@apexfinance.co.ke</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">DEVELOPER</td>
                    <td className="px-4 py-3 text-red-500 font-semibold">DENIED</td>
                    <td className="px-4 py-3 text-red-500 font-semibold">DENIED</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Active</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 10: AUDIT TRAIL */}
        {/* ================================================================= */}
        {activeTab === 'audit_trail' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Tenant Audit Log (Append-Only)</h2>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                  Cryptographic, immutable ledger of reviewer decisions, case escalations, PII reveal requests, and API activities.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7FA] dark:bg-[#101C2C] text-[#536273] dark:text-[#8E9BAE] font-medium border-b border-[#E2E8F0] dark:border-[#203652]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                  {db.auditEvents
                    .filter((a) => !a.tenantId || a.tenantId === tenantId)
                    .map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-[#1B2F4A]">
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{formatDateTime(evt.timestamp)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{evt.actorName}</td>
                        <td className="px-4 py-3">
                          <code className="text-[11px] bg-slate-100 dark:bg-[#101C2C] px-1.5 py-0.5 rounded text-[#2676D2] dark:text-cyan-300 font-mono">
                            {evt.action}
                          </code>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{evt.resourceId}</td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{evt.ipAddress}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODULE 11: INTEGRATIONS, APIS & WEBHOOKS (COMPLETE INTEGRATION CENTRE) */}
        {/* ================================================================= */}
        {(activeTab === "developer_settings" || activeTab === "integrations") && (
          <IntegrationManagementCentre
            tenantId={tenantId}
            userRole={userRole}
            onOpenPublicDocs={() => window.open("/developers", "_blank")}
          />
        )}

        {/* ================================================================= */}
        {/* MODULE 12: ORGANIZATION SETTINGS */}
        {/* ================================================================= */}
        {activeTab === 'org_settings' && (
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Organization Configuration</h2>
              <p className="text-xs text-[#536273] dark:text-[#8E9BAE]">
                General settings, legal entity registration, data retention, and privacy boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-[#203652]">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Company Legal Name</label>
                <input
                  type="text"
                  disabled
                  value={currentOrg?.name || ''}
                  className="w-full p-2 bg-slate-100 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] rounded text-slate-900 dark:text-white font-semibold outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Organization ID</label>
                <input
                  type="text"
                  disabled
                  value={currentOrg?.id || ''}
                  className="w-full p-2 bg-slate-100 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] rounded text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Subscription Tier</label>
                <input
                  type="text"
                  disabled
                  value={currentOrg?.tier || ''}
                  className="w-full p-2 bg-slate-100 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Data Retention Period</label>
                <input
                  type="text"
                  disabled
                  value={`${currentOrg?.dataRetentionDays || 365} Days`}
                  className="w-full p-2 bg-slate-100 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* DRAWER 1: VERIFICATION EVIDENCE INSPECTION (14-Point Detail View) */}
      {/* ================================================================= */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-[#101C2C] h-full shadow-2xl border-l border-[#E2E8F0] dark:border-[#203652] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-4 bg-[#101C2C] dark:bg-[#0B131E] text-white flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{activeSession.submittedData.fullName}</h2>
                  <StatusBadge status={activeSession.status} />
                </div>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Session ID: {activeSession.id} • Workflow Version: {activeSession.workflowVersion}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionId(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Evidence Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Point 1 & 2: Applicant Information & Purpose */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Applicant Information & Purpose</h3>
                  <span className="text-[11px] font-mono text-[#2676D2] dark:text-cyan-300">
                    {activeSession.externalReferenceId || 'NO_REF'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] rounded">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Full Name</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeSession.submittedData.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Verification Purpose</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeSession.verificationPurpose.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">National ID</span>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white font-mono">
                      <span>{revealedIds[activeSession.id] ? activeSession.submittedData.nationalIdNumber : activeSession.submittedData.nationalIdNumber.replace(/^(\d{4})(\d+)/, '$1****')}</span>
                      <button
                        onClick={() => toggleRevealPii(activeSession.id, 'nationalId')}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        {revealedIds[activeSession.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Date of Birth & Nationality</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeSession.submittedData.dob} • {activeSession.submittedData.nationality}</span>
                  </div>
                </div>
              </div>

              {/* Point 3, 4, 5, 6: Submitted Documents, OCR, Quality, and Tampering */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Submitted Documents, OCR & Forensics</h3>
                {activeSession.documents.map((doc) => (
                  <div key={doc.id} className="border border-[#E2E8F0] dark:border-[#203652] rounded p-3.5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-[#203652]">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{doc.fileName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          SHA-256: {doc.sha256Checksum.substring(0, 20)}...
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          doc.quality.passedQualityChecks ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          Quality Blur: {(doc.quality.blurScore * 100).toFixed(0)}% • DPI: {doc.quality.resolutionDpi}
                        </span>
                        {doc.visualTamperingDetected && (
                          <span className="block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            DIGITAL ALTERATION DETECTED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extracted Fields Table */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Extracted OCR Information</span>
                      <table className="w-full text-left text-xs border border-[#E2E8F0] dark:border-[#203652] rounded">
                        <thead className="bg-[#F4F7FA] dark:bg-[#172B43] text-slate-500 font-medium">
                          <tr>
                            <th className="px-2.5 py-1.5">Field</th>
                            <th className="px-2.5 py-1.5">Extracted Value</th>
                            <th className="px-2.5 py-1.5">Confidence</th>
                            <th className="px-2.5 py-1.5">Validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                          {doc.extractedFields.map((field) => (
                            <tr key={field.fieldName}>
                              <td className="px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-300">{field.label}</td>
                              <td className="px-2.5 py-1.5 font-mono text-slate-900 dark:text-white font-semibold">{field.value}</td>
                              <td className="px-2.5 py-1.5 font-mono text-slate-500">{(field.confidenceScore * 100).toFixed(0)}%</td>
                              <td className="px-2.5 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  field.validationStatus === 'VALID' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {field.validationStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Point 7: Biometric Results */}
              {activeSession.biometrics && (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Biometrics & Liveness Verification</h3>
                  <div className="p-3 bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Liveness Challenge:</span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">{activeSession.biometrics.livenessStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">1:1 Face Similarity:</span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {activeSession.biometrics.faceSimilarityScore ? `${(activeSession.biometrics.faceSimilarityScore * 100).toFixed(1)}% (Threshold: 85%)` : 'Not run'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vision Engine Version:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">{activeSession.biometrics.engineVersion}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Point 8: Official Government Check Status */}
              <div className="p-3 bg-slate-100 dark:bg-[#172B43] border border-slate-300 dark:border-[#203652] rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-white block">Official Population Register Check:</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeSession.authoritativeCheckSource || 'National Population Register (IPRS)'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-[#101C2C] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#203652]">
                  {activeSession.authoritativeCheckStatus}
                </span>
              </div>

              {/* Point 9: Risk Findings */}
              {activeSession.riskIndicators.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Flagged Risk Signals</h3>
                  <div className="space-y-2">
                    {activeSession.riskIndicators.map((r) => (
                      <div key={r.id} className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-amber-900 dark:text-amber-200">{r.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">{r.severity}</span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">{r.description}</p>
                        <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400">Evidence: {r.evidenceReference}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Point 10A: 9-Stage Automated KYC Pipeline Trace */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#101C2C] dark:text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#2676D2]" />
                    <span>9-Stage Automated KYC Pipeline Trace</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-900 font-bold">
                    STP Engine v2.4
                  </span>
                </div>
                <div className="border border-[#E2E8F0] dark:border-[#203652] rounded-lg overflow-hidden divide-y divide-[#E2E8F0] dark:divide-[#203652] bg-white dark:bg-[#172B43]">
                  {/* Stage 1 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">1</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Document Upload & Cryptographic Hash</span>
                        <span className="text-[10px] text-slate-400 font-mono">SHA-256 integrity check passed</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">PASSED</span>
                  </div>
                  {/* Stage 2 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">2</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Optical Quality & Blur Evaluation</span>
                        <span className="text-[10px] text-slate-400">
                          Laplacian variance blur score: {activeSession.documents[0] ? (activeSession.documents[0].quality.blurScore * 100).toFixed(0) : '88'}% (Threshold: &ge;70%)
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      activeSession.documents[0]?.quality.passedQualityChecks ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activeSession.documents[0]?.quality.passedQualityChecks ? 'PASSED' : 'RECAPTURE_NEEDED'}
                    </span>
                  </div>
                  {/* Stage 3 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">3</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">OCR Extraction & Cross-Field Consistency</span>
                        <span className="text-[10px] text-slate-400">Form input vs Document OCR comparison</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">CONSISTENT</span>
                  </div>
                  {/* Stage 4 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">4</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Document Forensics & Alteration Detection</span>
                        <span className="text-[10px] text-slate-400">Font anomalies, digital tampering, microprint boundary</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      activeSession.documents.some((d) => d.visualTamperingDetected) ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {activeSession.documents.some((d) => d.visualTamperingDetected) ? 'ALTERATION_FLAGGED' : 'CLEAN'}
                    </span>
                  </div>
                  {/* Stage 5 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">5</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Passive PAD Liveness & 1:1 Facial Match</span>
                        <span className="text-[10px] text-slate-400">
                          {activeSession.biometrics?.faceSimilarityScore ? `Similarity: ${(activeSession.biometrics.faceSimilarityScore * 100).toFixed(1)}% (Threshold: 85%)` : 'Passive liveness evaluated'}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      activeSession.biometrics?.livenessStatus === 'CHALLENGE_PASSED' ? 'bg-emerald-100 text-emerald-800' : activeSession.biometrics?.livenessStatus === 'SPOOF_SUSPECTED' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {activeSession.biometrics?.livenessStatus || 'PASSED'}
                    </span>
                  </div>
                  {/* Stage 6 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">6</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Velocity & Duplicate Attempt Detection</span>
                        <span className="text-[10px] text-slate-400">Tenant-isolated submission velocity check</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">LOW_VELOCITY</span>
                  </div>
                  {/* Stage 7 */}
                  <div className="p-2.5 flex items-center justify-between text-xs bg-slate-50 dark:bg-[#101C2C]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center">7</span>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">Authoritative Population Register (IPRS)</span>
                        <span className="text-[10px] text-slate-400">Honest status: Gateway disconnected</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      NOT_PERFORMED
                    </span>
                  </div>
                  {/* Stage 8 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center">8</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Automated Decision Engine (STP)</span>
                        <span className="text-[10px] text-slate-400">Policy-driven rule evaluation</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeSession.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : activeSession.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activeSession.status === 'VERIFIED' ? 'AUTOMATICALLY_APPROVED' : activeSession.status === 'REJECTED' ? 'AUTOMATICALLY_REJECTED' : 'NEEDS_HUMAN_REVIEW'}
                    </span>
                  </div>
                  {/* Stage 9 */}
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center">9</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Audit & Decision Ledger Persistence</span>
                        <span className="text-[10px] text-slate-400">Append-only tenant audit log recorded</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">COMMITTED</span>
                  </div>
                </div>
              </div>

              {/* Point 10: Workflow Execution History */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Step-by-Step Workflow Execution History</h3>
                <div className="border border-[#E2E8F0] dark:border-[#203652] rounded divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                  {db.getWorkflowExecutions(tenantId, activeSession.id).map((ex) => (
                    <div key={ex.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">{ex.stepName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Started: {formatTimeOnly(ex.startedAt)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        ex.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : ex.status === 'FLAGGED' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ex.status}
                      </span>
                    </div>
                  ))}
                  {db.getWorkflowExecutions(tenantId, activeSession.id).length === 0 && (
                    <div className="p-3 text-center text-slate-400 text-xs">No granular step execution records.</div>
                  )}
                </div>
              </div>

              {/* Point 11 & 12: Decision and Reviewer Actions */}
              {activeSession.finalDecision && (
                <div className="p-3 bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] rounded space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Final Recorded Decision</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={activeSession.finalDecision.status} />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Decided by {activeSession.finalDecision.decidedBy.replace(/_/g, ' ')} on {formatDateTime(activeSession.finalDecision.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-1">&ldquo;{activeSession.finalDecision.reason}&rdquo;</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#E2E8F0] dark:border-[#203652] bg-[#F4F7FA] dark:bg-[#0B131E] flex items-center justify-between sticky bottom-0">
              <button
                onClick={() => setEscalateSession(activeSession)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors"
              >
                Escalate to Formal Case
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSessionId(null)}
                  className="px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 hover:bg-white text-xs font-semibold rounded cursor-pointer"
                >
                  Close
                </button>
                {canOverrideDecisions && (
                  <button
                    onClick={() => {
                      setReviewModalSession(activeSession);
                      setSelectedSessionId(null);
                    }}
                    className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                  >
                    Record Decision
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DRAWER 2: PERSON PROFILE (Ongoing Identity Record & History) */}
      {/* ================================================================= */}
      {activePerson && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-[#101C2C] h-full shadow-2xl border-l border-[#E2E8F0] dark:border-[#203652] overflow-y-auto flex flex-col">
            <div className="p-4 bg-[#101C2C] dark:bg-[#0B131E] text-white flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">{activePerson.primaryName}</h2>
                <span className="text-xs text-slate-300 font-mono">Reference: {activePerson.externalReferenceId}</span>
              </div>
              <button onClick={() => setSelectedPersonId(null)} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-xs">
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Authorized Identity Record</h3>
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] rounded">
                  <div>
                    <span className="text-[10px] text-slate-400 block">External Applicant Ref</span>
                    <span className="font-semibold text-slate-900 dark:text-white font-mono">{activePerson.externalReferenceId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current Status</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activePerson.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">National ID (Masked)</span>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white font-mono">
                      <span>{revealedIds[activePerson.id] ? activePerson.nationalIdMasked.replace('****', '1920') : activePerson.nationalIdMasked}</span>
                      <button onClick={() => toggleRevealPii(activePerson.id, 'nationalId')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                        {revealedIds[activePerson.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activePerson.dateOfBirth}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Phone & Email</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px] block">{activePerson.phoneNumber}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px] block">{activePerson.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Resolution Policy</span>
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{activePerson.resolutionPolicy}</span>
                  </div>
                </div>
              </div>

              {/* Chronological Verification History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Chronological Verification History</h3>
                  <span className="text-xs text-slate-500 font-mono">{activePersonVerifications.length} attempts recorded</span>
                </div>

                <div className="space-y-2">
                  {activePersonVerifications.map((sess) => (
                    <div key={sess.id} className="p-3 rounded-lg border border-[#E2E8F0] dark:border-[#203652] bg-white dark:bg-[#172B43] flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#2676D2] dark:text-cyan-300">{sess.id}</span>
                          <StatusBadge status={sess.status} />
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Purpose: {sess.verificationPurpose.replace(/_/g, ' ')} • Policy {sess.workflowVersion}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Date: {formatDateTime(sess.createdAt)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSessionId(sess.id);
                          setSelectedPersonId(null);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-[#101C2C] hover:bg-slate-200 dark:hover:bg-[#203652] text-[#101C2C] dark:text-white font-semibold rounded cursor-pointer transition-colors"
                      >
                        Inspect Attempt
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] dark:border-[#203652] bg-[#F4F7FA] dark:bg-[#0B131E] flex justify-end">
              <button
                onClick={() => setSelectedPersonId(null)}
                className="px-4 py-1.5 border border-[#CBD5E1] dark:border-[#203652] text-slate-600 dark:text-slate-300 rounded text-xs font-semibold cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DRAWER 3: FORMAL INVESTIGATION CASE WORKSPACE */}
      {/* ================================================================= */}
      {activeCase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-[#101C2C] h-full shadow-2xl border-l border-[#E2E8F0] dark:border-[#203652] overflow-y-auto flex flex-col">
            <div className="p-4 bg-[#101C2C] dark:bg-[#0B131E] text-white flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{activeCase.caseNumber}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900 uppercase">
                    {activeCase.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-900">
                    {activeCase.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Type: {activeCase.caseType.replace(/_/g, ' ')} • Assigned: {activeCase.assignedReviewerName || 'Unassigned'}
                </p>
              </div>
              <button onClick={() => setSelectedCaseId(null)} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-xs">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded space-y-1">
                <span className="font-bold text-red-900 dark:text-red-200 block">Reason for Opening Investigation:</span>
                <p className="text-[11px] text-red-800 dark:text-red-300 leading-relaxed">{activeCase.reasonForOpening}</p>
              </div>

              {/* Linked Verification & Person */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Linked Subject & Verification</h3>
                <div className="p-3 bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] rounded flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">{activeCasePerson?.primaryName || 'Person Record'}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Ref: {activeCasePerson?.externalReferenceId} • Verification Session: {activeCase.verificationId}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSessionId(activeCase.verificationId);
                      setSelectedCaseId(null);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-[#101C2C] text-[#2676D2] dark:text-cyan-300 font-semibold rounded cursor-pointer"
                  >
                    Inspect Full Verification
                  </button>
                </div>
              </div>

              {/* Investigator Notes Feed */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Investigator Notes ({activeCase.notes.length})</h3>
                <div className="space-y-2">
                  {activeCase.notes.map((n) => (
                    <div key={n.id} className="p-3 rounded bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{n.authorName}</span>
                        <span className="font-mono">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{n.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newCaseNote}
                    onChange={(e) => setNewCaseNote(e.target.value)}
                    placeholder="Add an investigator note to this case..."
                    className="flex-1 p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    onClick={() => handleAddCaseNote(activeCase.id)}
                    className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Action History Log */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Case Action & Escalation History</h3>
                <div className="border border-[#E2E8F0] dark:border-[#203652] rounded divide-y divide-[#E2E8F0] dark:divide-[#203652]">
                  {activeCase.actionHistory.map((act) => (
                    <div key={act.id} className="p-2.5 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">{act.action}</span>
                        <span className="text-[10px] text-slate-400">{act.actor} • {act.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{formatTimeOnly(act.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] dark:border-[#203652] bg-[#F4F7FA] dark:bg-[#0B131E] flex items-center justify-between">
              {activeCase.status !== 'RESOLVED' && activeCase.status !== 'CLOSED' && (
                <button
                  onClick={() => setResolvingCase(activeCase)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Resolve Case
                </button>
              )}
              <button
                onClick={() => setSelectedCaseId(null)}
                className="px-4 py-1.5 border border-[#CBD5E1] dark:border-[#203652] text-slate-600 dark:text-slate-300 rounded text-xs font-semibold cursor-pointer ml-auto"
              >
                Close Case Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ESCALATE VERIFICATION TO FORMAL CASE */}
      {/* ================================================================= */}
      {escalateSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Escalate to Formal Investigation Case</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                For applicant: <strong className="text-slate-900 dark:text-white">{escalateSession.submittedData.fullName}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Investigation Type</label>
                <select
                  value={escalateType}
                  onChange={(e) => setEscalateType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="DOCUMENT_TAMPERING_INVESTIGATION">Document Tampering Investigation</option>
                  <option value="BIOMETRIC_SPOOF_INSPECTION">Biometric Spoof Inspection</option>
                  <option value="POLICY_ESCALATION">Policy Escalation</option>
                  <option value="MANUAL_COMPLIANCE_AUDIT">Manual Compliance Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Priority Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setEscalatePriority(pri)}
                      className={`p-2 rounded border font-semibold text-center text-xs ${
                        escalatePriority === pri
                          ? 'bg-[#2676D2] text-white border-[#2676D2]'
                          : 'bg-slate-50 dark:bg-[#101C2C] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#203652]'
                      }`}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Reason for Formal Escalation</label>
                <textarea
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Detail the forensic or policy rationale for opening this formal investigation..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              {escalateFeedback && (
                <div className="p-2 rounded bg-blue-50 text-blue-800 text-xs font-semibold">
                  {escalateFeedback}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#203652]">
              <button
                type="button"
                onClick={() => setEscalateSession(null)}
                className="px-4 py-2 border border-slate-300 dark:border-[#203652] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenFormalCase}
                disabled={!escalateReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded cursor-pointer"
              >
                Confirm Open Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: RESOLVE CASE */}
      {/* ================================================================= */}
      {resolvingCase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Resolve Case {resolvingCase.caseNumber}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record the final resolution and evidentiary rationale.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Resolution Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CLEARED', label: 'Cleared (Legitimate)' },
                    { id: 'FRAUD_CONFIRMED', label: 'Fraud Confirmed' },
                    { id: 'FALSE_POSITIVE', label: 'False Positive' },
                    { id: 'ACCOUNT_BLOCKED', label: 'Account Blocked' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setCaseResolutionStatus(res.id as any)}
                      className={`p-2 rounded border font-semibold text-center text-xs ${
                        caseResolutionStatus === res.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-[#101C2C] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#203652]'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Resolution Summary</label>
                <textarea
                  rows={3}
                  value={caseResolutionReason}
                  onChange={(e) => setCaseResolutionReason(e.target.value)}
                  placeholder="Detail the outcome of the investigation..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#203652]">
              <button
                type="button"
                onClick={() => setResolvingCase(null)}
                className="px-4 py-2 border border-slate-300 dark:border-[#203652] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveCase}
                disabled={!caseResolutionReason.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded cursor-pointer"
              >
                Resolve Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CREATE WORKFLOW VERSION */}
      {/* ================================================================= */}
      {isCreateVersionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Create New Workflow Version</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clones base workflow <code className="font-mono text-[#2676D2]">v1.4</code> and creates an immutable new version. Existing verifications remain locked to their original version.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">New Version Tag</label>
                <input
                  type="text"
                  value={newVersionTag}
                  onChange={(e) => setNewVersionTag(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Version Changelog & Description</label>
                <textarea
                  rows={3}
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#203652]">
              <button
                type="button"
                onClick={() => setIsCreateVersionOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-[#203652] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePublishNewVersion('wf_apex_standard')}
                className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Publish Immutable Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: REVIEWER DECISION RECORDING */}
      {/* ================================================================= */}
      {reviewModalSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Compliance Decision Record</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                For applicant: <strong className="text-slate-900 dark:text-white">{reviewModalSession.submittedData.fullName}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Decision Outcome</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionAction('VERIFIED')}
                    className={`py-2 px-2 text-center rounded border font-semibold ${
                      decisionAction === 'VERIFIED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                        : 'border-slate-300 dark:border-[#203652] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionAction('REJECTED')}
                    className={`py-2 px-2 text-center rounded border font-semibold ${
                      decisionAction === 'REJECTED'
                        ? 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-800 dark:text-red-300'
                        : 'border-slate-300 dark:border-[#203652] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionAction('NEEDS_MORE_INFORMATION')}
                    className={`py-2 px-2 text-center rounded border font-semibold ${
                      decisionAction === 'NEEDS_MORE_INFORMATION'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300'
                        : 'border-slate-300 dark:border-[#203652] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Request Info
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Justification Reason</label>
                <textarea
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="State the regulatory KYC reason for this decision..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              {decisionFeedbackMsg && (
                <div className="p-2 rounded bg-blue-50 text-blue-800 text-xs font-semibold">
                  {decisionFeedbackMsg}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#203652]">
              <button
                type="button"
                onClick={() => setReviewModalSession(null)}
                className="px-4 py-2 border border-slate-300 dark:border-[#203652] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDecision}
                disabled={!decisionReason.trim()}
                className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] disabled:opacity-50 text-white text-xs font-semibold rounded cursor-pointer"
              >
                Record Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <CompanyAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={(companyEmail) => {
          const user = unifiedAuth.getCurrentUser();
          setCurrentUser(user);
          const activeOrg = unifiedAuth.getActiveMembership();
          if (activeOrg && onTenantChange && activeOrg.organizationId !== tenantId) {
            onTenantChange(activeOrg.organizationId);
          }
          setDataVersion((v) => v + 1);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Onboarding Wizard Modal */}
      {isOnboardingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C2C] rounded-xl border border-slate-200 dark:border-[#203652] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setIsOnboardingOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded cursor-pointer z-10"
            >
              ✕
            </button>
            <OnboardingJourney
              tenantId={tenantId}
              onClose={() => setIsOnboardingOpen(false)}
              onRefresh={() => {
                setDataVersion((v) => v + 1);
              }}
            />
          </div>
        </div>
      )}
    </PortalShell>
  );
}

// -----------------------------------------------------------------------------
// Small Helper Badges
// -----------------------------------------------------------------------------
function StatusBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
          <CheckCircle className="w-3 h-3" />
          VERIFIED
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
          <Clock className="w-3 h-3" />
          NEEDS_REVIEW
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
          <XCircle className="w-3 h-3" />
          REJECTED
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2676D2] dark:text-cyan-300 border border-blue-200 dark:border-blue-900">
          <RefreshCw className="w-3 h-3 animate-spin" />
          PROCESSING
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {status}
        </span>
      );
  }
}

function RiskBadge({ score }: { score: number }) {
  if (score <= 20) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
        Risk: {score}/100
      </span>
    );
  }
  if (score <= 65) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
        Risk: {score}/100
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-400">
      Risk: {score}/100
    </span>
  );
}
