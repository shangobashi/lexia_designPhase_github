-- Migration: Persist signed audit export artifacts for chain-of-custody workflows
-- Date: 2026-02-11

CREATE TABLE IF NOT EXISTS public.audit_export_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL DEFAULT 'case_audit_timeline',
    case_ref TEXT,
    event_count INTEGER NOT NULL DEFAULT 0,
    csv_sha256 TEXT NOT NULL,
    manifest_sha256 TEXT NOT NULL,
    export_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    receipt_payload JSONB NOT NULL,
    receipt_sha256 TEXT NOT NULL,
    signature_algorithm TEXT NOT NULL,
    signature_key_id TEXT,
    signature_value TEXT NOT NULL,
    retention_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_export_artifacts_type_check CHECK (artifact_type IN ('case_audit_timeline')),
    CONSTRAINT audit_export_artifacts_event_count_check CHECK (event_count >= 0),
    CONSTRAINT audit_export_artifacts_csv_sha_check CHECK (char_length(csv_sha256) = 64),
    CONSTRAINT audit_export_artifacts_manifest_sha_check CHECK (char_length(manifest_sha256) = 64),
    CONSTRAINT audit_export_artifacts_receipt_sha_check CHECK (char_length(receipt_sha256) = 64)
);

CREATE INDEX IF NOT EXISTS idx_audit_export_artifacts_user_created
    ON public.audit_export_artifacts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_export_artifacts_user_case
    ON public.audit_export_artifacts(user_id, case_ref, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_export_artifacts_user_retention
    ON public.audit_export_artifacts(user_id, retention_expires_at DESC);

ALTER TABLE public.audit_export_artifacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'audit_export_artifacts'
          AND policyname = 'Users can view own audit export artifacts'
    ) THEN
        CREATE POLICY "Users can view own audit export artifacts" ON public.audit_export_artifacts
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'audit_export_artifacts'
          AND policyname = 'Users can create own audit export artifacts'
    ) THEN
        CREATE POLICY "Users can create own audit export artifacts" ON public.audit_export_artifacts
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'audit_export_artifacts'
          AND policyname = 'Users can delete own audit export artifacts'
    ) THEN
        CREATE POLICY "Users can delete own audit export artifacts" ON public.audit_export_artifacts
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;
