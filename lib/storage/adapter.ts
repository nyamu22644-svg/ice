// ICE Private Storage Adapter Architecture
// Enforces private object storage, organization-and-session-scoped paths,
// short-lived signed URLs, MIME/size validation, and strict audit protection.

import { createAdminClient, isSupabaseAdminConfigured } from '../supabase/admin';

export interface StorageUploadResult {
  uploadUrl: string;
  storageRef: string;
  expiresAt: string;
  bucket: string;
}

export interface StorageReadResult {
  readUrl: string;
  expiresAt: string;
  bucket: string;
}

export interface StorageAdapter {
  generateSignedUploadUrl(
    tenantId: string,
    sessionId: string,
    category: 'documents' | 'biometrics' | 'audit',
    filename: string,
    mimeType: string,
    fileSizeBytes?: number
  ): Promise<StorageUploadResult>;

  generateSignedReadUrl(
    tenantId: string,
    storageRef: string,
    durationSeconds?: number
  ): Promise<StorageReadResult>;

  deleteObject(
    tenantId: string,
    storageRef: string,
    operatorRole?: string
  ): Promise<boolean>;

  validateUploadCriteria(
    category: 'documents' | 'biometrics' | 'audit',
    mimeType: string,
    fileSizeBytes?: number
  ): { valid: boolean; error?: string };
}

const BUCKET_MAPPING = {
  documents: 'identity-evidence',
  biometrics: 'biometric-vault',
  audit: 'audit-archives',
} as const;

const ALLOWED_MIME_TYPES = {
  'identity-evidence': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  'biometric-vault': ['image/jpeg', 'image/png', 'image/webp'],
  'audit-archives': ['application/json', 'application/gzip', 'text/csv'],
};

const MAX_FILE_SIZE_BYTES = {
  'identity-evidence': 15 * 1024 * 1024, // 15MB
  'biometric-vault': 10 * 1024 * 1024,   // 10MB
  'audit-archives': 50 * 1024 * 1024,    // 50MB
};

export class SupabasePrivateStorageAdapter implements StorageAdapter {
  validateUploadCriteria(
    category: 'documents' | 'biometrics' | 'audit',
    mimeType: string,
    fileSizeBytes?: number
  ): { valid: boolean; error?: string } {
    const bucket = BUCKET_MAPPING[category];
    const allowedMimes = ALLOWED_MIME_TYPES[bucket] || [];
    const maxSize = MAX_FILE_SIZE_BYTES[bucket];

    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      return {
        valid: false,
        error: `[ICE Storage Policy] Invalid MIME type '${mimeType}' for ${category}. Allowed types: ${allowedMimes.join(', ')}`,
      };
    }

    if (fileSizeBytes !== undefined && fileSizeBytes > maxSize) {
      return {
        valid: false,
        error: `[ICE Storage Policy] File size ${Math.round(fileSizeBytes / 1024)}KB exceeds maximum allowable limit of ${Math.round(maxSize / (1024 * 1024))}MB.`,
      };
    }

