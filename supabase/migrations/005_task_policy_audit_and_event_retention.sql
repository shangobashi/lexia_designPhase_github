-- Migration: Task policy audit log + lightweight task event retention controls
-- Date: 2026-02-11

CREATE TABLE IF NOT EXISTS public.task_policy_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    case_status case_status NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'dashboard-policy',
    previous_sla_days INTEGER,
    previous_reminder_window_days INTEGER,
    new_sla_days INTEGER NOT NULL CHECK (new_sla_days BETWEEN 1 AND 30),
    new_reminder_window_days INTEGER NOT NULL CHECK (new_reminder_window_days BETWEEN 0 AND 14),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (new_reminder_window_days < new_sla_days)
);

CREATE INDEX IF NOT EXISTS idx_task_policy_events_user_created_at
    ON public.task_policy_events(user_id, created_at DESC);

ALTER TABLE public.task_policy_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_policy_events'
          AND policyname = 'Users can view own task policy events'
    ) THEN
        CREATE POLICY "Users can view own task policy events" ON public.task_policy_events
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_policy_events'
          AND policyname = 'Users can create own task policy events'
    ) THEN
        CREATE POLICY "Users can create own task policy events" ON public.task_policy_events
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_events'
          AND policyname = 'Users can delete own task events'
    ) THEN
        CREATE POLICY "Users can delete own task events" ON public.task_events
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.trim_task_events(
    p_keep_days INTEGER DEFAULT 180,
    p_keep_latest INTEGER DEFAULT 200
)
RETURNS INTEGER AS $$
DECLARE
    normalized_keep_days INTEGER := GREATEST(7, LEAST(p_keep_days, 365));
    normalized_keep_latest INTEGER := GREATEST(20, LEAST(p_keep_latest, 1000));
    deleted_stale_count INTEGER := 0;
    deleted_overflow_count INTEGER := 0;
BEGIN
    DELETE FROM public.task_events
    WHERE user_id = auth.uid()
      AND created_at < NOW() - make_interval(days => normalized_keep_days);

    GET DIAGNOSTICS deleted_stale_count = ROW_COUNT;

    WITH ranked_events AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY created_at DESC) AS row_num
        FROM public.task_events
        WHERE user_id = auth.uid()
    )
    DELETE FROM public.task_events event_rows
    USING ranked_events
    WHERE event_rows.id = ranked_events.id
      AND ranked_events.row_num > normalized_keep_latest;

    GET DIAGNOSTICS deleted_overflow_count = ROW_COUNT;

    RETURN deleted_stale_count + deleted_overflow_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

