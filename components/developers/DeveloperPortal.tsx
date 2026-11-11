'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Code2, 
  Key, 
  Play, 
  Webhook, 
  Activity, 
  Terminal, 
  FileCode2, 
  BarChart3, 
  Sliders, 
  Copy, 
  Check, 
  Send, 
  ExternalLink, 
  AlertCircle,
  Clock,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  Building2,
  Users,
  UserPlus,
  Sparkles,
  CheckCircle,
  XCircle,
  Eye,
  FolderGit2,
  Globe,
  Lock,
  Shield,
  RotateCw,
  Trash2,
  HelpCircle,
  Radio
} from 'lucide-react';
import { PortalShell, NavGroup } from '../layout/PortalShell';
import { db } from '@/lib/store/synthetic-db';
import { PublicDocumentation } from './PublicDocumentation';
import { DeveloperAuthModal } from './DeveloperAuthModal';
import { UserCheck } from 'lucide-react';
import { formatDateOnly, formatTimeOnly } from '@/lib/utils';
import { unifiedAuth } from '@/lib/auth/unified-auth';
import { supabaseAuth } from '@/lib/auth/supabase-auth';
import { 
  automatedPipeline, 
  ENGINE_SPECIFICATIONS, 
  PipelineExecutionTrace 
} from '@/lib/engines/automated-pipeline';
import { OrganizationRole, IntegrationProject, IntegrationMethod } from '@/lib/types';

interface DeveloperPortalProps {
  tenantId?: string;
}