    return { valid: true };
  }

  /**
   * Generates a pre-signed upload URL for client-side direct upload without passing files
   * through web application memory. Enforces organization- and session-scoped path structure.
   */
  async generateSignedUploadUrl(
    tenantId: string,
    sessionId: string,
    category: 'documents' | 'biometrics' | 'audit',
    filename: string,
    mimeType: string,
    fileSizeBytes?: number
  ): Promise<StorageUploadResult> {
    const validation = this.validateUploadCriteria(category, mimeType, fileSizeBytes);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Path structure: {organization_id}/sessions/{session_id}/{category}/{sanitized_filename}
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = `${tenantId}/sessions/${sessionId}/${category}/${sanitizedFilename}`;
    const bucket = BUCKET_MAPPING[category];
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-minute TTL

    // When real Supabase service-role client is available
    if (isSupabaseAdminConfigured) {
      const admin = createAdminClient();
      if (!admin) {
        throw new Error('[ICE Storage Error] Supabase admin client unavailable.');
      }

      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUploadUrl(storageRef);

      if (error) {
        throw new Error(`[ICE Storage Error] Failed to generate signed upload URL from Supabase: ${error.message}`);
      }

      return {
        uploadUrl: data.signedUrl,
        storageRef,
        expiresAt,
        bucket,
      };
    }

    // Sandbox / Synthetic Mode
    const uploadUrl = `https://ice-storage-sandbox.internal/${bucket}/${storageRef}?sig=tok_${Math.random().toString(36).substring(2, 10)}&exp=900`;
    return {
      uploadUrl,
      storageRef,
      expiresAt,
      bucket,
    };
  }

  /**
   * Generates a short-lived signed GET URL for authorized review.
   * Default expiration: 300 seconds (5 minutes).
   */
  async generateSignedReadUrl(
    tenantId: string,
    storageRef: string,
    durationSeconds = 300
  ): Promise<StorageReadResult> {
    // Validate storageRef strictly belongs to this organization
    const expectedPrefix = `${tenantId}/`;
    if (!storageRef.startsWith(expectedPrefix)) {
      throw new Error(`[ICE Storage Security] Prohibited cross-tenant storage access attempt for path: ${storageRef}`);
    }

    // Determine bucket based on path category
    let bucket: string = 'identity-evidence';
    if (storageRef.includes('/biometrics/')) {
      bucket = 'biometric-vault';
    } else if (storageRef.includes('/audit/')) {
      bucket = 'audit-archives';
    }

    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

    if (isSupabaseAdminConfigured) {
      const admin = createAdminClient();
      if (!admin) {
        throw new Error('[ICE Storage Error] Supabase admin client unavailable.');
      }

      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(storageRef, durationSeconds);

      if (error || !data?.signedUrl) {
        throw new Error(`[ICE Storage Error] Failed to generate signed read URL from Supabase: ${error?.message || 'Unknown error'}`);
      }

      return {
        readUrl: data.signedUrl,
        expiresAt,
        bucket,
      };
    }

    // Sandbox Synthetic Mode
    const readUrl = `https://ice-storage-sandbox.internal/${bucket}/${storageRef}?sig=read_${Math.random().toString(36).substring(2, 10)}&exp=${durationSeconds}`;
    return {
      readUrl,
      expiresAt,
      bucket,
    };
  }

  async deleteObject(
    tenantId: string,
    storageRef: string,
    operatorRole = 'ORGANIZATION_OWNER'
  ): Promise<boolean> {
    const expectedPrefix = `${tenantId}/`;
    if (!storageRef.startsWith(expectedPrefix)) {
      throw new Error(`[ICE Storage Security] Prohibited cross-tenant storage deletion attempt: ${storageRef}`);
    }

    // Role check: Only Owner or Compliance Officer can request document purge
    if (operatorRole !== 'ORGANIZATION_OWNER' && operatorRole !== 'COMPLIANCE_MANAGER' && operatorRole !== 'PLATFORM_SUPER_ADMIN') {
      throw new Error(`[ICE Compliance Gate] Role '${operatorRole}' lacks authority to delete verification identity evidence.`);
    }

    let bucket: string = 'identity-evidence';
    if (storageRef.includes('/biometrics/')) bucket = 'biometric-vault';
    if (storageRef.includes('/audit/')) bucket = 'audit-archives';

    if (isSupabaseAdminConfigured) {
      const admin = createAdminClient();
      if (!admin) {
        throw new Error('[ICE Storage Error] Supabase admin client unavailable.');
      }

      const { error } = await admin.storage.from(bucket).remove([storageRef]);
      if (error) {
        throw new Error(`[ICE Storage Error] Failed to delete object from Supabase Storage: ${error.message}`);
      }
      return true;
    }

    return true;
  }
}

export const storageAdapter = new SupabasePrivateStorageAdapter();
