-- ============================================================================
-- ICE IDENTITY VERIFICATION PLATFORM — SUPABASE STORAGE & OBJECT POLICIES
-- Migration Version: 20261108000002
-- Configures private storage buckets and tenant-isolated storage RLS policies.
-- ============================================================================

-- 1. Create Private Buckets in Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('identity-evidence', 'identity-evidence', FALSE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('biometric-vault', 'biometric-vault', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('audit-archives', 'audit-archives', FALSE, 52428800, ARRAY['application/json', 'application/gzip', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET 
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects RLS Policies
-- Storage Path Structure: {organization_id}/sessions/{session_id}/{category}/{filename}
-- Example: 'org_apex_fin/sessions/sess_101/documents/id_front.jpg'

-- Policy A: SELECT (Download / Read)
-- Authenticated users can ONLY read objects where the top-level folder matches their active tenant ID.
CREATE POLICY "Tenant Isolated Storage Read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('identity-evidence', 'biometric-vault', 'audit-archives')
  AND (storage.foldername(name))[1] = public.current_tenant_id()::text
);

-- Policy B: INSERT (Upload)
-- Authenticated users can ONLY upload to paths prefixed with their active tenant ID.
CREATE POLICY "Tenant Isolated Storage Upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('identity-evidence', 'biometric-vault')
  AND (storage.foldername(name))[1] = public.current_tenant_id()::text
);

-- Policy C: DELETE (Evidence Protection)
-- Identity evidence is protected against deletion by standard reviewers to preserve compliance audit trails.
-- Deletion is restricted strictly to the service role or Organization Owner with compliance sign-off.
CREATE POLICY "Tenant Protected Storage Delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-evidence'
  AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
      AND u.organization_id = public.current_tenant_id()
      AND u.role IN ('ORGANIZATION_OWNER', 'COMPLIANCE_MANAGER')
  )
);