export function DeveloperPortal({ tenantId: initialTenantId = 'org_apex_fin' }: DeveloperPortalProps) {
  // Unified Auth & Multi-Organization Context
  const [currentUser, setCurrentUser] = useState(unifiedAuth.getCurrentUser());
  const activeMembership = unifiedAuth.getActiveMembership();
  const currentTenantId = activeMembership?.organizationId || initialTenantId;
  const isOwner = Boolean(activeMembership?.isOwner);
  const isDeveloperLoggedIn = Boolean(currentUser);

  useEffect(() => {
    const unsubscribe = unifiedAuth.subscribe((user) => {
      setCurrentUser(user);
    });

    supabaseAuth.restoreSession().then((res) => {
      if (res?.user) {
        setCurrentUser(unifiedAuth.getCurrentUser());
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOrgSwitch = (newOrgId: string) => {
    unifiedAuth.switchActiveOrganization(newOrgId);
    setCurrentUser(unifiedAuth.getCurrentUser());
  };

  // Developer Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active navigation section
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'api_docs'
    | 'credentials'
    | 'sandbox'
    | 'webhooks'
    | 'delivery_history'
    | 'sdks'
    | 'logs'
    | 'usage'
    | 'settings'
  >('overview');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Integration Projects Management
  const [projectsVersion, setProjectsVersion] = useState(0);
  const projects = db.getProjects(currentTenantId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'proj_apex_web');
  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  // Organization Onboarding & Production Status
  const orgApp = db.getOnboardingApplication(currentTenantId);
  const currentOrg = db.organizations.find((o) => o.id === currentTenantId);
  const isProductionApproved = orgApp?.status === 'PRODUCTION_APPROVED' || currentOrg?.onboardingStatus === 'PRODUCTION_APPROVED';

  // Create Project Modal State
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEnv, setNewProjectEnv] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [newProjectMethod, setNewProjectMethod] = useState<IntegrationMethod>('EMBEDDED_WEB_SDK');
  const [newProjectOrigins, setNewProjectOrigins] = useState('https://lending.example.com');
  const [newProjectWorkflow, setNewProjectWorkflow] = useState('wf_kenya_standard');
  const [projectCreateError, setProjectCreateError] = useState<string | null>(null);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const originsArray = newProjectOrigins
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const proj = db.createProject(currentTenantId, {
        name: newProjectName.trim(),
        environment: newProjectEnv,
        primaryIntegrationMethod: newProjectMethod,
        allowedOrigins: originsArray.length > 0 ? originsArray : ['*'],
        defaultWorkflowId: newProjectWorkflow,
      });
      setSelectedProjectId(proj.id);
      setIsCreateProjectOpen(false);
      setNewProjectName('');
      setProjectCreateError(null);
      setProjectsVersion((v) => v + 1);
    } catch (err: any) {
      setProjectCreateError(err.message || 'Failed to create project');
    }
  };

  // Key Generation State
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{ rawKey: string; keyPrefix: string } | null>(null);
  const [keyGenError, setKeyGenError] = useState<string | null>(null);

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyGenError(null);
    try {
      const { credential: cred, secretKey } = db.createApiCredential(
        currentTenantId,
        selectedProjectId,
        newKeyEnv,
        newKeyName.trim() || 'API Secret Key'
      );
      setGeneratedKeyResult({ rawKey: secretKey, keyPrefix: cred.keyPrefix });
      setProjectsVersion((v) => v + 1);
    } catch (err: any) {
      setKeyGenError(err.message || 'Key generation failed');
    }
  };

  // Sandbox Sub-tab & Embedded Web SDK Simulator State
  const [sandboxSubTab, setSandboxSubTab] = useState<'pipeline' | 'sdk_playground'>('pipeline');
  const [sdkState, setSdkState] = useState<'IDLE' | 'MOUNTED' | 'STEP_DOC' | 'STEP_FACE' | 'COMPLETED' | 'ERROR'>('IDLE');
  const [sdkEvents, setSdkEvents] = useState<Array<{ time: string; event: string; payload: any }>>([]);
  const [sdkSessionId, setSdkSessionId] = useState<string | null>(null);
  const [sdkSessionToken, setSdkSessionToken] = useState<string | null>(null);
  const [sdkWebhookDelivery, setSdkWebhookDelivery] = useState<any | null>(null);

  const handleMountEmbeddedSdk = () => {
    const sessId = `sess_safari_lending_${Date.now()}`;
    const sessToken = `tok_embed_${Math.random().toString(36).substring(2, 10)}`;
    setSdkSessionId(sessId);
    setSdkSessionToken(sessToken);
    setSdkState('MOUNTED');
    setSdkWebhookDelivery(null);

    const now = new Date().toLocaleTimeString();
    const initLogs = [
      { time: now, event: 'ICE_VERIFY_READY', payload: { version: '1.4.0', session_token: sessToken, container: 'ice-verify-embed' } }
    ];
    setSdkEvents(initLogs);

    // Simulate Step 1: Document Upload
    setTimeout(() => {
      setSdkState('STEP_DOC');
      setSdkEvents((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          event: 'ICE_VERIFY_STEP_CHANGE',
          payload: { step: 'DOCUMENT_CAPTURE', prompt: 'Hold Kenyan National ID within frame', blur_quality: 0.94 }
        }
      ]);
    }, 1200);

    // Simulate Step 2: Facial Biometric Liveness
    setTimeout(() => {
      setSdkState('STEP_FACE');
      setSdkEvents((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          event: 'ICE_VERIFY_STEP_CHANGE',
          payload: { step: 'BIOMETRIC_LIVENESS', challenge: 'Look straight at camera', passive_pad_score: 0.98 }
        }
      ]);
    }, 2500);

    // Simulate Step 3: Completion & Webhook Dispatch
    setTimeout(() => {
      setSdkState('COMPLETED');
      const completeEvent = {
        time: new Date().toLocaleTimeString(),
        event: 'ICE_VERIFY_COMPLETE',
        payload: {
          sessionId: sessId,
          customer_reference_id: 'LOAN-APP-8849',
          status: 'VERIFIED',
          risk_score: 8,
          timestamp: new Date().toISOString()
        }
      };
      setSdkEvents((prev) => [...prev, completeEvent]);

      // Trigger Webhook Delivery in Store
      const deliveries = db.triggerWebhookDelivery(
        currentTenantId,
        'verification.completed',
        {
          session_id: sessId,
          customer_reference_id: 'LOAN-APP-8849',
          status: 'VERIFIED',
          risk_score: 8,
          workflow_id: 'wf_kenya_standard'
        },
        selectedProjectId
      );
      setSdkWebhookDelivery(deliveries[0] || null);
      setProjectsVersion((v) => v + 1);
    }, 3800);
  };

  // Interactive Automation Sandbox Runner State
  const [selectedScenario, setSelectedScenario] = useState<'clean' | 'blur' | 'altered' | 'mrz_discrepancy'>('clean');
  const [sandboxDocType, setSandboxDocType] = useState('KE_NATIONAL_ID');
  const [sandboxIdNumber, setSandboxIdNumber] = useState('28471920');
  const [sandboxFullName, setSandboxFullName] = useState('David Mwangi Kariuki');
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [pipelineTrace, setPipelineTrace] = useState<PipelineExecutionTrace | null>(null);
  const [isExecutingSandbox, setIsExecutingSandbox] = useState(false);

  const handleApplyScenario = (scenario: 'clean' | 'blur' | 'altered' | 'mrz_discrepancy') => {
    setSelectedScenario(scenario);
    if (scenario === 'clean') {
      setSandboxDocType('KE_NATIONAL_ID');
      setSandboxIdNumber('28471920');
      setSandboxFullName('David Mwangi Kariuki');
    } else if (scenario === 'blur') {
      setSandboxDocType('KE_NATIONAL_ID');
      setSandboxIdNumber('24918231');
      setSandboxFullName('Amina Fatuma Hassan');
    } else if (scenario === 'altered') {
      setSandboxDocType('KE_NATIONAL_ID');
      setSandboxIdNumber('31094821');
      setSandboxFullName('Brian Kiprono Chebet');
    } else if (scenario === 'mrz_discrepancy') {
      setSandboxDocType('KE_PASSPORT');
      setSandboxIdNumber('AK091823');
      setSandboxFullName('Wanjiku Grace Karanja');
    }
  };

  const handleRunSandbox = () => {
    setIsExecutingSandbox(true);
    setSandboxResponse(null);
    setPipelineTrace(null);

    setTimeout(() => {
      const fileName = selectedScenario === 'blur' ? 'national_id_blurry_0.52.jpg'
                     : selectedScenario === 'altered' ? 'national_id_altered_dob.jpg'
                     : 'national_id_front_300dpi.jpg';

      const trace = automatedPipeline.processVerification({
        tenantId: currentTenantId,
        sessionId: `sess_sand_${Date.now()}`,
        documentType: sandboxDocType as any,
        fileName,
        fileSizeBytes: selectedScenario === 'blur' ? 120_000 : 480_000,
        applicantInput: {
          fullName: sandboxFullName,
          idNumber: sandboxIdNumber,
          dob: selectedScenario === 'altered' ? '1995-07-28' : '1992-04-14',
        },
        selfieProvided: true,
        biometricConsentGiven: true,
      });

      setPipelineTrace(trace);
      setSandboxResponse(JSON.stringify(trace, null, 2));
      setIsExecutingSandbox(false);
    }, 450);
  };

  // Developer Access Management (Organization Owner only)
  const [inviteDevEmail, setInviteDevEmail] = useState('');
  const [inviteDevName, setInviteDevName] = useState('');
  const [inviteDevRole, setInviteDevRole] = useState<OrganizationRole>('DEVELOPER');
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  const handleInviteDeveloper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteDevEmail.trim() || !inviteDevName.trim()) return;
    const res = unifiedAuth.inviteDeveloperToOrganization(
      currentUser?.email || '',
      currentTenantId,
      inviteDevEmail,
      inviteDevName,
      inviteDevRole
    );
    setInviteFeedback(res.message);
    if (res.success) {
      setInviteDevEmail('');
      setInviteDevName('');
      setTimeout(() => setInviteFeedback(null), 4000);
    }
  };

  // Test Webhook Dispatch Simulation
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);
  const handleDispatchTestWebhook = () => {
    setTestWebhookStatus('Computing HMAC-SHA256 signature and sending test payload...');
    setTimeout(() => {
      setTestWebhookStatus('Test webhook successfully delivered to endpoint (HTTP 200 OK, latency: 142ms).');
      setTimeout(() => setTestWebhookStatus(null), 3500);
    }, 800);
  };

  // Nav Groups for Persistent Left Sidebar
  const navGroups: NavGroup[] = [
    {
      title: 'Documentation',
      items: [
        { id: 'overview', label: 'Developer Overview', icon: BookOpen },
        { id: 'api_docs', label: 'API Documentation', icon: Code2 },
        { id: 'sdks', label: 'SDKs & Libraries', icon: Terminal },
      ],
    },
    {
      title: 'Integration Tools',
      items: [
        { id: 'credentials', label: 'API Credentials', icon: Key },
        { id: 'sandbox', label: 'API Sandbox', icon: Play },
        { id: 'webhooks', label: 'Webhooks', icon: Webhook },
        { id: 'delivery_history', label: 'Delivery History', icon: Activity, badge: db.webhookDeliveries.length },
      ],
    },
    {
      title: 'Monitoring & Ops',
      items: [
        { id: 'logs', label: 'Integration Logs', icon: FileCode2 },
        { id: 'usage', label: 'Usage & Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Developer Settings', icon: Sliders },
      ],
    },
  ];

  return (
    <PortalShell
      portalType="developers"
      portalTitle="ICE Developer Portal"
      portalSubtitle="API v1.4 • REST, SDKs & Webhooks"
      portalBadge={{ label: 'SANDBOX & PROD', variant: 'ice' }}
      navGroups={navGroups}
      activeItemId={activeTab}
      onNavigate={(id) => setActiveTab(id as any)}
      headerControls={
        <div className="flex items-center gap-2">
          {/* Multi-Organization Switcher */}
          {currentUser && currentUser.organizations.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#172B43] px-2.5 py-1 rounded border border-slate-200 dark:border-[#203652] text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#2676D2] dark:text-cyan-300" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Org Context</span>
                <select
                  value={currentTenantId}
                  onChange={(e) => handleOrgSwitch(e.target.value)}
                  className="bg-transparent text-slate-900 dark:text-white font-semibold outline-none cursor-pointer text-xs pr-1"
                >
                  {currentUser.organizations.map((org) => (
                    <option key={org.organizationId} value={org.organizationId} className="bg-white dark:bg-[#101C2C] text-slate-900 dark:text-white">
                      {org.organizationName} {org.isOwner ? '(Owner)' : `(${org.role})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Unified Identity Status Badge */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                  {isOwner ? '👑 Organization Owner' : '💻 Developer'}
                </span>
                <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[130px] sm:max-w-none">
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-[10px] text-[#2676D2] dark:text-cyan-300 hover:underline ml-1 cursor-pointer"
                title="Switch Account"
              >
                Switch
              </button>
              <button
                onClick={async () => {
                  await supabaseAuth.signOut();
                  setCurrentUser(null);
                }}
                className="text-[10px] text-red-600 dark:text-red-400 hover:underline ml-1 cursor-pointer"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold rounded cursor-pointer transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Developer Sign In</span>
            </button>
          )}

          <a
            href="/verify"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Hosted Verify</span>
          </a>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Private Tools Lock Notice when not logged in */}
        {!isDeveloperLoggedIn && activeTab !== 'overview' && activeTab !== 'api_docs' && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 shrink-0" />
              <span>Private developer credentials and webhooks require an individual developer account or organization invite.</span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded shrink-0 cursor-pointer"
            >
              Sign In as Developer
            </button>
          </div>
        )}

        {/* Integration Project Context Bar */}
        <div className="bg-white dark:bg-[#172B43] p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-[#2676D2] dark:text-cyan-300 shrink-0">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">Active Integration Project:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded px-2 py-0.5 font-semibold text-slate-800 dark:text-slate-100 text-xs outline-none cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.environment})
                    </option>
                  ))}
                </select>
                {activeProject && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    activeProject.environment === 'PRODUCTION'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300'
                  }`}>
                    {activeProject.environment}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Method: <span className="font-mono text-slate-700 dark:text-slate-300">{activeProject?.primaryIntegrationMethod || 'EMBEDDED_WEB_SDK'}</span> • Allowed Origins: <span className="font-mono text-slate-700 dark:text-slate-300">{activeProject?.allowedOrigins.join(', ') || '*'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#101C2C] dark:hover:bg-[#203652] text-slate-700 dark:text-slate-200 font-semibold rounded border border-slate-200 dark:border-[#203652] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* 1. DEVELOPER OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-xs">
            <div className="bg-white dark:bg-[#172B43] p-6 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#203652] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Integrating with ICE Identity Platform</h2>
                  <p className="text-[#536273] dark:text-[#8E9BAE] mt-0.5">
                    Embed enterprise identity document verification, OCR extraction, and biometric liveness into your web and mobile applications.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-mono font-semibold">
                  API Operational (100%)
                </span>
              </div>

              {/* 3-Step Integration Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-2">
                  <div className="w-6 h-6 rounded-full bg-[#2676D2] text-white font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white block">Create Session</span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Call <code className="font-mono text-slate-800 dark:text-slate-200">POST /v1/verifications</code> from your backend server using your Bearer secret API key.
                  </p>
                </div>

                <div className="p-3.5 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-2">
                  <div className="w-6 h-6 rounded-full bg-[#2676D2] text-white font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white block">Direct Customer to Verify</span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Direct the applicant to the returned <code className="font-mono text-slate-800 dark:text-slate-200">hosted_url</code> via SMS, email, or iframe.
                  </p>
                </div>

                <div className="p-3.5 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-2">
                  <div className="w-6 h-6 rounded-full bg-[#2676D2] text-white font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white block">Receive Webhook Decision</span>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Receive an HMAC-SHA256 signed event (<code className="font-mono text-slate-800 dark:text-slate-200">verification.completed</code>) with OCR results and risk score.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Authentication Overview */}
            <div className="bg-white dark:bg-[#172B43] p-5 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#101C2C] dark:text-white">Authentication Architecture</h3>
              <p className="text-[#536273] dark:text-[#8E9BAE] leading-relaxed">
                All API requests must include your API secret key passed in the <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code> HTTP header.
                Keys prefixed with <code className="font-mono text-blue-600 dark:text-cyan-300">ice_test_</code> execute in Sandbox mode; keys prefixed with <code className="font-mono text-emerald-600 dark:text-emerald-400">ice_live_</code> operate on real tenant production records.
              </p>
              <div className="p-3 bg-[#101C2C] text-slate-200 rounded font-mono text-[11px]">
                curl -H &quot;Authorization: Bearer ice_test_4m8k_demo&quot; https://api.ice.example/v1/verifications
              </div>
            </div>
          </div>
        )}

        {/* 2. PUBLIC API DOCUMENTATION (NO LOGIN REQUIRED) */}
        {activeTab === 'api_docs' && (
          <PublicDocumentation onOpenDeveloperAuth={() => setIsAuthModalOpen(true)} />
        )}

        {/* 3. API CREDENTIALS */}
        {activeTab === 'credentials' && (
          <div className="space-y-4 text-xs">
            {/* Status & Key Generation Header */}
            <div className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">API Credentials &amp; Project Access Keys</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    isProductionApproved
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {isProductionApproved ? 'PRODUCTION APPROVED' : 'SANDBOX ACTIVE'}
                  </span>
                </div>
                <p className="text-[#536273] dark:text-[#8E9BAE] mt-0.5">
                  Secret keys are salted and hashed at rest. Raw keys are shown only once upon generation.
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsKeyModalOpen(true);
                  setGeneratedKeyResult(null);
                  setKeyGenError(null);
                  setNewKeyName('');
                }}
                className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generate New Key</span>
              </button>
            </div>

            {/* List of Credentials */}
            <div className="space-y-3">
              {db.apiCredentials
                .filter((c) => c.organizationId === currentTenantId)
                .map((cred) => {
                  const proj = projects.find((p) => p.id === cred.projectId);
                  return (
                    <div key={cred.id} className="bg-white dark:bg-[#172B43] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{cred.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                            cred.environment === 'PRODUCTION'
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-cyan-300 border border-blue-200 dark:border-blue-900'
                          }`}>
                            {cred.environment}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            cred.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            {cred.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="bg-[#F4F7FA] dark:bg-[#101C2C] px-2 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300 border border-[#CBD5E1] dark:border-[#203652]">
                            {cred.keyPrefix}••••••••••••••••••••
                          </code>
                          <span className="text-[11px] text-slate-400 dark:text-slate-400">
                            Project: <strong className="text-slate-700 dark:text-slate-200">{proj?.name || 'Default Project'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px] text-slate-400 font-mono">
                          Last used: {cred.lastUsedAt ? formatDateOnly(cred.lastUsedAt) : 'Never'}
                        </div>
                        {cred.status === 'ACTIVE' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                try {
                                  const rot = db.rotateApiCredential(currentTenantId, cred.id);
                                  setGeneratedKeyResult({ rawKey: rot.newSecretKey, keyPrefix: rot.newCredential.keyPrefix });
                                  setIsKeyModalOpen(true);
                                  setProjectsVersion((v) => v + 1);
                                } catch (e: any) {
                                  alert(e.message);
                                }
                              }}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#101C2C] rounded border border-slate-200 dark:border-[#203652] cursor-pointer"
                              title="Rotate Key (Invalidates old key)"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Revoke API key ${cred.name}? Requests using this key will immediately fail.`)) {
                                  db.revokeApiCredential(currentTenantId, cred.id);
                                  setProjectsVersion((v) => v + 1);
                                }
                              }}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded border border-red-200 dark:border-red-900 cursor-pointer"
                              title="Revoke Key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 4. API SANDBOX (PIPELINE SIMULATOR + EMBEDDED WEB SDK PLAYGROUND) */}
        {activeTab === 'sandbox' && (
          <div className="space-y-4 text-xs">
            {/* Sub-tab Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#203652] pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSandboxSubTab('pipeline')}
                  className={`px-3 py-1.5 rounded font-semibold transition-colors cursor-pointer text-xs ${
                    sandboxSubTab === 'pipeline'
                      ? 'bg-[#2676D2] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#172B43] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  1. 9-Stage Automated Pipeline Forensics
                </button>
                <button
                  onClick={() => setSandboxSubTab('sdk_playground')}
                  className={`px-3 py-1.5 rounded font-semibold transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                    sandboxSubTab === 'sdk_playground'
                      ? 'bg-[#2676D2] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#172B43] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. Embedded Web SDK Simulator (Safari Pesa Kenya)</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <span>Active Project:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{activeProject?.name || 'Default Project'}</span>
              </div>
            </div>

            {/* A. 9-STAGE PIPELINE SIMULATOR */}
            {sandboxSubTab === 'pipeline' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white dark:bg-[#172B43] p-5 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Automation-First KYC Simulator</h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-[#2676D2] dark:text-cyan-300 font-semibold border border-blue-200 dark:border-blue-900">
                          9-Stage Pipeline
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                        Simulate end-to-end automated verification. Straightforward requests complete automatically in &lt;2s; uncertain requests escalate to review.
                      </p>
                    </div>

                    {/* Scenario Quick Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        Select Verification Test Scenario:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyScenario('clean')}
                          className={`p-2 rounded text-left border transition-all cursor-pointer ${
                            selectedScenario === 'clean'
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                              : 'border-slate-200 dark:border-[#203652] hover:bg-slate-50 dark:hover:bg-[#101C2C] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold text-[11px] block">1. Clean National ID</span>
                          <span className="text-[10px] opacity-80 block">Automated Straight-Through Pass</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyScenario('blur')}
                          className={`p-2 rounded text-left border transition-all cursor-pointer ${
                            selectedScenario === 'blur'
                              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                              : 'border-slate-200 dark:border-[#203652] hover:bg-slate-50 dark:hover:bg-[#101C2C] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold text-[11px] block">2. Borderline Optical Blur</span>
                          <span className="text-[10px] opacity-80 block">Triggers Recapture / Review</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyScenario('altered')}
                          className={`p-2 rounded text-left border transition-all cursor-pointer ${
                            selectedScenario === 'altered'
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                              : 'border-slate-200 dark:border-[#203652] hover:bg-slate-50 dark:hover:bg-[#101C2C] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold text-[11px] block">3. Altered Font on DOB</span>
                          <span className="text-[10px] opacity-80 block">Automated Fraud Rejection</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyScenario('mrz_discrepancy')}
                          className={`p-2 rounded text-left border transition-all cursor-pointer ${
                            selectedScenario === 'mrz_discrepancy'
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                              : 'border-slate-200 dark:border-[#203652] hover:bg-slate-50 dark:hover:bg-[#101C2C] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold text-[11px] block">4. Passport MRZ Mismatch</span>
                          <span className="text-[10px] opacity-80 block">Exception Review Triggered</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-[#203652]">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Document Type</label>
                        <select
                          value={sandboxDocType}
                          onChange={(e) => setSandboxDocType(e.target.value)}
                          className="w-full p-2 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#CBD5E1] dark:border-[#203652] rounded text-[#101C2C] dark:text-white text-xs outline-none"
                        >
                          <option value="KE_NATIONAL_ID">Kenyan National ID (8-Digit)</option>
                          <option value="KE_PASSPORT">Kenyan Passport (East African Community)</option>
                          <option value="KE_KRA_PIN">KRA PIN Certificate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Full Legal Name</label>
                        <input
                          type="text"
                          value={sandboxFullName}
                          onChange={(e) => setSandboxFullName(e.target.value)}
                          className="w-full p-2 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#CBD5E1] dark:border-[#203652] rounded text-[#101C2C] dark:text-white text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">National ID / Document Number</label>
                        <input
                          type="text"
                          value={sandboxIdNumber}
                          onChange={(e) => setSandboxIdNumber(e.target.value)}
                          className="w-full p-2 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#CBD5E1] dark:border-[#203652] rounded text-[#101C2C] dark:text-white text-xs outline-none font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isExecutingSandbox}
                        onClick={handleRunSandbox}
                        className="w-full py-2.5 px-3 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isExecutingSandbox ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Evaluating 9 Pipeline Stages...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Execute Automated KYC Pipeline</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sandbox Output Preview */}
                <div className="lg:col-span-7 space-y-3">
                  {pipelineTrace ? (
                    <div className="space-y-4">
                      {/* Decision Banner */}
                      <div className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                        pipelineTrace.stages.automatedDecision.outcome === 'AUTOMATICALLY_APPROVED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                          : pipelineTrace.stages.automatedDecision.outcome === 'AUTOMATICALLY_REJECTED'
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                          : pipelineTrace.stages.automatedDecision.outcome === 'WAITING_FOR_APPLICANT'
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            {pipelineTrace.stages.automatedDecision.outcome === 'AUTOMATICALLY_APPROVED' && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                            {pipelineTrace.stages.automatedDecision.outcome === 'AUTOMATICALLY_REJECTED' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                            {pipelineTrace.stages.automatedDecision.outcome === 'NEEDS_HUMAN_REVIEW' && <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                            {pipelineTrace.stages.automatedDecision.outcome === 'WAITING_FOR_APPLICANT' && <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                            <span>Decision: {pipelineTrace.stages.automatedDecision.outcome.replace(/_/g, ' ')}</span>
                          </div>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 font-semibold">
                            Latency: {pipelineTrace.totalDurationMs}ms
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{pipelineTrace.stages.automatedDecision.primaryReason}</p>
                      </div>

                      {/* 4 Core Stages */}
                      <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs space-y-3">
                        <h3 className="font-bold text-xs text-[#101C2C] dark:text-white uppercase tracking-wider">
                          Automated Pipeline Execution Trace
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div className="p-2.5 rounded bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] space-y-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">1. Optical Quality</span>
                            <p className="text-[11px] text-slate-500">Blur: {(pipelineTrace.stages.documentQuality.blurScore * 100).toFixed(0)}% • {pipelineTrace.stages.documentQuality.resolutionDpi} DPI</p>
                          </div>
                          <div className="p-2.5 rounded bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] space-y-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">2. OCR Data Extraction</span>
                            <p className="text-[11px] text-slate-500">Avg Confidence: {(pipelineTrace.stages.ocrExtraction.fieldConfidenceAverage * 100).toFixed(0)}%</p>
                          </div>
                          <div className="p-2.5 rounded bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] space-y-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">3. Document Forensics</span>
                            <p className="text-[11px] text-slate-500">Layout Consistency: {(pipelineTrace.stages.documentAnalysis.layoutConsistencyScore * 100).toFixed(0)}%</p>
                          </div>
                          <div className="p-2.5 rounded bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] space-y-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">4. Biometric 1:1 Match</span>
                            <p className="text-[11px] text-slate-500">Similarity: {(pipelineTrace.stages.biometricVerification.faceSimilarityScore || 0).toFixed(2)} (Threshold: 0.85)</p>
                          </div>
                        </div>
                      </div>

                      {/* JSON Payload */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-[#536273]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">API Response Payload (JSON)</span>
                          <button
                            onClick={() => handleCopy(sandboxResponse || '', 'sandbox')}
                            className="flex items-center gap-1 text-[#2676D2] dark:text-cyan-300 hover:underline cursor-pointer"
                          >
                            {copiedKey === 'sandbox' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === 'sandbox' ? 'Copied' : 'Copy JSON'}</span>
                          </button>
                        </div>
                        <div className="bg-[#101C2C] rounded-lg p-4 font-mono text-[11px] text-slate-300 max-h-[280px] overflow-y-auto border border-[#172B43]">
                          <pre className="leading-relaxed">{sandboxResponse}</pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#101C2C] rounded-lg p-8 font-mono text-[11px] text-slate-300 min-h-[380px] flex flex-col items-center justify-center text-center border border-[#172B43] space-y-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-[#26B8C7]">
                        <Terminal className="w-6 h-6" />
                      </div>
                      <div className="max-w-sm space-y-1">
                        <h3 className="font-bold text-white text-sm">Automated Pipeline Test Harness</h3>
                        <p className="text-slate-400 text-xs">
                          Select a test scenario on the left and click &quot;Execute Automated KYC Pipeline&quot; to inspect real-time quality evaluation, OCR confidence, forensic tampering checks, and policy decisions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* B. EMBEDDED WEB SDK SIMULATOR */}
            {sandboxSubTab === 'sdk_playground' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                {/* Left: Kenyan Lending App Mock UI */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs overflow-hidden">
                    {/* Simulated Browser Address Bar */}
                    <div className="bg-slate-100 dark:bg-[#101C2C] px-4 py-2 border-b border-slate-200 dark:border-[#203652] flex items-center gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div className="flex-1 bg-white dark:bg-[#172B43] px-2.5 py-1 rounded text-slate-600 dark:text-slate-300 font-mono text-[10px] flex items-center gap-1 border border-slate-200 dark:border-[#203652]">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>https://lending.example.com/apply/loan-8849/verify</span>
                      </div>
                    </div>

                    {/* Safari Pesa Lending Funnel */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#203652]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">Safari Pesa Microfinance</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">LENDING APP</span>
                          </div>
                          <span className="text-[11px] text-slate-500">Applicant: David Mwangi Kariuki • Loan #LOAN-APP-8849 (KES 25,000)</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          Step 3 of 4: KYC
                        </span>
                      </div>

                      {/* Embedded Container Frame */}
                      <div className="border-2 border-dashed border-slate-300 dark:border-[#203652] rounded-lg p-4 bg-slate-50/50 dark:bg-[#101C2C] min-h-[300px] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                            <span>#ice-verify-embed</span>
                            <span>origin: https://lending.example.com</span>
                          </div>

                          {sdkState === 'IDLE' && (
                            <div className="text-center py-12 space-y-3">
                              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-[#2676D2] dark:text-cyan-300 flex items-center justify-center mx-auto">
                                <Terminal className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Ready to Mount Embedded SDK</h4>
                                <p className="text-slate-500 text-[11px] max-w-xs mx-auto mt-1">
                                  Safari Pesa initialized session token. Click below to instantiate <code className="font-mono">new IceVerify()</code>.
                                </p>
                              </div>
                              <button
                                onClick={handleMountEmbeddedSdk}
                                className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Mount @ice-identity/verify-sdk</span>
                              </button>
                            </div>
                          )}

                          {sdkState === 'MOUNTED' && (
                            <div className="text-center py-10 space-y-3">
                              <RefreshCw className="w-8 h-8 text-[#2676D2] animate-spin mx-auto" />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">Handshake Established (ICE_VERIFY_READY)</span>
                                <span className="text-[11px] text-slate-500">Requesting camera permissions and initializing capture engine...</span>
                              </div>
                            </div>
                          )}

                          {sdkState === 'STEP_DOC' && (
                            <div className="p-4 bg-white dark:bg-[#172B43] rounded border border-blue-200 dark:border-blue-900 text-center space-y-2">
                              <div className="w-48 h-28 mx-auto border-2 border-emerald-500 rounded bg-slate-900 text-emerald-400 flex flex-col items-center justify-center p-2 relative overflow-hidden">
                                <span className="text-[9px] font-mono text-emerald-300">JAMHURI YA KENYA</span>
                                <span className="text-[10px] font-bold">NATIONAL IDENTITY CARD</span>
                                <span className="text-[9px] font-mono text-slate-400 mt-2">ID: 28471920 • KARU...</span>
                                <div className="absolute inset-x-0 h-0.5 bg-emerald-400/80 top-1/2 animate-pulse" />
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white block">Step 1: Document Capture (Kenyan National ID)</span>
                              <span className="text-[11px] text-emerald-600 font-semibold">Optical Resolution: 360 DPI • Blur: 0.94 (PASS)</span>
                            </div>
                          )}

                          {sdkState === 'STEP_FACE' && (
                            <div className="p-4 bg-white dark:bg-[#172B43] rounded border border-purple-200 dark:border-purple-900 text-center space-y-2">
                              <div className="w-28 h-28 mx-auto rounded-full border-2 border-purple-500 bg-slate-900 text-purple-300 flex flex-col items-center justify-center p-2 relative">
                                <UserCheck className="w-10 h-10 text-purple-400 animate-pulse" />
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white block">Step 2: Passive Biometric Liveness Challenge</span>
                              <span className="text-[11px] text-purple-600 dark:text-purple-300 font-semibold">Challenge: Look Straight • Anti-Spoof Conf: 0.98</span>
                            </div>
                          )}

                          {sdkState === 'COMPLETED' && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
                              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                                <Check className="w-6 h-6" />
                              </div>
                              <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm block">Identity Verification Complete</span>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                Session completed. Signed webhook dispatched to Safari Pesa lending backend. Loan Underwriting Approved!
                              </p>
                              <button
                                onClick={handleMountEmbeddedSdk}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] cursor-pointer mt-2"
                              >
                                Re-run Verification Demo
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-[#203652] flex items-center justify-between text-[11px] text-slate-500">
                          <span>Token: <code className="font-mono">{sdkSessionToken || 'none'}</code></span>
                          <span>Container: <code className="font-mono">iframe (cross-origin)</code></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: postMessage Events & Signed Webhook Inspector */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Event Stream */}
                  <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#203652] pb-2">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-slate-900 dark:text-white">postMessage Event Bus Stream</h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#101C2C] text-slate-600 dark:text-slate-300">
                        {sdkEvents.length} events received
                      </span>
                    </div>

                    <div className="bg-[#101C2C] p-3 rounded font-mono text-[11px] text-slate-300 space-y-2 max-h-[180px] overflow-y-auto border border-[#203652]">
                      {sdkEvents.length === 0 ? (
                        <span className="text-slate-500 italic">No events emitted yet. Mount SDK to begin handshake.</span>
                      ) : (
                        sdkEvents.map((ev, i) => (
                          <div key={i} className="border-b border-slate-800 pb-1.5 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between text-cyan-300">
                              <span>[{ev.time}] {ev.event}</span>
                              <span className="text-[9px] text-slate-500">cross-origin</span>
                            </div>
                            <pre className="text-[10px] text-slate-400 mt-0.5">{JSON.stringify(ev.payload)}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Dispatched Webhook Callback & HMAC-SHA256 Signature */}
                  <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#203652] pb-2">
                      <div className="flex items-center gap-2">
                        <Webhook className="w-4 h-4 text-[#2676D2] dark:text-cyan-300" />
                        <h3 className="font-bold text-slate-900 dark:text-white">HMAC-SHA256 Signed Webhook Callback</h3>
                      </div>
                      {sdkWebhookDelivery && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                          HTTP 200 OK
                        </span>
                      )}
                    </div>

                    {sdkWebhookDelivery ? (
                      <div className="space-y-2 font-mono text-[11px]">
                        <div className="p-2.5 rounded bg-slate-50 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Headers:</span>
                          <div className="text-slate-700 dark:text-slate-300 break-all text-[10px]">
                            <strong>X-ICE-Signature:</strong> {sdkWebhookDelivery.signatureHeader}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-[10px]">
                            <strong>X-ICE-Timestamp:</strong> {sdkWebhookDelivery.timestamp}
                          </div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] pt-1">
                            ✓ Timing-Safe HMAC Verified • Replay Guard: Valid (&lt;300s window)
                          </div>
                        </div>

                        <div className="bg-[#101C2C] p-3 rounded text-slate-300 max-h-[140px] overflow-y-auto border border-[#203652]">
                          <pre className="text-[10px] leading-relaxed">{JSON.stringify(JSON.parse(sdkWebhookDelivery.payloadSnippet || '{}'), null, 2)}</pre>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-[11px] bg-slate-50 dark:bg-[#101C2C] rounded border border-dashed border-slate-200 dark:border-[#203652]">
                        Webhook callback will trigger automatically upon applicant completing verification in the left container.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. WEBHOOKS */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6 text-xs">
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#101C2C]">Webhook Endpoints & HMAC Signing</h2>
                  <p className="text-[#536273] mt-0.5">
                    ICE verifies callbacks using HMAC-SHA256 signatures passed in the <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">X-ICE-Signature</code> header.
                  </p>
                </div>
                <button
                  onClick={handleDispatchTestWebhook}
                  className="px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Test Event</span>
                </button>
              </div>

              {testWebhookStatus && (
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {testWebhookStatus}
                </div>
              )}

              <div className="bg-[#101C2C] p-4 rounded text-slate-200 font-mono text-[11px] overflow-x-auto">
                <pre>{`// Node.js Verification Example
const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, secretKey) {
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature));
}`}</pre>
              </div>
            </div>

            {/* Configured Endpoints */}
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#101C2C]">Registered Endpoints</h3>
              <div className="space-y-2">
                {db.webhookEndpoints
                  .filter((w) => w.organizationId === currentTenantId)
                  .map((hook) => (
                    <div key={hook.id} className="p-3 rounded border border-[#E2E8F0] bg-[#F4F7FA] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-slate-900">{hook.url}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Subscribed Events: <span className="font-mono text-slate-700">{hook.events.join(', ')}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. DELIVERY HISTORY */}
        {activeTab === 'delivery_history' && (
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden text-xs">
            <div className="p-4 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-bold text-[#101C2C]">Webhook Delivery History</h2>
              <p className="text-slate-500 text-[11px]">
                Immutable delivery logs with HTTP response status, latency, and payload snippets.
              </p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">Delivered At</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Payload Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {db.webhookDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {formatTimeOnly(del.deliveredAt)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {del.eventType}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
                        HTTP {del.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {del.latencyMs}ms
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {del.payloadSnippet}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. SDKS & LIBRARIES */}
        {activeTab === 'sdks' && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
              <h2 className="text-sm font-bold text-[#101C2C]">Official Client SDKs</h2>
              <p className="text-[#536273] mt-1">
                Install our official client libraries for type-safe integration with session handling and automated retry policies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <span className="font-bold text-slate-900 block">TypeScript / Node.js</span>
                <div className="bg-[#101C2C] p-2.5 rounded font-mono text-[11px] text-slate-200">
                  npm install @ice-identity/node-sdk
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <span className="font-bold text-slate-900 block">Python (3.9+)</span>
                <div className="bg-[#101C2C] p-2.5 rounded font-mono text-[11px] text-slate-200">
                  pip install ice-identity-sdk
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. INTEGRATION LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden text-xs">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#101C2C]">Real-Time API Traffic Inspector</h2>
                <p className="text-slate-500 text-[11px]">Live stream of incoming requests originating from your API credentials.</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">Live 200 OK</span>
            </div>

            <table className="w-full text-left">
              <thead className="bg-[#F4F7FA] text-[#536273] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Client IP</th>
                  <th className="px-4 py-3">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                <tr>
                  <td className="px-4 py-3 font-mono text-slate-500">14:32:10</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">POST</td>
                  <td className="px-4 py-3 font-mono text-slate-800">/v1/sessions</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-mono">201</span></td>
                  <td className="px-4 py-3 font-mono text-slate-500">102.219.208.14</td>
                  <td className="px-4 py-3 font-mono text-slate-600">148ms</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-slate-500">14:15:22</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">GET</td>
                  <td className="px-4 py-3 font-mono text-slate-800">/v1/verifications/sess_apex_101</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-mono">200</span></td>
                  <td className="px-4 py-3 font-mono text-slate-500">102.219.208.14</td>
                  <td className="px-4 py-3 font-mono text-slate-600">42ms</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 9. USAGE & ANALYTICS */}
        {activeTab === 'usage' && (
          <div className="space-y-6 text-xs">
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-xs">
              <h2 className="text-sm font-bold text-[#101C2C]">API Quota & Request Volume</h2>
              <p className="text-slate-500 text-[11px] mt-0.5">Monthly API consumption and throughput metrics for {currentTenantId}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <span className="text-slate-500 block">Monthly Request Quota</span>
                <span className="text-2xl font-bold text-slate-900">1,420 / 10,000</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#2676D2] h-full" style={{ width: '14.2%' }} />
                </div>
                <span className="text-[10px] text-slate-400">14.2% consumed • Renews Dec 1</span>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <span className="text-slate-500 block">Average Response Time (p95)</span>
                <span className="text-2xl font-bold text-[#2676D2]">412ms</span>
                <span className="text-[10px] text-emerald-600 font-medium">Global CDN edge routing</span>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs space-y-2">
                <span className="text-slate-500 block">Error Rate</span>
                <span className="text-2xl font-bold text-emerald-600">0.02%</span>
                <span className="text-[10px] text-slate-400">Within 99.9% uptime SLA</span>
              </div>
            </div>
          </div>
        )}

        {/* 10. DEVELOPER SETTINGS (ORGANIZATION ACCESS & ENGINE TRANSPARENCY) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 text-xs">
            {/* A. Unified Organization Context & Developer Access Management */}
            <div className="bg-white dark:bg-[#172B43] p-5 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#203652] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Organization Developer Access & Team Roles</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                      Unified Supabase Auth
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Organization owners have automatic developer access. Individual developers have independently configurable permissions and cannot grant themselves owner privileges.
                  </p>
                </div>
              </div>

              {/* Owner Invite Developer Form */}
              {isOwner ? (
                <form onSubmit={handleInviteDeveloper} className="p-4 rounded-lg bg-slate-50 dark:bg-[#101C2C] border border-slate-200 dark:border-[#203652] space-y-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    Invite Individual Developer into {activeMembership?.organizationName}
                  </span>
                  
                  {inviteFeedback && (
                    <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-[#2676D2] dark:text-cyan-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{inviteFeedback}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 text-[11px] mb-1">Developer Email</label>
                      <input
                        type="email"
                        required
                        value={inviteDevEmail}
                        onChange={(e) => setInviteDevEmail(e.target.value)}
                        placeholder="engineer@partner.com"
                        className="w-full p-2 bg-white dark:bg-[#172B43] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 text-[11px] mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={inviteDevName}
                        onChange={(e) => setInviteDevName(e.target.value)}
                        placeholder="e.g. Jane Wambua"
                        className="w-full p-2 bg-white dark:bg-[#172B43] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 text-[11px] mb-1">Assigned Role</label>
                      <select
                        value={inviteDevRole}
                        onChange={(e) => setInviteDevRole(e.target.value as OrganizationRole)}
                        className="w-full p-2 bg-white dark:bg-[#172B43] border border-slate-300 dark:border-[#203652] rounded text-xs text-slate-900 dark:text-white outline-none"
                      >
                        <option value="DEVELOPER">Developer (API Keys, Webhooks, Sandbox)</option>
                        <option value="KYC_REVIEWER">KYC Reviewer (Manual Review Only)</option>
                        <option value="AUDITOR">Auditor (Read-Only Logs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Send Developer Invite</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>You are signed in as an Invited Developer. Only Organization Owners and Admins can invite new developers or configure production credentials.</span>
                </div>
              )}

              {/* Members Table */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Active Organization Members ({activeMembership?.organizationName})
                </span>
                <div className="border border-slate-200 dark:border-[#203652] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#101C2C] text-slate-500 font-medium border-b border-slate-200 dark:border-[#203652]">
                      <tr>
                        <th className="px-4 py-2.5">Member</th>
                        <th className="px-4 py-2.5">Email</th>
                        <th className="px-4 py-2.5">Role</th>
                        <th className="px-4 py-2.5">Authority Level</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#203652]">
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-[#1B2F4A]">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Edwin Nyamu</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Owner</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">owner@apexfinance.com</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950 text-[#2676D2] dark:text-cyan-300 font-semibold">
                            ORGANIZATION_OWNER
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">Company &amp; Developer Full Authority</td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-600">Active</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-[#1B2F4A]">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">David Kiprono</td>
                        <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">david.dev@apexfinance.com</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-[#101C2C] text-slate-700 dark:text-slate-300 font-semibold">
                            DEVELOPER
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">API Credentials &amp; Sandbox (No PII)</td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-600">Active</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-[#1B2F4A]">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">Sarah Chebet</td>
                        <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">sarah.compliance@apexfinance.com</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                            COMPLIANCE_MANAGER
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">Workspace Reviews &amp; Policies</td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-600">Active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* B. Implementation Honesty & Engine Specifications Matrix */}
            <div className="bg-white dark:bg-[#172B43] p-5 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#203652] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">ICE Engine Implementation Transparency Matrix</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Truthful classification of every processing engine. Disconnected external providers report NOT_PERFORMED or NOT_CONFIGURED.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-[#101C2C] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#203652]">
                  Part C &amp; D Implementation Honesty
                </span>
              </div>

              <div className="border border-slate-200 dark:border-[#203652] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#101C2C] text-slate-500 font-medium border-b border-slate-200 dark:border-[#203652]">
                    <tr>
                      <th className="px-4 py-2.5">Engine Name</th>
                      <th className="px-4 py-2.5">Classification</th>
                      <th className="px-4 py-2.5">Calibrated Accuracy / FAR / FRR</th>
                      <th className="px-4 py-2.5">Honest Status &amp; Integration State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#203652]">
                    {ENGINE_SPECIFICATIONS.map((eng) => (
                      <tr key={eng.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1B2F4A]">
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-slate-900 dark:text-white block">{eng.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{eng.version}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            eng.classification === 'IMPLEMENTED_AND_TESTED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : eng.classification === 'SIMULATED' || eng.classification === 'SANDBOX_ONLY'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}>
                            {eng.classification}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {eng.benchmarkFarFrr || 'N/A'}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {eng.honestStatusNotes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* C. Network Security & IP Restrictions */}
            <div className="bg-white dark:bg-[#172B43] p-5 rounded-lg border border-[#E2E8F0] dark:border-[#203652] shadow-xs space-y-4 text-xs">
              <h2 className="text-sm font-bold text-[#101C2C] dark:text-white">Network &amp; Security Hardening</h2>
              
              <div className="space-y-3">
                <div className="p-3 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-1">
                  <span className="font-semibold text-slate-900 dark:text-white block">IP Allowlisting</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Restrict API key usage to known corporate IP addresses or CIDR ranges.</p>
                  <input
                    type="text"
                    defaultValue="102.219.208.0/24"
                    className="w-full max-w-sm mt-1 p-2 bg-white dark:bg-[#172B43] border border-[#CBD5E1] dark:border-[#203652] rounded font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-3 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-1">
                  <span className="font-semibold text-slate-900 dark:text-white block">Webhook Timeout Threshold</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">ICE will abort delivery and queue retries if your server does not respond within this window.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      defaultValue={5000}
                      className="w-32 p-2 bg-white dark:bg-[#172B43] border border-[#CBD5E1] dark:border-[#203652] rounded font-mono text-xs text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-500 text-xs">milliseconds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Integration Project Modal */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-slate-200 dark:border-[#203652] shadow-2xl max-w-md w-full p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#203652] pb-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#2676D2] dark:text-cyan-300" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Create Integration Project</h3>
              </div>
              <button
                onClick={() => setIsCreateProjectOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {projectCreateError && (
              <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs">
                {projectCreateError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Safari Pesa Mobile Web Loan App"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Environment
                  </label>
                  <select
                    value={newProjectEnv}
                    onChange={(e) => setNewProjectEnv(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                  >
                    <option value="SANDBOX">Sandbox (Test Mode)</option>
                    <option value="PRODUCTION">Production (Real)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Primary Method
                  </label>
                  <select
                    value={newProjectMethod}
                    onChange={(e) => setNewProjectMethod(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                  >
                    <option value="EMBEDDED_WEB_SDK">Embedded Web SDK</option>
                    <option value="HOSTED_VERIFICATION">Hosted Verification</option>
                    <option value="REST_API">REST API Direct</option>
                    <option value="NATIVE_MOBILE_SDK">Native Mobile SDK (Planned)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Allowed Origins (Domain Whitelist for CORS &amp; Redirects)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="https://lending.example.com, https://app.example.com"
                  value={newProjectOrigins}
                  onChange={(e) => setNewProjectOrigins(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded font-mono text-[11px] text-slate-900 dark:text-white outline-none"
                />
                <span className="text-[10px] text-slate-400">Separate multiple origins with commas. Wildcard (*) not recommended for production.</span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Default Workflow
                </label>
                <select
                  value={newProjectWorkflow}
                  onChange={(e) => setNewProjectWorkflow(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none font-mono text-xs"
                >
                  <option value="wf_kenya_standard">wf_kenya_standard (National ID + Liveness)</option>
                  <option value="wf_passport_strict">wf_passport_strict (Passport + IPRS)</option>
                  <option value="wf_enterprise_tier1">wf_enterprise_tier1 (Dual Doc + Sanctions)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#203652]">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-[#203652] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#101C2C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded cursor-pointer shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate API Key Modal & Raw Secret Reveal Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-slate-200 dark:border-[#203652] shadow-2xl max-w-md w-full p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#203652] pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#2676D2] dark:text-cyan-300" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {generatedKeyResult ? 'API Secret Key Generated' : 'Generate New API Key'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsKeyModalOpen(false);
                  setGeneratedKeyResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {keyGenError && (
              <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs">
                {keyGenError}
              </div>
            )}

            {generatedKeyResult ? (
              <div className="space-y-4">
                <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Copy your secret key now!
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    This key will <strong>never be shown again</strong>. If lost, you must rotate or generate a new one.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Raw Secret Key:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedKeyResult.rawKey}
                      className="w-full p-2 bg-slate-100 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded font-mono text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleCopy(generatedKeyResult.rawKey, 'generated_key')}
                      className="px-3 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'generated_key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedKey === 'generated_key' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-[#203652]">
                  <button
                    onClick={() => {
                      setIsKeyModalOpen(false);
                      setGeneratedKeyResult(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded cursor-pointer"
                  >
                    I Have Saved My Secret Key
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateKey} className="space-y-3.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Key Name / Identifier
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Safari Pesa Backend Server"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Associate with Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.environment})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Environment
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded border flex items-center gap-2 cursor-pointer ${
                      newKeyEnv === 'SANDBOX' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'border-slate-200 dark:border-[#203652]'
                    }`}>
                      <input
                        type="radio"
                        name="env"
                        checked={newKeyEnv === 'SANDBOX'}
                        onChange={() => setNewKeyEnv('SANDBOX')}
                      />
                      <div>
                        <span className="font-bold block">Sandbox</span>
                        <span className="text-[10px] text-slate-500">Test keys (ice_test_...)</span>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded border flex items-center gap-2 cursor-pointer ${
                      newKeyEnv === 'PRODUCTION' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200' : 'border-slate-200 dark:border-[#203652]'
                    }`}>
                      <input
                        type="radio"
                        name="env"
                        checked={newKeyEnv === 'PRODUCTION'}
                        onChange={() => setNewKeyEnv('PRODUCTION')}
                      />
                      <div>
                        <span className="font-bold block">Production</span>
                        <span className="text-[10px] text-slate-500">Live keys (ice_live_...)</span>
                      </div>
                    </label>
                  </div>
                </div>

                {newKeyEnv === 'PRODUCTION' && !isProductionApproved && (
                  <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Production Access Locked
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Your organization status is currently <strong>SANDBOX_ACTIVE</strong>.
                      To ensure separation of duties and legal compliance, production credentials require an approved corporate onboarding application from ICE Compliance.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#203652]">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-[#203652] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#101C2C]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newKeyEnv === 'PRODUCTION' && !isProductionApproved}
                    className="px-4 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Generate API Secret Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Developer Authentication & Organization Linking Modal */}
      <DeveloperAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setCurrentUser(unifiedAuth.getCurrentUser());
        }}
      />
    </PortalShell>
  );
}
