-- Migration: Persist readiness export bundle history for dashboard retrieval
-- Date: 2026-02-11

CREATE TABLE IF NOT EXISTS public.readiness_export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signature_mode TEXT NOT NULL DEFAULT 'local_checksum',
    cadence TEXT NOT NULL DEFAULT 'off',
    playbook_scope TEXT NOT NULL DEFAULT 'all',
    case_scope TEXT NOT NULL DEFAULT 'all',
    event_count INTEGER NOT NULL DEFAULT 0,
    csv_sha256 TEXT NOT NULL,
    manifest_sha256 TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT readiness_export_signature_mode_check CHECK (signature_mode IN ('local_checksum', 'server_attested')),
    CONSTRAINT readiness_export_cadence_check CHECK (cadence IN ('off', 'weekly', 'monthly')),
    CONSTRAINT readiness_export_case_scope_check CHECK (case_scope IN ('all', 'case-linked', 'ad-hoc')),
    CONSTRAINT readiness_export_csv_sha_check CHECK (char_length(csv_sha256) = 64),
    CONSTRAINT readiness_export_manifest_sha_check CHECK (char_length(manifest_sha256) = 64),
    CONSTRAINT readiness_export_event_count_check CHECK (event_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_readiness_export_history_user_created
    ON public.readiness_export_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_readiness_export_history_user_signature
    ON public.readiness_export_history(user_id, signature_mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_readiness_export_history_user_manifest
    ON public.readiness_export_history(user_id, manifest_sha256);

ALTER TABLE public.readiness_export_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'readiness_export_history'
          AND policyname = 'Users can view own readiness export history'
    ) THEN
        CREATE POLICY "Users can view own readiness export history" ON public.readiness_export_history
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'readiness_export_history'
          AND policyname = 'Users can create own readiness export history'
    ) THEN
        CREATE POLICY "Users can create own readiness export history" ON public.readiness_export_history
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'readiness_export_history'
          AND policyname = 'Users can delete own readiness export history'
    ) THEN
        CREATE POLICY "Users can delete own readiness export history" ON public.readiness_export_history
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;
