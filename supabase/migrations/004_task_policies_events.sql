-- Migration: Add configurable task SLA policies and task audit events
-- Date: 2026-02-11

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_event_type') THEN
        CREATE TYPE task_event_type AS ENUM ('created', 'synced', 'completed', 'reopened');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.task_policies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    case_status case_status NOT NULL,
    source TEXT NOT NULL DEFAULT 'system_sla',
    sla_days INTEGER NOT NULL CHECK (sla_days BETWEEN 1 AND 60),
    reminder_window_days INTEGER NOT NULL DEFAULT 2 CHECK (reminder_window_days BETWEEN 0 AND 30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, case_status, source)
);

CREATE TABLE IF NOT EXISTS public.task_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.case_tasks(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type task_event_type NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'dashboard',
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_policies_user_status ON public.task_policies(user_id, case_status);
CREATE INDEX IF NOT EXISTS idx_task_events_user_created_at ON public.task_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON public.task_events(task_id);

ALTER TABLE public.task_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can view own task policies'
    ) THEN
        CREATE POLICY "Users can view own task policies" ON public.task_policies
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can create own task policies'
    ) THEN
        CREATE POLICY "Users can create own task policies" ON public.task_policies
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can update own task policies'
    ) THEN
        CREATE POLICY "Users can update own task policies" ON public.task_policies
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can delete own task policies'
    ) THEN
        CREATE POLICY "Users can delete own task policies" ON public.task_policies
            FOR DELETE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'task_events'
          AND policyname = 'Users can view own task events'
    ) THEN
        CREATE POLICY "Users can view own task events" ON public.task_events
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'task_events'
          AND policyname = 'Users can create own task events'
    ) THEN
        CREATE POLICY "Users can create own task events" ON public.task_events
            FOR INSERT WITH CHECK (
                auth.uid() = user_id
                AND EXISTS (
                    SELECT 1
                    FROM public.case_tasks
                    WHERE case_tasks.id = task_events.task_id
                      AND case_tasks.user_id = auth.uid()
                )
                AND EXISTS (
                    SELECT 1
                    FROM public.cases
                    WHERE cases.id = task_events.case_id
                      AND cases.user_id = auth.uid()
                )
            );
    END IF;
END
$$;

-- Seed baseline SLA policy defaults for current users.
INSERT INTO public.task_policies (user_id, case_status, source, sla_days, reminder_window_days, metadata)
SELECT id, 'active', 'system_sla', 5, 2, jsonb_build_object('origin', 'default_seed')
FROM public.profiles
ON CONFLICT (user_id, case_status, source) DO NOTHING;

INSERT INTO public.task_policies (user_id, case_status, source, sla_days, reminder_window_days, metadata)
SELECT id, 'pending', 'system_sla', 3, 1, jsonb_build_object('origin', 'default_seed')
FROM public.profiles
ON CONFLICT (user_id, case_status, source) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'update_updated_at_column'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_task_policies_updated_at'
    ) THEN
        CREATE TRIGGER update_task_policies_updated_at
            BEFORE UPDATE ON public.task_policies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
