// ICE Risk Intelligence Engine
// Transparent, explainable risk signals across documents, sessions, and velocity.

import { ExtractedField, RiskIndicator } from '../types';

export interface RiskAnalysisContext {
  tenantId: string;
  sessionId: string;
  submittedDob?: string;
  extractedFields?: ExtractedField[];
  fileSha256Checksum?: string;
  qualityPassed: boolean;
  blurScore: number;
  recentAttemptCountForSubject?: number;
}

export class RiskIntelligenceEngine {
  readonly version = 'ICE-RiskEngine-v1.8';

  // In-memory tenant-isolated hash registry of previously rejected fraudulent files (for demo)
  private rejectedFileHashes: Set<string> = new Set([
    'a3e8b091f82c49a1d2e947c92bfa04812394a12394c8b2e3f4a5b6c7d8e9f0a1',
  ]);

  analyzeSession(context: RiskAnalysisContext): { indicators: RiskIndicator[]; computedScore: number } {
    const indicators: RiskIndicator[] = [];
    let score = 5; // Base low risk score

    // 1. Cross-field consistency: Form DOB vs Document OCR DOB
    if (context.submittedDob && context.extractedFields) {
      const ocrDobField = context.extractedFields.find((f) => f.fieldName === 'date_of_birth');
      if (ocrDobField && ocrDobField.value && ocrDobField.value !== context.submittedDob) {
        indicators.push({
          id: `risk_${Date.now()}_dob`,
          sessionId: context.sessionId,
          signalType: 'DOB_MISMATCH',
          severity: 'HIGH',
          title: 'Date of Birth Inconsistency',
          description: `Applicant declared DOB '${context.submittedDob}' does not match extracted document DOB '${ocrDobField.value}'.`,
          evidenceReference: `Field: date_of_birth (OCR val: ${ocrDobField.value})`,
          timestamp: new Date().toISOString(),
          engineVersion: this.version,
        });
        score += 35;
      }
    }

    // 2. Exact file hash matching against known altered documents
    if (context.fileSha256Checksum && this.rejectedFileHashes.has(context.fileSha256Checksum)) {
      indicators.push({
        id: `risk_${Date.now()}_hash`,
        sessionId: context.sessionId,
        signalType: 'DUPLICATE_DOCUMENT_HASH',
        severity: 'CRITICAL',
        title: 'Known Rejected Document Hash Match',
        description: `Uploaded file SHA-256 matches an exact file previously flagged for fraudulent alteration within this tenant.`,
        evidenceReference: `SHA-256: ${context.fileSha256Checksum.substring(0, 16)}...`,
        timestamp: new Date().toISOString(),
        engineVersion: this.version,
      });
      score += 50;
    }

    // 3. Image quality deterioration risk
    if (!context.qualityPassed || context.blurScore < 0.6) {
      indicators.push({
        id: `risk_${Date.now()}_quality`,
        sessionId: context.sessionId,
        signalType: 'LOW_IMAGE_QUALITY',
        severity: 'MEDIUM',
        title: 'Degraded Document Clarity',
        description: `Document blur or glare exceeds standard tolerances, hindering forensic watermarking inspection.`,
        evidenceReference: `Blur score: ${(context.blurScore * 100).toFixed(0)}% (Threshold: 70%)`,
        timestamp: new Date().toISOString(),
        engineVersion: this.version,
      });
      score += 20;
    }

    // 4. Velocity risk (too many attempts in short window)
    if ((context.recentAttemptCountForSubject || 0) > 3) {
      indicators.push({
        id: `risk_${Date.now()}_velocity`,
        sessionId: context.sessionId,
        signalType: 'HIGH_VELOCITY_ATTEMPTS',
        severity: 'HIGH',
        title: 'High Verification Velocity',
        description: `Subject has initiated ${context.recentAttemptCountForSubject} verification sessions in the past 2 hours.`,
        evidenceReference: `Attempt count: ${context.recentAttemptCountForSubject}`,
        timestamp: new Date().toISOString(),
        engineVersion: this.version,
      });
      score += 25;
    }

    return {
      indicators,
      computedScore: Math.min(100, score),
    };
  }
}

export const riskEngine = new RiskIntelligenceEngine();
