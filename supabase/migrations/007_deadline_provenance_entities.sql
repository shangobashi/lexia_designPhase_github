-- Migration: Persisted deadline provenance entities
-- Date: 2026-02-11

CREATE TABLE IF NOT EXISTS public.deadline_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.case_tasks(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_document TEXT,
    deadline_type TEXT NOT NULL DEFAULT 'procedural',
    jurisdiction_rule_ref TEXT,
    citation_anchor TEXT,
    confidence_basis TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT deadline_sources_deadline_type_check CHECK (deadline_type IN ('procedural', 'followup', 'statutory')),
    CONSTRAINT deadline_sources_task_unique UNIQUE (task_id)
);

CREATE INDEX IF NOT EXISTS idx_deadline_sources_user_task
    ON public.deadline_sources(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_deadline_sources_case
    ON public.deadline_sources(case_id, created_at DESC);

ALTER TABLE public.deadline_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_sources'
          AND policyname = 'Users can view own deadline sources'
    ) THEN
        CREATE POLICY "Users can view own deadline sources" ON public.deadline_sources
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_sources'
          AND policyname = 'Users can create own deadline sources'
    ) THEN
        CREATE POLICY "Users can create own deadline sources" ON public.deadline_sources
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_sources'
          AND policyname = 'Users can update own deadline sources'
    ) THEN
        CREATE POLICY "Users can update own deadline sources" ON public.deadline_sources
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_sources'
          AND policyname = 'Users can delete own deadline sources'
    ) THEN
        CREATE POLICY "Users can delete own deadline sources" ON public.deadline_sources
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_deadline_sources_updated_at'
    ) THEN
        CREATE TRIGGER update_deadline_sources_updated_at
            BEFORE UPDATE ON public.deadline_sources
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.deadline_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.deadline_sources(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.case_tasks(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL DEFAULT 'document_excerpt',
    evidence_excerpt TEXT,
    evidence_locator TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT deadline_evidence_type_check CHECK (evidence_type IN ('document_excerpt', 'rule_reference', 'timeline_event', 'manual_note'))
);

CREATE INDEX IF NOT EXISTS idx_deadline_evidence_user_task
    ON public.deadline_evidence(user_id, task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deadline_evidence_source
    ON public.deadline_evidence(source_id, created_at DESC);

ALTER TABLE public.deadline_evidence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_evidence'
          AND policyname = 'Users can view own deadline evidence'
    ) THEN
        CREATE POLICY "Users can view own deadline evidence" ON public.deadline_evidence
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_evidence'
          AND policyname = 'Users can create own deadline evidence'
    ) THEN
        CREATE POLICY "Users can create own deadline evidence" ON public.deadline_evidence
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_evidence'
          AND policyname = 'Users can update own deadline evidence'
    ) THEN
        CREATE POLICY "Users can update own deadline evidence" ON public.deadline_evidence
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'deadline_evidence'
          AND policyname = 'Users can delete own deadline evidence'
    ) THEN
        CREATE POLICY "Users can delete own deadline evidence" ON public.deadline_evidence
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;
