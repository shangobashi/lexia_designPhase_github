-- Migration: Add case task lifecycle entities for dashboard SLA queue
-- Date: 2026-02-11

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_task_status') THEN
        CREATE TYPE case_task_status AS ENUM ('scheduled', 'upcoming', 'overdue', 'completed');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.case_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    playbook_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'system_sla',
    status case_task_status NOT NULL DEFAULT 'scheduled',
    priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (case_id, playbook_id, source)
);

CREATE INDEX IF NOT EXISTS idx_case_tasks_user_status ON public.case_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_case_tasks_due_at ON public.case_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_case_tasks_case_id ON public.case_tasks(case_id);

ALTER TABLE public.case_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'case_tasks'
          AND policyname = 'Users can view own case tasks'
    ) THEN
        CREATE POLICY "Users can view own case tasks" ON public.case_tasks
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'case_tasks'
          AND policyname = 'Users can create own case tasks'
    ) THEN
        CREATE POLICY "Users can create own case tasks" ON public.case_tasks
            FOR INSERT WITH CHECK (
                auth.uid() = user_id
                AND EXISTS (
                    SELECT 1
                    FROM public.cases
                    WHERE cases.id = case_tasks.case_id
                      AND cases.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'case_tasks'
          AND policyname = 'Users can update own case tasks'
    ) THEN
        CREATE POLICY "Users can update own case tasks" ON public.case_tasks
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'case_tasks'
          AND policyname = 'Users can delete own case tasks'
    ) THEN
        CREATE POLICY "Users can delete own case tasks" ON public.case_tasks
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
        WHERE tgname = 'update_case_tasks_updated_at'
    ) THEN
        CREATE TRIGGER update_case_tasks_updated_at
            BEFORE UPDATE ON public.case_tasks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
