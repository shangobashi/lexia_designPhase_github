-- Migration: Add policy-change audit events and task-event retention controls
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_policy_events_user_created_at
    ON public.task_policy_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_policy_events_case_status
    ON public.task_policy_events(case_status);

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

CREATE OR REPLACE FUNCTION public.trim_task_events(
    p_keep_days INTEGER DEFAULT 180,
    p_keep_latest INTEGER DEFAULT 200
)
RETURNS INTEGER AS $$
DECLARE
    normalized_keep_days INTEGER;
    normalized_keep_latest INTEGER;
    deleted_count INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    normalized_keep_days := GREATEST(7, LEAST(365, COALESCE(p_keep_days, 180)));
    normalized_keep_latest := GREATEST(10, LEAST(2000, COALESCE(p_keep_latest, 200)));

    WITH preserved_events AS (
        SELECT id
        FROM public.task_events
        WHERE user_id = auth.uid()
        ORDER BY created_at DESC
        LIMIT normalized_keep_latest
    )
    DELETE FROM public.task_events
    WHERE user_id = auth.uid()
      AND created_at < NOW() - make_interval(days => normalized_keep_days)
      AND id NOT IN (SELECT id FROM preserved_events);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.trim_task_events(INTEGER, INTEGER) TO authenticated;
