-- Migration: Persist workflow readiness telemetry for activation insights
-- Date: 2026-02-11

CREATE TABLE IF NOT EXISTS public.readiness_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    score_before INTEGER,
    score_after INTEGER,
    complete_before INTEGER,
    complete_after INTEGER,
    elapsed_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT readiness_telemetry_action_check CHECK (action_id IN ('memory', 'evidence', 'workflow', 'deadline')),
    CONSTRAINT readiness_telemetry_event_check CHECK (event_name IN ('resolve_click', 'readiness_lift', 'time_to_ready')),
    CONSTRAINT readiness_telemetry_score_before_check CHECK (score_before IS NULL OR (score_before >= 0 AND score_before <= 100)),
    CONSTRAINT readiness_telemetry_score_after_check CHECK (score_after IS NULL OR (score_after >= 0 AND score_after <= 100)),
    CONSTRAINT readiness_telemetry_elapsed_check CHECK (elapsed_ms IS NULL OR elapsed_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_readiness_telemetry_user_created
    ON public.readiness_telemetry(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_readiness_telemetry_user_event
    ON public.readiness_telemetry(user_id, event_name, created_at DESC);

ALTER TABLE public.readiness_telemetry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'readiness_telemetry'
          AND policyname = 'Users can view own readiness telemetry'
    ) THEN
        CREATE POLICY "Users can view own readiness telemetry" ON public.readiness_telemetry
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'readiness_telemetry'
          AND policyname = 'Users can create own readiness telemetry'
    ) THEN
        CREATE POLICY "Users can create own readiness telemetry" ON public.readiness_telemetry
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'readiness_telemetry'
          AND policyname = 'Users can delete own readiness telemetry'
    ) THEN
        CREATE POLICY "Users can delete own readiness telemetry" ON public.readiness_telemetry
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;
