-- Migration: Task event filtering and pagination support
-- Date: 2026-02-11

ALTER TABLE public.task_events
    ADD COLUMN IF NOT EXISTS playbook_id TEXT;

-- Backfill from the canonical case task relation when possible.
UPDATE public.task_events task_event_rows
SET playbook_id = case_task_rows.playbook_id
FROM public.case_tasks case_task_rows
WHERE task_event_rows.playbook_id IS NULL
  AND task_event_rows.task_id = case_task_rows.id;

-- Backfill from payload for manually inserted events that already carry a playbookId.
UPDATE public.task_events
SET playbook_id = payload->>'playbookId'
WHERE playbook_id IS NULL
  AND payload ? 'playbookId'
  AND COALESCE(payload->>'playbookId', '') <> '';

CREATE INDEX IF NOT EXISTS idx_task_events_user_event_case_created
    ON public.task_events(user_id, event_type, case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_events_user_playbook_created
    ON public.task_events(user_id, playbook_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_case_task_events()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.task_events (
            task_id,
            case_id,
            user_id,
            playbook_id,
            event_type,
            event_source,
            payload
        )
        VALUES (
            NEW.id,
            NEW.case_id,
            NEW.user_id,
            NEW.playbook_id,
            'created',
            'system-trigger',
            jsonb_build_object(
                'status', NEW.status,
                'priority', NEW.priority,
                'due_at', NEW.due_at,
                'source', NEW.source,
                'playbookId', NEW.playbook_id
            )
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'completed' THEN
                INSERT INTO public.task_events (
                    task_id,
                    case_id,
                    user_id,
                    playbook_id,
                    event_type,
                    event_source,
                    payload
                )
                VALUES (
                    NEW.id,
                    NEW.case_id,
                    NEW.user_id,
                    NEW.playbook_id,
                    'completed',
                    'system-trigger',
                    jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'priority', NEW.priority,
                        'due_at', NEW.due_at,
                        'completed_at', NEW.completed_at,
                        'playbookId', NEW.playbook_id
                    )
                );
            ELSIF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
                INSERT INTO public.task_events (
                    task_id,
                    case_id,
                    user_id,
                    playbook_id,
                    event_type,
                    event_source,
                    payload
                )
                VALUES (
                    NEW.id,
                    NEW.case_id,
                    NEW.user_id,
                    NEW.playbook_id,
                    'reopened',
                    'system-trigger',
                    jsonb_build_object(
                        'previous_status', OLD.status,
                        'new_status', NEW.status,
                        'priority', NEW.priority,
                        'due_at', NEW.due_at,
                        'playbookId', NEW.playbook_id
                    )
                );
            END IF;
        END IF;

        IF OLD.due_at IS DISTINCT FROM NEW.due_at
           OR OLD.priority IS DISTINCT FROM NEW.priority THEN
            INSERT INTO public.task_events (
                task_id,
                case_id,
                user_id,
                playbook_id,
                event_type,
                event_source,
                payload
            )
            VALUES (
                NEW.id,
                NEW.case_id,
                NEW.user_id,
                NEW.playbook_id,
                'synced',
                'system-trigger',
                jsonb_build_object(
                    'old_due_at', OLD.due_at,
                    'new_due_at', NEW.due_at,
                    'old_priority', OLD.priority,
                    'new_priority', NEW.priority,
                    'playbookId', NEW.playbook_id
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
