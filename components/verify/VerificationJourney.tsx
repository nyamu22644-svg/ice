'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { IceLogo } from '../brand/IceLogo';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Upload, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Lock, 
  Sparkles, 
  Smartphone, 
  RefreshCw,
  Eye,
  Smile,
  Check,
  Building,
  Info,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { DocumentType, VerificationProfile } from '@/lib/types';
import { db } from '@/lib/store/synthetic-db';

export interface VerificationJourneyProps {
  initialSessionId?: string;
  companyName?: string;
  verificationPurpose?: string;
  profile?: VerificationProfile;
  isEmbeddedPreview?: boolean;
  previewDevice?: 'mobile' | 'desktop';
  onStepChange?: (stepIndex: number, stepKey: string) => void;
  onSessionComplete?: (result: any) => void;
}

interface StepDefinition {
  id: string;
  label: string;
  shortTitle: string;
}

export function VerificationJourney({
  initialSessionId,
  companyName = 'Apex Finance Ltd',
  verificationPurpose,
  profile: propProfile,
  isEmbeddedPreview = false,
  previewDevice = 'mobile',
  onStepChange,
  onSessionComplete,
}: VerificationJourneyProps) {
  // Resolve profile from session or props or default
  const resolvedProfile: VerificationProfile = useMemo(() => {
    if (propProfile) return propProfile;
    if (initialSessionId) {
      const sess = db.sessions.find((s) => s.id === initialSessionId);
      if (sess?.verificationProfileId) {
        const found = db.verificationProfiles.find((p) => p.id === sess.verificationProfileId);
        if (found) return found;
      }
    }
    // Default baseline profile
    return db.verificationProfiles.find((p) => p.id === 'prof_apex_standard') || db.verificationProfiles[0];
  }, [propProfile, initialSessionId]);

  // Determine which functional stages are enabled for this profile
  const hasDocuments = (resolvedProfile.allowedDocumentTypes || []).length > 0;
  const hasSelfie = !!resolvedProfile.selfieCaptureEnabled;
  const hasLiveness = !!resolvedProfile.livenessCheckEnabled;
  const isExtractFromDoc = resolvedProfile.identityCollectionMode === 'EXTRACT_FROM_DOCUMENT';

  // Build the dynamic sequence of steps required by this exact profile
  const steps: StepDefinition[] = useMemo(() => {
    const list: StepDefinition[] = [
      { id: 'welcome', label: 'Welcome', shortTitle: 'Start' },
      { id: 'consent', label: 'Privacy & Consent', shortTitle: 'Consent' },
    ];

    if (hasDocuments) {
      // If manual entry first is required, put form before doc
      if (!isExtractFromDoc) {
        list.push({ id: 'manual_form', label: 'Applicant Details', shortTitle: 'Details' });
      }
      list.push({ id: 'doc_select', label: 'Select Document', shortTitle: 'Document' });
      list.push({ id: 'doc_capture', label: 'Document Capture', shortTitle: 'Capture' });
      list.push({ id: 'doc_quality', label: 'Optical Quality', shortTitle: 'Quality' });
      if (resolvedProfile.ocrEnabled) {
        list.push({ id: 'ocr_confirm', label: 'Confirm Details', shortTitle: 'Confirm' });
      }
    } else {
      // Biometric-only journey still needs minimal applicant identification
      list.push({ id: 'manual_form', label: 'Applicant Details', shortTitle: 'Details' });
    }

    if (hasSelfie) {
      list.push({ id: 'selfie', label: 'Selfie Capture', shortTitle: 'Selfie' });
    }
    if (hasLiveness) {
      list.push({ id: 'liveness', label: 'Live Presence Check', shortTitle: 'Liveness' });
    }

    list.push({ id: 'processing', label: 'Automated Evaluation', shortTitle: 'Review' });
    list.push({ id: 'complete', label: 'Verification Outcome', shortTitle: 'Outcome' });

    return list;
  }, [hasDocuments, hasSelfie, hasLiveness, isExtractFromDoc, resolvedProfile.ocrEnabled]);

  // Current active step index (0 to steps.length - 1)
  const [stepIndex, setStepIndex] = useState<number>(0);
  const clampedStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const currentStepDef = steps[clampedStepIndex] || steps[0];

  useEffect(() => {
    if (onStepChange && currentStepDef) {
      onStepChange(clampedStepIndex, currentStepDef.id);
    }
  }, [clampedStepIndex, currentStepDef, onStepChange]);

  // Consents State
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentBiometrics, setConsentBiometrics] = useState(false);

  // Applicant Data
  const [formData, setFormData] = useState({
    fullName: 'David Mwangi Kariuki',
    dob: '1992-04-14',
    nationalIdNumber: '28471920',
    phoneNumber: '+254 712 345 678',
    email: 'david.kariuki@example.com',
    nationality: 'Kenyan',
    districtOfBirth: 'Kiambu',
    serialNumber: '219485721',
  });

  // Selected Document Type
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>(
    resolvedProfile.allowedDocumentTypes[0] || 'KE_NATIONAL_ID'
  );
  const effectiveDocType = (resolvedProfile.allowedDocumentTypes.includes(selectedDocType)
    ? selectedDocType
    : resolvedProfile.allowedDocumentTypes[0]) || 'KE_NATIONAL_ID';

  // Document Capture State
  const [capturedFront, setCapturedFront] = useState<{
    fileName: string;
    fileSizeBytes: number;
    blurScore: number;
    glareDetected: boolean;
    cornersDetected: boolean;
    passed: boolean;
  } | null>({
    fileName: 'synthetic_ke_id_front.jpg',
    fileSizeBytes: 420000,
    blurScore: 0.94,
    glareDetected: false,
    cornersDetected: true,
    passed: true,
  });

  const [capturedBack, setCapturedBack] = useState<{
    fileName: string;
    fileSizeBytes: number;
    blurScore: number;
    glareDetected: boolean;
    cornersDetected: boolean;
    passed: boolean;
  } | null>(null);

  // Selfie & Liveness State
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [livenessChallengesCompleted, setLivenessChallengesCompleted] = useState<string[]>([]);

  // Processing & Simulation State
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationOutcome, setVerificationOutcome] = useState<'VERIFIED' | 'NEEDS_REVIEW' | 'FAILED'>('VERIFIED');

  // Next / Back handlers
  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  // Preset Loaders for Document Simulation
  const handleLoadSyntheticDoc = (type: 'valid' | 'blurry' | 'altered') => {
    if (type === 'valid') {
      setCapturedFront({
        fileName: 'synthetic_ke_national_id_front.jpg',
        fileSizeBytes: 420000,
        blurScore: 0.94,
        glareDetected: false,
        cornersDetected: true,
        passed: true,
      });
      setCapturedBack({
        fileName: 'synthetic_ke_national_id_back.jpg',
        fileSizeBytes: 380000,
        blurScore: 0.92,
        glareDetected: false,
        cornersDetected: true,
        passed: true,
      });
      setFormData((prev) => ({
        ...prev,
        fullName: 'DAVID MWANGI KARIUKI',
        nationalIdNumber: '28471920',
        dob: '1992-04-14',
        districtOfBirth: 'KIAMBU',
      }));
    } else if (type === 'blurry') {
      setCapturedFront({
        fileName: 'synthetic_ke_id_blurry_sample.jpg',
        fileSizeBytes: 140000,
        blurScore: 0.48, // Below 0.70 threshold
        glareDetected: false,
        cornersDetected: true,
        passed: false,
      });
      setCapturedBack(null);
    } else {
      setCapturedFront({
        fileName: 'synthetic_ke_id_altered_sample.jpg',
        fileSizeBytes: 410000,
        blurScore: 0.88,
        glareDetected: true,
        cornersDetected: true,
        passed: false,
      });
      setCapturedBack(null);
    }
  };

  // Run Submission Simulation
  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    setProcessingProgress(15);
    setProcessingLogs([
      'Session bound to profile: ' + resolvedProfile.name + ' (' + resolvedProfile.version + ')',
      'Checking document payload and SHA-256 integrity...',
    ]);

    setTimeout(() => {
      setProcessingProgress(45);
      const log1 = hasDocuments 
        ? 'Running ICE-DocVision OCR field extraction & substrate forensics...'
        : 'Skipping document OCR stage (Profile configured for Biometric Only)';
      setProcessingLogs((prev) => [...prev, log1]);
    }, 700);

    setTimeout(() => {
      setProcessingProgress(75);
      const log2 = hasSelfie 
        ? 'Validating 3D anti-spoofing challenge (Blink + Smile completed)...'
        : 'Skipping selfie & biometric match (Profile configured for Document Only)';
      setProcessingLogs((prev) => [
        ...prev,
        log2,
        'Government authoritative database gateway: NOT_PERFORMED (External registry not connected)',
      ]);
    }, 1400);

    setTimeout(() => {
      setProcessingProgress(100);
      setProcessingLogs((prev) => [...prev, 'Automated decision policy applied. Audit trail signed.']);
      setIsSubmitting(false);

      // Determine outcome based on optical score
      const isQualityOk = !capturedFront || capturedFront.blurScore >= (resolvedProfile.documentQualityChecks?.blurThreshold || 0.70);
      const outcome = isQualityOk ? 'VERIFIED' : 'NEEDS_REVIEW';
      setVerificationOutcome(outcome);

      // Move to complete
      const completeIdx = steps.findIndex((s) => s.id === 'complete');
      if (completeIdx !== -1) {
        setStepIndex(completeIdx);
      }

      if (onSessionComplete) {
        onSessionComplete({
          status: outcome,
          profileId: resolvedProfile.id,
          profileVersion: resolvedProfile.version,
          personName: formData.fullName,
          idNumber: formData.nationalIdNumber,
          riskScore: outcome === 'VERIFIED' ? 10 : 35,
        });
      }
    }, 2200);
  };

  // Card Content
  const containerContent = (
    <div className="bg-white dark:bg-[#172B43] rounded-lg shadow-sm border border-[#E2E8F0] dark:border-[#203652] overflow-hidden transition-colors flex flex-col">
      {/* Header Bar */}
      <div className="bg-[#101C2C] text-white px-4 sm:px-5 py-3.5 border-b border-[#172B43] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <IceLogo variant="dark" size="sm" />
          <span className="hidden sm:inline text-slate-400 text-xs">|</span>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
            {companyName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#172B43] text-cyan-300 border border-[#203652] truncate max-w-[120px]">
            {resolvedProfile.name}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            <Lock className="w-3 h-3 text-[#26B8C7]" />
            <span className="font-mono text-[10px] hidden sm:inline">256-bit</span>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-[#F8FAFC] dark:bg-[#0D1724] px-4 py-2 border-b border-[#E2E8F0] dark:border-[#203652] flex items-center justify-between text-xs text-[#536273] dark:text-slate-400">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-5 h-5 rounded-full bg-[#2676D2] text-white text-[10px] font-bold flex items-center justify-center">
            {stepIndex + 1}
          </span>
          <span className="font-semibold text-[#101C2C] dark:text-white">
            {currentStepDef.label}
          </span>
          <span className="text-[11px] text-slate-400">
            ({stepIndex + 1} of {steps.length})
          </span>
        </div>

        {/* Small Progress Dots */}
        <div className="flex items-center gap-1">
          {steps.map((st, idx) => (
            <div
              key={st.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIndex
                  ? 'w-4 bg-[#2676D2]'
                  : idx < stepIndex
                  ? 'w-1.5 bg-emerald-500'
                  : 'w-1.5 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Body Viewport */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
        {/* ================================================================= */}
        {/* STEP 1: WELCOME */}
        {/* ================================================================= */}
        {currentStepDef.id === 'welcome' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-lg bg-[#2676D2]/10 border border-[#2676D2]/20 flex items-center justify-center text-[#2676D2] dark:text-cyan-300">
              <Shield className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#101C2C] dark:text-white">
                {resolvedProfile.applicantInstructions?.welcomeTitle || 'Identity Verification Required'}
              </h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1 leading-relaxed">
                {resolvedProfile.applicantInstructions?.welcomeSubtitle ||
                  `${companyName} has requested you verify your identity to proceed securely.`}
              </p>
            </div>

            <div className="p-3 bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded text-xs space-y-2">
              <span className="font-bold text-[#101C2C] dark:text-white block text-[11px] uppercase tracking-wider">
                What you will need:
              </span>
              {hasDocuments && (
                <div className="flex items-start gap-2 text-[#536273] dark:text-slate-300">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Valid {resolvedProfile.allowedDocumentTypes.map(d => d.replace(/_/g, ' ')).join(' or ')}
                  </span>
                </div>
              )}
              {hasSelfie && (
                <div className="flex items-start gap-2 text-[#536273] dark:text-slate-300">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Device front camera for a brief live selfie</span>
                </div>
              )}
              <div className="flex items-start gap-2 text-[#536273] dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>2 minutes in a well-lit environment</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex justify-end">
              <button
                onClick={handleNext}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Get Started</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2: CONSENT */}
        {/* ================================================================= */}
        {currentStepDef.id === 'consent' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Privacy & Legal Consent</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                Your data is protected under the Kenya Data Protection Act 2019 and international standards.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded border border-[#E2E8F0] dark:border-[#203652] bg-white dark:bg-[#101C2C] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#172B43]/50">
                <input
                  type="checkbox"
                  checked={consentDataProcessing}
                  onChange={(e) => setConsentDataProcessing(e.target.checked)}
                  className="mt-0.5 rounded text-[#2676D2]"
                />
                <span className="text-[#101C2C] dark:text-slate-200 text-xs leading-relaxed">
                  I consent to the collection, cryptographic hashing, and processing of my identification details by ICE exclusively for identity verification by <strong className="text-slate-900 dark:text-white">{companyName}</strong>.
                </span>
              </label>

              {hasSelfie && (
                <label className="flex items-start gap-2.5 p-3 rounded border border-[#E2E8F0] dark:border-[#203652] bg-white dark:bg-[#101C2C] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#172B43]/50">
                  <input
                    type="checkbox"
                    checked={consentBiometrics}
                    onChange={(e) => setConsentBiometrics(e.target.checked)}
                    className="mt-0.5 rounded text-[#2676D2]"
                  />
                  <span className="text-[#101C2C] dark:text-slate-200 text-xs leading-relaxed">
                    I consent to the capture of my facial image for liveness verification and 1:1 biometric comparison against my official document portrait. Biometric templates are discarded after verification.
                  </span>
                </label>
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-50 dark:hover:bg-[#172B43]"
              >
                Back
              </button>
              <button
                disabled={!consentDataProcessing || (hasSelfie && !consentBiometrics)}
                onClick={handleNext}
                className={`flex-1 py-2 px-4 text-xs font-semibold rounded ${
                  consentDataProcessing && (!hasSelfie || consentBiometrics)
                    ? 'bg-[#2676D2] hover:bg-[#1E62B0] text-white cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                Agree & Continue
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: MANUAL FORM (When manual entry first is required) */}
        {/* ================================================================= */}
        {currentStepDef.id === 'manual_form' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Applicant Information</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                Enter your details exactly as they appear on your government records.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    National ID Number
                  </label>
                  <input
                    type="text"
                    value={formData.nationalIdNumber}
                    onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2 px-4 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: DOCUMENT SELECTION */}
        {/* ================================================================= */}
        {currentStepDef.id === 'doc_select' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Select Document Type</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                Choose one of the accepted identification documents configured for this service.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { id: 'KE_NATIONAL_ID', title: 'Kenyan National Identity Card', desc: 'Front and Back required. Instant OCR extraction.' },
                { id: 'KE_PASSPORT', title: 'Kenyan Passport', desc: 'Identity page with MRZ code lines.' },
                { id: 'KE_ALIEN_ID', title: 'Kenyan Alien Identity Card', desc: 'Foreign national resident registration.' },
                { id: 'KE_KRA_PIN', title: 'KRA PIN Certificate', desc: 'Taxpayer PIN certificate document.' },
              ]
                .filter((doc) => resolvedProfile.allowedDocumentTypes.includes(doc.id as DocumentType))
                .map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocType(doc.id as DocumentType)}
                    className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                      selectedDocType === doc.id
                        ? 'border-[#2676D2] bg-[#2676D2]/5 text-[#101C2C] dark:text-white dark:bg-[#2676D2]/15'
                        : 'border-[#E2E8F0] dark:border-[#203652] hover:border-[#CBD5E1] text-[#536273] dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{doc.title}</span>
                      {selectedDocType === doc.id && (
                        <Check className="w-4 h-4 text-[#2676D2] dark:text-cyan-300" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#536273] dark:text-slate-400 mt-0.5">{doc.desc}</p>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2 px-4 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Continue to Capture
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: DOCUMENT CAPTURE (Front & Back for National ID) */}
        {/* ================================================================= */}
        {currentStepDef.id === 'doc_capture' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">
                Capture {selectedDocType.replace(/_/g, ' ')}
              </h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                {resolvedProfile.applicantInstructions?.documentCaptureHelp ||
                  'Place document on a flat surface with good contrast. Avoid glare and ensure text is crisp.'}
              </p>
            </div>

            {/* Front Image Slot */}
            <div className="border border-[#CBD5E1] dark:border-[#203652] rounded-lg p-3.5 bg-[#F4F7FA] dark:bg-[#101C2C] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-[#101C2C] dark:text-white">
                  {selectedDocType === 'KE_PASSPORT' ? '1. Passport Identity Page' : '1. Document Front Side'}
                </span>
                {capturedFront ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Captured</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Required</span>
                )}
              </div>

              {capturedFront ? (
                <div className="p-2.5 bg-white dark:bg-[#172B43] rounded border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[180px]">
                      {capturedFront.fileName}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Blur: {(capturedFront.blurScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    4-corner framing detected • Resolution: 300 DPI • SHA-256 integrity signed
                  </p>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-[#CBD5E1] dark:border-[#203652] rounded text-center text-xs text-slate-500 dark:text-slate-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <span>Ready to capture front image</span>
                </div>
              )}

              {/* Simulation Quick Triggers */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleLoadSyntheticDoc('valid')}
                  className="px-2 py-1 bg-[#172B43] hover:bg-[#203652] text-white text-[10px] font-semibold rounded"
                >
                  Load Valid ID Sample
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSyntheticDoc('blurry')}
                  className="px-2 py-1 bg-amber-800/80 hover:bg-amber-800 text-white text-[10px] font-semibold rounded"
                >
                  Load Blurry Sample
                </button>
              </div>
            </div>

            {/* Back Image Slot (If required for document type) */}
            {selectedDocType !== 'KE_PASSPORT' && (
              <div className="border border-[#CBD5E1] dark:border-[#203652] rounded-lg p-3.5 bg-[#F4F7FA] dark:bg-[#101C2C] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#101C2C] dark:text-white">
                    2. Document Back Side (Barcode & Serial)
                  </span>
                  {capturedBack ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Captured</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Required</span>
                  )}
                </div>

                {capturedBack ? (
                  <div className="p-2.5 bg-white dark:bg-[#172B43] rounded border border-emerald-200 dark:border-emerald-800 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-medium font-mono text-[11px]">
                      {capturedBack.fileName}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Barcode intact • Biometric chip zone identified
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedBack({
                        fileName: 'synthetic_ke_id_back.jpg',
                        fileSizeBytes: 380000,
                        blurScore: 0.92,
                        glareDetected: false,
                        cornersDetected: true,
                        passed: true,
                      });
                    }}
                    className="w-full py-2 px-3 border border-dashed border-[#CBD5E1] dark:border-[#203652] text-xs text-[#2676D2] dark:text-cyan-300 font-semibold rounded hover:bg-slate-50 dark:hover:bg-[#172B43]"
                  >
                    + Capture Back Image
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded"
              >
                Back
              </button>
              <button
                disabled={!capturedFront || (selectedDocType !== 'KE_PASSPORT' && !capturedBack)}
                onClick={handleNext}
                className={`flex-1 py-2 px-4 text-xs font-semibold rounded ${
                  capturedFront && (selectedDocType === 'KE_PASSPORT' || capturedBack)
                    ? 'bg-[#2676D2] hover:bg-[#1E62B0] text-white cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                Inspect Quality & OCR
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: OPTICAL QUALITY ASSESSMENT */}
        {/* ================================================================= */}
        {currentStepDef.id === 'doc_quality' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Optical Quality Assessment</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                Automated on-device evaluation by ICE-DocVision before transmission.
              </p>
            </div>

            <div className="bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#536273] dark:text-slate-400">Focus & Blur Metric:</span>
                <span className={`font-semibold ${capturedFront && capturedFront.blurScore >= (resolvedProfile.documentQualityChecks?.blurThreshold || 0.70) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {capturedFront ? `${(capturedFront.blurScore * 100).toFixed(0)}% (Threshold: ${((resolvedProfile.documentQualityChecks?.blurThreshold || 0.70) * 100).toFixed(0)}%)` : 'Unknown'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#536273] dark:text-slate-400">Glare / Flash Obstruction:</span>
                <span className={`font-semibold ${capturedFront && !capturedFront.glareDetected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {capturedFront && !capturedFront.glareDetected ? 'No Glare Detected' : 'Glare Detected'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#536273] dark:text-slate-400">4-Corner Framing:</span>
                <span className={`font-semibold ${capturedFront && capturedFront.cornersDetected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {capturedFront && capturedFront.cornersDetected ? 'All 4 Corners Clear' : 'Clipped Boundary'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652]">
                <div className={`p-2.5 rounded text-[11px] ${
                  capturedFront && capturedFront.blurScore >= (resolvedProfile.documentQualityChecks?.blurThreshold || 0.70)
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}>
                  {capturedFront && capturedFront.blurScore >= (resolvedProfile.documentQualityChecks?.blurThreshold || 0.70)
                    ? 'Quality checks passed. Document details are sharp and ready for field extraction.'
                    : 'Notice: Optical blur exceeds recommended threshold. In production, this applicant will be routed to manual review queue.'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded"
              >
                Retake
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2 px-4 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Proceed to Extraction
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: OCR FIELD CONFIRMATION (Minimizes typing, allows corrections) */}
        {/* ================================================================= */}
        {currentStepDef.id === 'ocr_confirm' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#2676D2] dark:text-cyan-300 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extracted via ICE-DocVision OCR</span>
              </div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Confirm Extracted Details</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-0.5">
                We read these details from your document. Please verify them or correct any misread character before continuing.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Full Legal Name
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">98% confidence</span>
                </div>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      ID Number
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">99%</span>
                  </div>
                  <input
                    type="text"
                    value={formData.nationalIdNumber}
                    onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Date of Birth
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">98%</span>
                  </div>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                    District / County
                  </label>
                  <input
                    type="text"
                    value={formData.districtOfBirth}
                    onChange={(e) => setFormData({ ...formData, districtOfBirth: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-2 bg-slate-50 dark:bg-[#101C2C] rounded border border-slate-200 dark:border-[#203652] text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              <strong>Notice:</strong> Optical extraction confirms document representation only; it is not independent proof of document authenticity or official identity records.
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2 px-4 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Confirm & Continue
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: SELFIE CAPTURE */}
        {/* ================================================================= */}
        {currentStepDef.id === 'selfie' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Take a Live Selfie</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                {resolvedProfile.applicantInstructions?.selfieHelp ||
                  'Position your face inside the oval frame. Remove glasses, hats, or face coverings.'}
              </p>
            </div>

            {/* Selfie Oval Frame */}
            <div className="relative w-44 h-56 mx-auto rounded-full border-4 border-[#2676D2] overflow-hidden bg-[#101C2C] flex items-center justify-center text-white shadow-inner">
              {selfieCaptured ? (
                <div className="text-center p-3">
                  <CheckCircle2 className="w-10 h-10 text-[#26B8C7] mx-auto mb-1.5" />
                  <p className="text-xs font-semibold">Selfie Captured</p>
                  <p className="text-[10px] text-slate-300">Front portrait stored</p>
                </div>
              ) : (
                <div className="text-center p-3">
                  <Smile className="w-10 h-10 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-300">Center face in frame</p>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setSelfieCaptured(!selfieCaptured)}
                className="px-3.5 py-1.5 bg-[#172B43] hover:bg-[#203652] text-white text-xs font-semibold rounded border border-[#203652] inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-[#26B8C7]" />
                <span>{selfieCaptured ? 'Retake Selfie' : 'Capture Live Photo'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded"
              >
                Back
              </button>
              <button
                disabled={!selfieCaptured}
                onClick={handleNext}
                className={`flex-1 py-2 px-4 text-xs font-semibold rounded ${
                  selfieCaptured
                    ? 'bg-[#2676D2] hover:bg-[#1E62B0] text-white cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                Next: Liveness Check
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: LIVENESS VERIFICATION */}
        {/* ================================================================= */}
        {currentStepDef.id === 'liveness' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Active Liveness Challenge</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                Complete two quick motions to prove live human presence.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded border flex items-center justify-between ${
                livenessChallengesCompleted.includes('blink')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                  : 'bg-white dark:bg-[#101C2C] border-[#E2E8F0] dark:border-[#203652] text-[#101C2C] dark:text-white'
              }`}>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#2676D2] dark:text-cyan-300" />
                  <span>Action 1: Blink both eyes naturally</span>
                </div>
                {livenessChallengesCompleted.includes('blink') ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLivenessChallengesCompleted((prev) => [...prev, 'blink'])}
                    className="px-2.5 py-1 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-[11px] font-semibold rounded cursor-pointer"
                  >
                    Simulate Blink
                  </button>
                )}
              </div>

              <div className={`p-3 rounded border flex items-center justify-between ${
                livenessChallengesCompleted.includes('smile')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                  : 'bg-white dark:bg-[#101C2C] border-[#E2E8F0] dark:border-[#203652] text-[#101C2C] dark:text-white'
              }`}>
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-[#2676D2] dark:text-cyan-300" />
                  <span>Action 2: Smile towards the camera</span>
                </div>
                {livenessChallengesCompleted.includes('smile') ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLivenessChallengesCompleted((prev) => [...prev, 'smile'])}
                    className="px-2.5 py-1 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-[11px] font-semibold rounded cursor-pointer"
                  >
                    Simulate Smile
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Protects against 2D printed mask attacks, video replay, and generative deepfakes.
            </p>

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#203652] flex gap-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 text-xs font-semibold rounded"
              >
                Back
              </button>
              <button
                disabled={livenessChallengesCompleted.length < 2}
                onClick={handleNext}
                className={`flex-1 py-2 px-4 text-xs font-semibold rounded ${
                  livenessChallengesCompleted.length >= 2
                    ? 'bg-[#2676D2] hover:bg-[#1E62B0] text-white cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: PROCESSING / SUBMISSION */}
        {/* ================================================================= */}
        {currentStepDef.id === 'processing' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">Submit Evidence Package</h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                Review your session summary before final automated processing.
              </p>
            </div>

            <div className="bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Profile Purpose:</span>
                <span className="font-mono text-slate-900 dark:text-white">{resolvedProfile.verificationPurpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Document Type:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {hasDocuments ? selectedDocType.replace(/_/g, ' ') : 'N/A (Biometric Only)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biometric Liveness:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {hasLiveness ? '2 of 2 Challenges Passed' : 'Not Requested'}
                </span>
              </div>
            </div>

            {isSubmitting ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between text-xs text-[#536273] dark:text-slate-400">
                  <span>Executing automated evaluation...</span>
                  <span className="font-mono text-[#2676D2] font-semibold">{processingProgress}%</span>
                </div>
                <div className="w-full bg-[#E2E8F0] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2676D2] h-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <div className="bg-[#101C2C] rounded p-2.5 font-mono text-[10px] text-slate-300 space-y-1">
                  {processingLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-[#26B8C7]">›</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={handleFinalSubmit}
                className="w-full py-2.5 px-4 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Submit & Run Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP: COMPLETE / RESULT */}
        {/* ================================================================= */}
        {currentStepDef.id === 'complete' && (
          <div className="space-y-4 text-center py-2">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
              verificationOutcome === 'VERIFIED'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}>
              {verificationOutcome === 'VERIFIED' ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <AlertCircle className="w-7 h-7" />
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-[#101C2C] dark:text-white">
                {verificationOutcome === 'VERIFIED'
                  ? 'Identity Verification Verified'
                  : 'Queued for Compliance Review'}
              </h2>
              <p className="text-xs text-[#536273] dark:text-slate-400 mt-1">
                {verificationOutcome === 'VERIFIED'
                  ? `Your verification passed all configured checks for ${companyName}.`
                  : 'Document blur required secondary human verification. A compliance officer has been assigned.'}
              </p>
            </div>

            <div className="bg-[#F4F7FA] dark:bg-[#101C2C] border border-[#E2E8F0] dark:border-[#203652] rounded p-3 text-left text-xs space-y-1.5">
              <div className="flex justify-between items-center pb-1.5 border-b border-[#E2E8F0] dark:border-[#203652]">
                <span className="text-[#536273] dark:text-slate-400">Session ID:</span>
                <span className="font-mono font-bold text-[#101C2C] dark:text-white">
                  {initialSessionId || 'sess_demo_preview_9921'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#536273] dark:text-slate-400">Profile Version:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {resolvedProfile.name} ({resolvedProfile.version})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#536273] dark:text-slate-400">Decision Mode:</span>
                <span className="font-semibold text-[#16845B] dark:text-emerald-400">
                  {verificationOutcome === 'VERIFIED' ? 'AUTOMATICALLY_APPROVED (STP)' : 'NEEDS_HUMAN_REVIEW'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setStepIndex(0);
                setCapturedFront({
                  fileName: 'synthetic_ke_id_front.jpg',
                  fileSizeBytes: 420000,
                  blurScore: 0.94,
                  glareDetected: false,
                  cornersDetected: true,
                  passed: true,
                });
                setSelfieCaptured(false);
                setLivenessChallengesCompleted([]);
              }}
              className="w-full py-2 px-3 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#172B43] text-xs font-semibold rounded"
            >
              Restart Journey Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // If embedded in the Flow Builder, wrap inside responsive container without full-page padding
  if (isEmbeddedPreview) {
    return (
      <div className={`w-full ${previewDevice === 'mobile' ? 'max-w-sm mx-auto' : 'max-w-xl mx-auto'}`}>
        {containerContent}
      </div>
    );
  }

  // Standalone Hosted Page View (/verify)
  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#0B131E] py-6 sm:py-10 px-4 sm:px-6 transition-colors">
      <div className="max-w-md mx-auto">
        {containerContent}
        <div className="mt-4 text-center text-xs text-[#536273] dark:text-slate-500 space-y-1">
          <p>Protected by ICE Identity Verification Platform • Zero-Knowledge Encryption</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-600">Compliant with Kenya ODPC & Data Protection Act 2019</p>
        </div>
      </div>
    </div>
  );
}
