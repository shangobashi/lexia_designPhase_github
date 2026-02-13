-- Migration: Add configurable SLA policies and task audit events
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
    sla_days INTEGER NOT NULL CHECK (sla_days BETWEEN 1 AND 30),
    reminder_window_days INTEGER NOT NULL DEFAULT 2 CHECK (reminder_window_days BETWEEN 0 AND 14),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, case_status, source)
);

CREATE INDEX IF NOT EXISTS idx_task_policies_user_status_active
    ON public.task_policies(user_id, case_status, is_active);

ALTER TABLE public.task_policies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can view own task policies'
    ) THEN
        CREATE POLICY "Users can view own task policies" ON public.task_policies
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can create own task policies'
    ) THEN
        CREATE POLICY "Users can create own task policies" ON public.task_policies
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can update own task policies'
    ) THEN
        CREATE POLICY "Users can update own task policies" ON public.task_policies
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_policies'
          AND policyname = 'Users can delete own task policies'
    ) THEN
        CREATE POLICY "Users can delete own task policies" ON public.task_policies
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

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

-- Seed defaults for existing users.
INSERT INTO public.task_policies (user_id, case_status, source, sla_days, reminder_window_days, is_active, metadata)
SELECT id, 'active', 'system_sla', 5, 2, TRUE, '{"origin":"migration_seed"}'::jsonb
FROM public.profiles
ON CONFLICT (user_id, case_status, source) DO NOTHING;

INSERT INTO public.task_policies (user_id, case_status, source, sla_days, reminder_window_days, is_active, metadata)
SELECT id, 'pending', 'system_sla', 3, 1, TRUE, '{"origin":"migration_seed"}'::jsonb
FROM public.profiles
ON CONFLICT (user_id, case_status, source) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.task_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.case_tasks(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type task_event_type NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'system-trigger',
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_events_user_created_at
    ON public.task_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_task_id
    ON public.task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type
    ON public.task_events(event_type);

ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'task_events'
          AND policyname = 'Users can view own task events'
    ) THEN
        CREATE POLICY "Users can view own task events" ON public.task_events
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
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
            );
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.log_case_task_events()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.task_events (task_id, case_id, user_id, event_type, event_source, payload)
        VALUES (
            NEW.id,
            NEW.case_id,
            NEW.user_id,
            'created',
            'system-trigger',
            jsonb_build_object(
                'status', NEW.status,
                'priority', NEW.priority,
                'due_at', NEW.due_at,
                'source', NEW.source
            )
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'completed' THEN
                INSERT INTO public.task_events (task_id, case_id, user_id, event_type, event_source, payload)
                VALUES (
                    NEW.id,
                    NEW.case_id,
                    NEW.user_id,
                    'completed',
                    'system-trigger',
                    jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'priority', NEW.priority,
                        'due_at', NEW.due_at,
                        'completed_at', NEW.completed_at
                    )
                );
            ELSIF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
                INSERT INTO public.task_events (task_id, case_id, user_id, event_type, event_source, payload)
                VALUES (
                    NEW.id,
                    NEW.case_id,
                    NEW.user_id,
                    'reopened',
                    'system-trigger',
                    jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'priority', NEW.priority,
                        'due_at', NEW.due_at
                    )
                );
            END IF;
        END IF;

        IF OLD.due_at IS DISTINCT FROM NEW.due_at
           OR OLD.priority IS DISTINCT FROM NEW.priority THEN
            INSERT INTO public.task_events (task_id, case_id, user_id, event_type, event_source, payload)
            VALUES (
                NEW.id,
                NEW.case_id,
                NEW.user_id,
                'synced',
                'system-trigger',
                jsonb_build_object(
                    'old_due_at', OLD.due_at,
                    'new_due_at', NEW.due_at,
                    'old_priority', OLD.priority,
                    'new_priority', NEW.priority
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'log_case_task_events_trigger'
    ) THEN
        CREATE TRIGGER log_case_task_events_trigger
            AFTER INSERT OR UPDATE ON public.case_tasks
            FOR EACH ROW EXECUTE FUNCTION public.log_case_task_events();
    END IF;
END
$$;
