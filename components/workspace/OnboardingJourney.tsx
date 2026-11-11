'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  ExternalLink, 
  Send, 
  Check, 
  Mail, 
  Globe, 
  Phone, 
  Briefcase, 
  Lock, 
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { db } from '@/lib/store/synthetic-db';
import { OrganizationOnboardingApplication, OrganizationOnboardingStatus } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface OnboardingJourneyProps {
  tenantId: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

export function OnboardingJourney({ tenantId, onClose, onRefresh }: OnboardingJourneyProps) {
  const [app, setApp] = useState<OrganizationOnboardingApplication>(() => {
    return db.getOnboardingApplication(tenantId) || db.createOrUpdateOnboardingApplication(tenantId, {
      legalBusinessName: 'Safari Pesa Microfinance Limited',
      tradingName: 'Safari Pesa',
      country: 'Kenya',
      businessType: 'LIMITED_COMPANY',
      industry: 'Digital Lending / FinTech',
      registrationNumber: 'PVT-2025-098124',
      website: 'https://lending.example.com',
      contactName: 'James Kariuki',
      contactEmail: 'compliance@safaripesa.co.ke',
      contactPhone: '+254722112233',
      intendedUseCase: 'Automated identity verification for instant mobile personal loans and credit limits.',
      expectedMonthlyVolume: '10000_TO_50000',
    });
  });

  const [activeStep, setActiveStep] = useState<number>(() => {
    if (!app.emailVerified) return 1;
    if (app.status === 'SANDBOX_ACTIVE') return 3;
    if (app.status === 'PRODUCTION_APPLICATION_SUBMITTED' || app.status === 'UNDER_REVIEW') return 5;
    if (app.status === 'PRODUCTION_APPROVED') return 5;
    return 2;
  });

  const [verificationCode, setVerificationCode] = useState('849-201');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState(app.emailVerified);

  // Business form state
  const [legalName, setLegalName] = useState(app.legalBusinessName);
  const [tradingName, setTradingName] = useState(app.tradingName || '');
  const [businessType, setBusinessType] = useState(app.businessType);
  const [industry, setIndustry] = useState(app.industry);
  const [regNumber, setRegNumber] = useState(app.registrationNumber);
  const [website, setWebsite] = useState(app.website);
  const [contactName, setContactName] = useState(app.contactName);
  const [contactEmail, setContactEmail] = useState(app.contactEmail);
  const [contactPhone, setContactPhone] = useState(app.contactPhone);
  const [intendedUseCase, setIntendedUseCase] = useState(app.intendedUseCase);
  const [expectedVolume, setExpectedVolume] = useState(app.expectedMonthlyVolume);

  // Production application state
  const [cbkLicenseNumber, setCbkLicenseNumber] = useState('CBK-NDT-MFI-2025-081');
  const [complianceOfficerEmail, setComplianceOfficerEmail] = useState('compliance.officer@safaripesa.co.ke');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isSubmittingProd, setIsSubmittingProd] = useState(false);

  const approvalHistory = db.getApprovalHistory(tenantId);

  // Step 1: Handle Email Verification
  const handleVerifyEmail = () => {
    setIsVerifyingEmail(true);
    setTimeout(() => {
      db.verifyOrganizationEmail(tenantId);
      const updated = db.getOnboardingApplication(tenantId);
      if (updated) setApp({ ...updated });
      setEmailVerifiedSuccess(true);
      setIsVerifyingEmail(false);
      setActiveStep(3); // Advance to Sandbox Active!
      onRefresh?.();
    }, 600);
  };

  // Step 2: Save Profile Updates
  const handleSaveBusinessProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = db.createOrUpdateOnboardingApplication(tenantId, {
      legalBusinessName: legalName,
      tradingName,
      businessType,
      industry,
      registrationNumber: regNumber,
      website,
      contactName,
      contactEmail,
      contactPhone,
      intendedUseCase,
      expectedMonthlyVolume: expectedVolume,
    });
    setApp({ ...updated });
    setActiveStep(3);
    onRefresh?.();
  };

  // Step 4 & 5: Submit Production Access Request
  const handleSubmitProductionApplication = () => {
    setIsSubmittingProd(true);
    setTimeout(() => {
      const updated = db.submitProductionApplication(tenantId, [
        { name: 'Certificate_of_Incorporation_CR12.pdf', url: 'https://docs.ice.example/cr12.pdf', uploadedAt: new Date().toISOString() },
        { name: 'CBK_Digital_Credit_Provider_License.pdf', url: 'https://docs.ice.example/cbk_dcp.pdf', uploadedAt: new Date().toISOString() },
      ]);
      setApp({ ...updated });
      setIsSubmittingProd(false);
      onRefresh?.();
    }, 800);
  };

  const getStatusBadge = (status: OrganizationOnboardingStatus) => {
    switch (status) {
      case 'PRODUCTION_APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">Production Approved</span>;
      case 'UNDER_REVIEW':
      case 'PRODUCTION_APPLICATION_SUBMITTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300 border border-blue-300 dark:border-blue-800">Under Review</span>;
      case 'SANDBOX_ACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Sandbox Active</span>;
      case 'ADDITIONAL_INFORMATION_REQUIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Action Required</span>;
      case 'PRODUCTION_REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">Rejected</span>;
      case 'SUSPENDED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">Suspended</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Email Verification Pending</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-[#101C2C] via-[#172B43] to-[#1E3A5F] text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#2676D2]/30 text-cyan-300 border border-[#2676D2]/50 font-bold">
                Customer Onboarding
              </span>
              <span className="text-xs text-slate-300 font-mono">Org: {tenantId}</span>
            </div>
            <h2 className="text-xl font-bold mt-1.5 flex items-center gap-2 text-white">
              <Building2 className="w-5 h-5 text-[#26B8C7]" />
              <span>{app.legalBusinessName}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Complete your organizational profile, activate instant sandbox integration, and apply for verified live production credentials.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Onboarding Status</span>
            {getStatusBadge(app.status)}
          </div>
        </div>

        {/* Multi-step Breadcrumb Tracker */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button 
            onClick={() => setActiveStep(1)}
            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              activeStep === 1 
                ? 'bg-white/15 border-cyan-400 text-white font-bold' 
                : app.emailVerified 
                ? 'bg-white/5 border-emerald-500/40 text-emerald-300' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono">STEP 1</span>
              {app.emailVerified ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Mail className="w-3.5 h-3.5" />}
            </div>
            <span className="block mt-1 font-semibold">Email Verification</span>
          </button>

          <button 
            onClick={() => setActiveStep(2)}
            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              activeStep === 2 
                ? 'bg-white/15 border-cyan-400 text-white font-bold' 
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono">STEP 2</span>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="block mt-1 font-semibold">Company Profile</span>
          </button>

          <button 
            onClick={() => setActiveStep(3)}
            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              activeStep === 3 
                ? 'bg-white/15 border-cyan-400 text-white font-bold' 
                : app.status !== 'DRAFT' && app.status !== 'EMAIL_VERIFICATION_REQUIRED'
                ? 'bg-white/5 border-emerald-500/40 text-emerald-300' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono">STEP 3</span>
              {app.status !== 'DRAFT' && app.status !== 'EMAIL_VERIFICATION_REQUIRED' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>
            <span className="block mt-1 font-semibold">Sandbox Access</span>
          </button>

          <button 
            onClick={() => setActiveStep(4)}
            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              activeStep === 4 
                ? 'bg-white/15 border-cyan-400 text-white font-bold' 
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono">STEP 4</span>
              <Globe className="w-3.5 h-3.5" />
            </div>
            <span className="block mt-1 font-semibold">Integration Project</span>
          </button>

          <button 
            onClick={() => setActiveStep(5)}
            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              activeStep === 5 
                ? 'bg-white/15 border-cyan-400 text-white font-bold' 
                : app.status === 'PRODUCTION_APPROVED'
                ? 'bg-white/5 border-emerald-500/40 text-emerald-300' 
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono">STEP 5</span>
              {app.status === 'PRODUCTION_APPROVED' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            </div>
            <span className="block mt-1 font-semibold">Production Approval</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6">
        {/* =================================================================== */}
        {/* STEP 1: EMAIL VERIFICATION */}
        {/* =================================================================== */}
        {activeStep === 1 && (
          <div className="max-w-xl mx-auto py-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#2676D2] flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Verify Corporate Email Address</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A verification code was dispatched to <strong className="text-slate-900 dark:text-white">{app.contactEmail}</strong> to confirm organization domain ownership.
              </p>
            </div>

            {app.emailVerified ? (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Email Address Confirmed &amp; Verified</span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Your corporate domain is authenticated. Instant sandbox integration access has been unlocked.
                </p>
                <button
                  onClick={() => setActiveStep(2)}
                  className="mt-3 px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Continue to Company Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4 bg-slate-50 dark:bg-[#172B43] p-5 rounded-lg border border-slate-200 dark:border-[#203652]">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                    Enter 6-Digit Verification Token
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="e.g. 849-201"
                    className="w-full p-2.5 bg-white dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-sm text-center font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block text-center">
                    Simulated verification code pre-filled for developer convenience.
                  </span>
                </div>

                <button
                  onClick={handleVerifyEmail}
                  disabled={isVerifyingEmail}
                  className="w-full py-2.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isVerifyingEmail ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isVerifyingEmail ? 'Confirming Token...' : 'Verify Email & Unlock Sandbox'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: COMPANY BUSINESS DETAILS */}
        {/* =================================================================== */}
        {activeStep === 2 && (
          <form onSubmit={handleSaveBusinessProfile} className="space-y-5 text-xs max-w-3xl mx-auto">
            <div className="border-b border-slate-200 dark:border-[#203652] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Corporate Identity &amp; Intended Use</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Official entity details registered with Kenyan authorities (Registrar of Companies / CBK).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Legal Business Name *</label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Trading Name (Brand / App Name)</label>
                <input
                  type="text"
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="e.g. Safari Pesa"
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Business Registration Number (CR12 / Certificate) *</label>
                <input
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white font-mono outline-none focus:border-[#2676D2]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Entity Classification *</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                >
                  <option value="LIMITED_COMPANY">Private Limited Company (Ltd / PLC)</option>
                  <option value="FINANCIAL_INSTITUTION">Regulated Financial Institution / Microfinance</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                  <option value="NGO">Non-Governmental Organization (NGO)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Application Website / Allowed Domain *</label>
                <input
                  type="url"
                  required
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://lending.example.com"
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Expected Monthly Verification Volume</label>
                <select
                  value={expectedVolume}
                  onChange={(e) => setExpectedVolume(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none"
                >
                  <option value="LESS_THAN_1000">&lt; 1,000 verifications / month (Starter)</option>
                  <option value="1000_TO_10000">1,000 - 10,000 verifications / month (Growth)</option>
                  <option value="10000_TO_50000">10,000 - 50,000 verifications / month (Scale)</option>
                  <option value="50000_PLUS">50,000+ verifications / month (Enterprise)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Intended Identity Verification Purpose *</label>
              <textarea
                rows={2}
                required
                value={intendedUseCase}
                onChange={(e) => setIntendedUseCase(e.target.value)}
                placeholder="Describe your user onboarding workflow and KYC compliance requirements..."
                className="w-full p-2 bg-slate-50 dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#203652]">
              <span className="text-[11px] text-slate-400">All data stored under strict tenant isolation.</span>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Save Profile &amp; Proceed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* STEP 3: SANDBOX ENVIRONMENT ACTIVE */}
        {/* =================================================================== */}
        {activeStep === 3 && (
          <div className="max-w-2xl mx-auto py-4 space-y-6">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Sandbox Environment Automatically Active</h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Your organization <strong className="font-semibold">{app.legalBusinessName}</strong> has immediate access to ICE Developer Portal, API test credentials, synthetic applicant simulators, and webhook delivery testers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-[#203652] bg-slate-50 dark:bg-[#172B43] space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#2676D2]" />
                  <span>Sandbox Credentials</span>
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Test secret keys prefixed with <code className="font-mono text-[#2676D2] bg-blue-50 dark:bg-[#101C2C] px-1 py-0.5 rounded">ice_test_</code> allow simulating verifications without live regulatory charges.
                </p>
                <a
                  href="/developers"
                  className="inline-flex items-center gap-1 text-[#2676D2] hover:underline font-semibold text-[11px]"
                >
                  <span>Go to Developer Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-[#203652] bg-slate-50 dark:bg-[#172B43] space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#26B8C7]" />
                  <span>Interactive Playground</span>
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Test clean National IDs, optical blur recapture, font alterations, and spoofed selfies with live pipeline execution traces.
                </p>
                <button
                  onClick={() => setActiveStep(4)}
                  className="inline-flex items-center gap-1 text-[#2676D2] hover:underline font-semibold text-[11px] cursor-pointer"
                >
                  <span>Setup Integration Project</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveStep(4)}
                className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Continue to Integration Project Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4: INTEGRATION PROJECT GUIDANCE */}
        {/* =================================================================== */}
        {activeStep === 4 && (
          <div className="max-w-2xl mx-auto py-4 space-y-5 text-xs">
            <div className="border-b border-slate-200 dark:border-[#203652] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Integration Projects</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Each independent application (web app, mobile app, merchant portal) should have a dedicated integration project with registered allowed origins.
              </p>
            </div>

            <div className="space-y-3">
              {db.getProjects(tenantId).map((proj) => (
                <div key={proj.id} className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#203652] bg-white dark:bg-[#172B43] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{proj.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">ID: {proj.id} • Slug: {proj.slug}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2676D2] dark:text-cyan-300 border border-blue-200 dark:border-blue-900">
                      {proj.integrationMethod}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{proj.description}</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-[#203652] flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Allowed Domains: <strong className="font-mono text-slate-700 dark:text-slate-200">{proj.allowedOrigins.join(', ') || 'None'}</strong></span>
                    <a href="/developers" className="text-[#2676D2] hover:underline font-semibold flex items-center gap-1">
                      <span>Manage in Developer Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#203652]">
              <a href="/developers" className="text-xs text-[#2676D2] hover:underline font-semibold flex items-center gap-1">
                <span>Open Developer Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setActiveStep(5)}
                className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white font-semibold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Proceed to Production Approval</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 5: PRODUCTION APPROVAL APPLICATION */}
        {/* =================================================================== */}
        {activeStep === 5 && (
          <div className="max-w-2xl mx-auto py-4 space-y-6 text-xs">
            <div className="border-b border-slate-200 dark:border-[#203652] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Production Verification &amp; Credential Unlock</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                In compliance with Kenyan Data Protection Act (KDPA 2019) and Central Bank of Kenya (CBK) guidelines, production access requires identity compliance review by authorized ICE staff.
              </p>
            </div>

            {app.status === 'PRODUCTION_APPROVED' ? (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Production Access Approved &amp; Active</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Reviewed by <strong className="font-semibold">{app.reviewerName}</strong> on {app.reviewedAt ? formatDateTime(app.reviewedAt) : 'Recent'}.
                  Your organization is authorized to generate production API credentials (<code className="font-mono">ice_live_...</code>).
                </p>
                {app.reviewNotes && (
                  <div className="p-3 bg-white/60 dark:bg-[#101C2C]/60 rounded border border-emerald-200 dark:border-emerald-900 text-[11px] text-slate-700 dark:text-slate-300 italic">
                    &ldquo;{app.reviewNotes}&rdquo;
                  </div>
                )}
                <a
                  href="/developers"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors"
                >
                  <span>Generate Production Keys in Developer Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : app.status === 'PRODUCTION_APPLICATION_SUBMITTED' || app.status === 'UNDER_REVIEW' ? (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 dark:text-cyan-300 font-bold text-sm">
                  <Clock className="w-5 h-5 text-[#2676D2]" />
                  <span>Production Application Under Review</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Submitted on {app.submittedAt ? formatDateTime(app.submittedAt) : 'Recent'}. Our compliance review team is verifying business registration documents and regulatory standing.
                </p>
                <div className="p-3 bg-white dark:bg-[#101C2C] rounded border border-blue-200 dark:border-blue-900/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted Compliance Pack</span>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                    <div>• Certificate of Incorporation (CR12 verification)</div>
                    <div>• Central Bank of Kenya (CBK) DCP Regulatory Reference</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-slate-50 dark:bg-[#172B43] p-5 rounded-lg border border-slate-200 dark:border-[#203652]">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Regulatory License / CBK Digital Credit Provider Reference
                  </label>
                  <input
                    type="text"
                    value={cbkLicenseNumber}
                    onChange={(e) => setCbkLicenseNumber(e.target.value)}
                    placeholder="e.g. CBK-DCP-2025-081"
                    className="w-full p-2 bg-white dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white font-mono outline-none focus:border-[#2676D2]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Designated Compliance Officer Email
                  </label>
                  <input
                    type="email"
                    value={complianceOfficerEmail}
                    onChange={(e) => setComplianceOfficerEmail(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#101C2C] border border-slate-300 dark:border-[#203652] rounded text-slate-900 dark:text-white outline-none focus:border-[#2676D2]"
                  />
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                    We certify that verification requests dispatched through ICE will be for lawful KYC due diligence with applicant consent under the Kenya Data Protection Act.
                  </label>
                </div>

                <button
                  onClick={handleSubmitProductionApplication}
                  disabled={!acceptedTerms || isSubmittingProd}
                  className="w-full py-2.5 bg-[#2676D2] hover:bg-[#1E62B0] disabled:bg-slate-300 text-white font-semibold rounded shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingProd ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSubmittingProd ? 'Submitting Application...' : 'Submit Application for ICE Staff Review'}</span>
                </button>
              </div>
            )}

            {/* Approval History Ledger */}
            {approvalHistory.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-[#203652]">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Organization Status Audit Ledger
                </h4>
                <div className="border border-slate-200 dark:border-[#203652] rounded-lg divide-y divide-slate-100 dark:divide-[#203652] bg-white dark:bg-[#172B43]">
                  {approvalHistory.map((item) => (
                    <div key={item.id} className="p-3 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.previousStatus} &rarr; <span className="text-[#2676D2] dark:text-cyan-300">{item.newStatus}</span>
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">{formatDateTime(item.changedAt)}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 italic">&ldquo;{item.reasonNotes}&rdquo;</p>
                      <span className="text-[10px] text-slate-400">Actor: {item.changedByName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
