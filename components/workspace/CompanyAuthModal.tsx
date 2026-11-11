'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Globe, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  X, 
  ArrowRight,
  RefreshCw,
  KeyRound,
  Send
} from 'lucide-react';
import { IceLogo } from '../brand/IceLogo';
import { OrganizationOnboardingStatus } from '@/lib/auth/portal-auth';
import { supabaseAuth } from '@/lib/auth/supabase-auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface CompanyAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'onboarding' | 'forgot_password';
  onLoginSuccess?: (companyEmail: string) => void;
}

export function CompanyAuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
}: CompanyAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'onboarding' | 'forgot_password'>(initialMode);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [businessType, setBusinessType] = useState('Fintech & Payments');
  const [password, setPassword] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(true);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OrganizationOnboardingStatus>('PENDING_BUSINESS_VERIFICATION');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessEmail.trim()) {
      setIsError(true);
      setStatusMessage('Please enter your business email.');
      return;
    }
    if (!password) {
      setIsError(true);
      setStatusMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await supabaseAuth.signIn(businessEmail.trim(), password);
      setIsSubmitting(false);

      if (res.success) {
        setIsError(false);
        setStatusMessage(res.message || 'Authentication successful. Redirecting to your organization workspace...');
        setTimeout(() => {
          onLoginSuccess?.(businessEmail.trim());
          onClose();
        }, 800);
      } else {
        setIsError(true);
        setStatusMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setIsError(true);
      setStatusMessage(err.message || 'Login request error.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !businessEmail.trim() || !contactPerson.trim() || !password) {
      setIsError(true);
      setStatusMessage('Please complete all required fields including password.');
      return;
    }
    if (password.length < 6) {
      setIsError(true);
      setStatusMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await supabaseAuth.registerCompany({
        email: businessEmail.trim(),
        password,
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        country,
        businessType,
      });

      setIsSubmitting(false);

      if (res.success) {
        setIsError(false);
        if (res.requiresEmailConfirmation) {
          setStatusMessage(res.message || 'Registration submitted! Please verify your email before signing in.');
          setMode('onboarding');
          setOnboardingStatus('PENDING_BUSINESS_VERIFICATION');
        } else {
          setStatusMessage(res.message || 'Company registered successfully! Accessing your sandbox workspace...');
          setTimeout(() => {
            onLoginSuccess?.(businessEmail.trim());
            onClose();
          }, 1200);
        }
      } else {
        setIsError(true);
        setStatusMessage(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setIsError(true);
      setStatusMessage(err.message || 'Registration request error.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessEmail.trim()) {
      setIsError(true);
      setStatusMessage('Please enter your registered business email.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setIsError(false);

    const res = await supabaseAuth.resetPassword(businessEmail.trim());
    setIsSubmitting(false);

    if (res.success) {
      setIsError(false);
      setStatusMessage(res.message || `Password recovery link dispatched to ${businessEmail}.`);
    } else {
      setIsError(true);
      setStatusMessage(res.error || 'Failed to dispatch reset email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900 dark:text-slate-100 transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#101C2C] text-white p-5 flex items-center justify-between border-b border-[#1E2F47]">
          <div className="flex items-center gap-2.5">
            <IceLogo variant="dark" size="sm" showTagline={false} />
            <div className="border-l border-slate-700 pl-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white block">Company Workspace</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                  isSupabaseConfigured 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isSupabaseConfigured ? 'Supabase Auth' : 'Sandbox Auth'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">Host: app.ice.example</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Login vs Register) */}
        {mode !== 'onboarding' && mode !== 'forgot_password' && (
          <div className="flex border-b border-slate-200 dark:border-[#203652] bg-slate-50 dark:bg-[#101C2C] text-xs">
            <button
              onClick={() => {
                setMode('login');
                setStatusMessage(null);
              }}
              className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
                mode === 'login'
                  ? 'border-[#2676D2] text-[#2676D2] dark:text-cyan-300 bg-white dark:bg-[#172B43]'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In to Workspace
            </button>
            <button
              onClick={() => {
                setMode('register');
                setStatusMessage(null);
              }}
              className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
                mode === 'register'
                  ? 'border-[#2676D2] text-[#2676D2] dark:text-cyan-300 bg-white dark:bg-[#172B43]'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register Company
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Status / Feedback message */}
          {statusMessage && (
            <div className={`p-3 rounded text-xs flex items-start gap-2 border ${
              isError
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
            }`}>
              {isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="compliance@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2676D2]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot_password')}
                    className="text-[11px] text-[#2676D2] dark:text-cyan-300 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2676D2]"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#101C2C] rounded border border-slate-200 dark:border-[#203652] text-[11px] text-slate-600 dark:text-slate-400">
                <span>Multi-factor authentication (MFA) will be verified after credentials check.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Company Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 2: REGISTER COMPANY */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company or Organization Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Microfinance Kenya Ltd"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2676D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="contact@acme.ke"
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2676D2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Grace Muthoni"
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2676D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100"
                  >
                    <option value="Kenya">Kenya</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="Rwanda">Rwanda</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Ghana">Ghana</option>
                    <option value="South Africa">South Africa</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100"
                  >
                    <option value="Fintech & Payments">Fintech & Payments</option>
                    <option value="Digital Credit & Micro-Loans">Digital Credit & Loans</option>
                    <option value="Commercial Banking">Commercial Banking</option>
                    <option value="SACCO / Credit Union">SACCO / Credit Union</option>
                    <option value="E-Commerce & Marketplaces">E-Commerce</option>
                    <option value="Telecommunications">Telecommunications</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Onboarding Notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
                <span className="font-semibold block mb-0.5">Approval & Verification Notice:</span>
                <span>Newly registered organizations receive sandbox access and must undergo compliance review before unrestricted production verification is unlocked.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Establishing organization...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Company Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 3: ONBOARDING STATUS */}
          {mode === 'onboarding' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 flex items-center justify-center mx-auto text-[#2676D2]">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Organization Registration Submitted
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {companyName || 'Your organization'} is currently in onboarding review.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#101C2C] rounded border border-slate-200 dark:border-[#203652] text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    PENDING_BUSINESS_VERIFICATION
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="text-slate-800 dark:text-slate-200">{contactPerson} ({businessEmail})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Sandbox Environment:</span>
                  <span className="text-emerald-600 font-semibold">Available</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Check your inbox to verify your email. Once approved by ICE Compliance, you can invite team members and configure production webhooks.
              </p>

              <button
                onClick={() => {
                  setMode('login');
                  onClose();
                }}
                className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded"
              >
                Close & Return
              </button>
            </div>
          )}

          {/* VIEW 4: FORGOT PASSWORD */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Password Recovery</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter your registered business email to receive secure reset instructions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  required
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="compliance@company.com"
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Recovery Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-3 py-2 border border-slate-300 dark:border-[#203652] text-xs font-semibold rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
