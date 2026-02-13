import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'your-supabase-url' &&
  supabaseAnonKey !== 'your-supabase-anon-key'
);

// Create client with real or empty credentials
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase non configuré - cette fonctionnalité nécessite une connexion Supabase.');
  }
}

// Database types (generated from schema)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          is_trust_admin: boolean;
          subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
          subscription_plan: 'free' | 'basic' | 'premium';
          stripe_customer_id: string | null;
          paypal_customer_id: string | null;
          credits_remaining: number;
          trial_ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_trust_admin?: boolean;
          subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing';
          subscription_plan?: 'free' | 'basic' | 'premium';
          stripe_customer_id?: string | null;
          paypal_customer_id?: string | null;
          credits_remaining?: number;
          trial_ends_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          is_trust_admin?: boolean;
          subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing';
          subscription_plan?: 'free' | 'basic' | 'premium';
          stripe_customer_id?: string | null;
          paypal_customer_id?: string | null;
          credits_remaining?: number;
          trial_ends_at?: string;
        };
      };
      cases: {
        Row: {
          id: string;
          case_id: string;
          user_id: string;
          title: string;
          description: string;
          status: 'active' | 'pending' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          case_id: string;
          user_id: string;
          title: string;
          description: string;
          status?: 'active' | 'pending' | 'closed';
        };
        Update: {
          title?: string;
          description?: string;
          status?: 'active' | 'pending' | 'closed';
        };
      };
      messages: {
        Row: {
          id: string;
          case_id: string;
          content: string;
          sender: 'user' | 'assistant';
          ai_provider: string | null;
          token_count: number | null;
          created_at: string;
        };
        Insert: {
          case_id: string;
          content: string;
          sender: 'user' | 'assistant';
          ai_provider?: string | null;
          token_count?: number | null;
        };
        Update: {
          content?: string;
          ai_provider?: string | null;
          token_count?: number | null;
        };
      };
      documents: {
        Row: {
          id: string;
          case_id: string;
          name: string;
          original_name: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          url: string | null;
          analysis_status: string;
          analysis_result: any | null;
          uploaded_at: string;
        };
        Insert: {
          case_id: string;
          name: string;
          original_name: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          url?: string | null;
          analysis_status?: string;
          analysis_result?: any | null;
        };
        Update: {
          name?: string;
          analysis_status?: string;
          analysis_result?: any | null;
          url?: string | null;
        };
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          document_id: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          document_id: string;
        };
        Update: {};
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          paypal_subscription_id: string | null;
          plan: 'free' | 'basic' | 'premium';
          status: 'active' | 'canceled' | 'past_due' | 'trialing';
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plan: 'free' | 'basic' | 'premium';
          status: 'active' | 'canceled' | 'past_due' | 'trialing';
          stripe_subscription_id?: string | null;
          paypal_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: {
          plan?: 'free' | 'basic' | 'premium';
          status?: 'active' | 'canceled' | 'past_due' | 'trialing';
          stripe_subscription_id?: string | null;
          paypal_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
      };
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          case_id: string | null;
          action_type: string;
          ai_provider: string | null;
          token_count: number | null;
          credits_used: number;
          metadata: any | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          case_id?: string | null;
          action_type: string;
          ai_provider?: string | null;
          token_count?: number | null;
          credits_used?: number;
          metadata?: any | null;
        };
        Update: {};
      };
      case_tasks: {
        Row: {
          id: string;
          case_id: string;
          user_id: string;
          playbook_id: string;
          source: string;
          status: 'scheduled' | 'upcoming' | 'overdue' | 'completed';
          priority: number;
          due_at: string;
          completed_at: string | null;
          metadata: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          case_id: string;
          user_id: string;
          playbook_id: string;
          source?: string;
          status?: 'scheduled' | 'upcoming' | 'overdue' | 'completed';
          priority?: number;
          due_at: string;
          completed_at?: string | null;
          metadata?: any | null;
        };
        Update: {
          playbook_id?: string;
          source?: string;
          status?: 'scheduled' | 'upcoming' | 'overdue' | 'completed';
          priority?: number;
          due_at?: string;
          completed_at?: string | null;
          metadata?: any | null;
        };
      };
      task_policies: {
        Row: {
          id: string;
          user_id: string;
          case_status: 'active' | 'pending' | 'closed';
          source: string;
          sla_days: number;
          reminder_window_days: number;
          is_active: boolean;
          metadata: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          case_status: 'active' | 'pending' | 'closed';
          source?: string;
          sla_days: number;
          reminder_window_days?: number;
          is_active?: boolean;
          metadata?: any | null;
        };
        Update: {
          source?: string;
          sla_days?: number;
          reminder_window_days?: number;
          is_active?: boolean;
          metadata?: any | null;
        };
      };
      task_events: {
        Row: {
          id: string;
          task_id: string;
          case_id: string;
          user_id: string;
          playbook_id: string | null;
          event_type: 'created' | 'synced' | 'completed' | 'reopened';
          event_source: string;
          payload: any | null;
          created_at: string;
        };
        Insert: {
          task_id: string;
          case_id: string;
          user_id: string;
          playbook_id?: string | null;
          event_type: 'created' | 'synced' | 'completed' | 'reopened';
          event_source?: string;
          payload?: any | null;
        };
        Update: {};
      };
      task_policy_events: {
        Row: {
          id: string;
          user_id: string;
          case_status: 'active' | 'pending' | 'closed';
          event_source: string;
          previous_sla_days: number | null;
          previous_reminder_window_days: number | null;
          new_sla_days: number;
          new_reminder_window_days: number;
          metadata: any | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          case_status: 'active' | 'pending' | 'closed';
          event_source?: string;
          previous_sla_days?: number | null;
          previous_reminder_window_days?: number | null;
          new_sla_days: number;
          new_reminder_window_days: number;
          metadata?: any | null;
        };
        Update: {};
      };
      task_event_preferences: {
        Row: {
          id: string;
          user_id: string;
          auto_prune_enabled: boolean;
          prune_interval_hours: number;
          keep_days: number;
          keep_latest: number;
          last_pruned_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          auto_prune_enabled?: boolean;
          prune_interval_hours?: number;
          keep_days?: number;
          keep_latest?: number;
          last_pruned_at?: string | null;
        };
        Update: {
          auto_prune_enabled?: boolean;
          prune_interval_hours?: number;
          keep_days?: number;
          keep_latest?: number;
          last_pruned_at?: string | null;
        };
      };
      deadline_sources: {
        Row: {
          id: string;
          task_id: string;
          case_id: string;
          user_id: string;
          source_document: string | null;
          deadline_type: 'procedural' | 'followup' | 'statutory';
          jurisdiction_rule_ref: string | null;
          citation_anchor: string | null;
          confidence_basis: string | null;
          metadata: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          task_id: string;
          case_id: string;
          user_id: string;
          source_document?: string | null;
          deadline_type?: 'procedural' | 'followup' | 'statutory';
          jurisdiction_rule_ref?: string | null;
          citation_anchor?: string | null;
          confidence_basis?: string | null;
          metadata?: any | null;
        };
        Update: {
          source_document?: string | null;
          deadline_type?: 'procedural' | 'followup' | 'statutory';
          jurisdiction_rule_ref?: string | null;
          citation_anchor?: string | null;
          confidence_basis?: string | null;
          metadata?: any | null;
        };
      };
      deadline_evidence: {
        Row: {
          id: string;
          source_id: string | null;
          task_id: string;
          case_id: string;
          user_id: string;
          evidence_type: 'document_excerpt' | 'rule_reference' | 'timeline_event' | 'manual_note';
          evidence_excerpt: string | null;
          evidence_locator: string | null;
          metadata: any | null;
          created_at: string;
        };
        Insert: {
          source_id?: string | null;
          task_id: string;
          case_id: string;
          user_id: string;
          evidence_type?: 'document_excerpt' | 'rule_reference' | 'timeline_event' | 'manual_note';
          evidence_excerpt?: string | null;
          evidence_locator?: string | null;
          metadata?: any | null;
        };
        Update: {
          source_id?: string | null;
          evidence_type?: 'document_excerpt' | 'rule_reference' | 'timeline_event' | 'manual_note';
          evidence_excerpt?: string | null;
          evidence_locator?: string | null;
          metadata?: any | null;
        };
      };
      readiness_telemetry: {
        Row: {
          id: string;
          user_id: string;
          action_id: 'memory' | 'evidence' | 'workflow' | 'deadline';
          event_name: 'resolve_click' | 'readiness_lift' | 'time_to_ready';
          score_before: number | null;
          score_after: number | null;
          complete_before: number | null;
          complete_after: number | null;
          elapsed_ms: number | null;
          metadata: any | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          action_id: 'memory' | 'evidence' | 'workflow' | 'deadline';
          event_name: 'resolve_click' | 'readiness_lift' | 'time_to_ready';
          score_before?: number | null;
          score_after?: number | null;
          complete_before?: number | null;
          complete_after?: number | null;
          elapsed_ms?: number | null;
          metadata?: any | null;
        };
        Update: {
          metadata?: any | null;
        };
      };
    };
    Functions: {
      generate_case_id: {
        Args: {};
        Returns: string;
      };
      track_usage: {
        Args: {
          p_user_id: string;
          p_case_id?: string;
          p_action_type: string;
          p_credits_used?: number;
          p_ai_provider?: string;
          p_token_count?: number;
          p_metadata?: any;
        };
        Returns: boolean;
      };
      trim_task_events: {
        Args: {
          p_keep_days?: number;
          p_keep_latest?: number;
        };
        Returns: number;
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Case = Database['public']['Tables']['cases']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type UsageLog = Database['public']['Tables']['usage_logs']['Row'];
export type CaseTask = Database['public']['Tables']['case_tasks']['Row'];
export type CaseTaskStatus = CaseTask['status'];
export type TaskPolicy = Database['public']['Tables']['task_policies']['Row'];
export type TaskEvent = Database['public']['Tables']['task_events']['Row'];
export type TaskPolicyEvent = Database['public']['Tables']['task_policy_events']['Row'];
export type TaskEventPreference = Database['public']['Tables']['task_event_preferences']['Row'];
export type DeadlineSource = Database['public']['Tables']['deadline_sources']['Row'];
export type DeadlineEvidence = Database['public']['Tables']['deadline_evidence']['Row'];
export type ReadinessTelemetry = Database['public']['Tables']['readiness_telemetry']['Row'];
export type TaskEventType = TaskEvent['event_type'];
export type TaskPolicyCaseStatus = Extract<TaskPolicy['case_status'], 'active' | 'pending'>;
export type DeadlineType = DeadlineSource['deadline_type'];
export type DeadlineEvidenceType = DeadlineEvidence['evidence_type'];
export type ReadinessTelemetryActionId = ReadinessTelemetry['action_id'];
export type ReadinessTelemetryEventName = ReadinessTelemetry['event_name'];

const DEFAULT_TASK_POLICY_INPUTS = [
  {
    caseStatus: 'active' as const,
    slaDays: 5,
    reminderWindowDays: 2,
  },
  {
    caseStatus: 'pending' as const,
    slaDays: 3,
    reminderWindowDays: 1,
  },
];

export interface CaseTaskUpsertInput {
  caseId: string;
  playbookId: string;
  dueAt: string;
  priority: number;
  status?: CaseTaskStatus;
  source?: string;
  completedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TaskPolicyUpsertInput {
  caseStatus: TaskPolicyCaseStatus;
  slaDays: number;
  reminderWindowDays: number;
  source?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface TaskEventInsertInput {
  taskId: string;
  caseId: string;
  playbookId?: string | null;
  eventType: TaskEventType;
  eventSource?: string;
  payload?: Record<string, unknown> | null;
}

export interface TaskEventQueryOptions {
  limit?: number;
  offset?: number;
  eventType?: TaskEventType | 'all';
  caseId?: string | 'all';
  playbookId?: string | 'all';
  eventSource?: string | 'all';
  windowDays?: number | 'all';
}

export interface TaskEventPageResult {
  events: TaskEvent[];
  hasMore: boolean;
  nextOffset: number;
}

export interface TaskPolicyEventInsertInput {
  caseStatus: TaskPolicyCaseStatus;
  previousSlaDays?: number | null;
  previousReminderWindowDays?: number | null;
  newSlaDays: number;
  newReminderWindowDays: number;
  eventSource?: string;
  metadata?: Record<string, unknown> | null;
}

export interface TaskEventPreferenceUpsertInput {
  autoPruneEnabled?: boolean;
  pruneIntervalHours?: number;
  keepDays?: number;
  keepLatest?: number;
  lastPrunedAt?: string | null;
}

export interface DeadlineSourceUpsertInput {
  taskId: string;
  caseId: string;
  sourceDocument?: string | null;
  deadlineType?: DeadlineType;
  jurisdictionRuleRef?: string | null;
  citationAnchor?: string | null;
  confidenceBasis?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DeadlineEvidenceInsertInput {
  taskId: string;
  caseId: string;
  sourceId?: string | null;
  evidenceType?: DeadlineEvidenceType;
  evidenceExcerpt?: string | null;
  evidenceLocator?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ReadinessTelemetryInsertInput {
  actionId: ReadinessTelemetryActionId;
  eventName: ReadinessTelemetryEventName;
  scoreBefore?: number | null;
  scoreAfter?: number | null;
  completeBefore?: number | null;
  completeAfter?: number | null;
  elapsedMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

// Helper functions for common operations
export const getCurrentUser = async () => {
  ensureConfigured();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getProfile = async (userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  if (error) throw error;
  return data;
};

export const createCase = async (title: string, description: string) => {
  ensureConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data: caseId, error: caseIdError } = await supabase
    .rpc('generate_case_id');

  if (caseIdError) throw caseIdError;

  const { data, error } = await supabase
    .from('cases')
    .insert({
      case_id: caseId,
      user_id: user.id,
      title,
      description,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getOrCreateUploadCaseId = async () => {
  ensureConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data: existingCases, error: existingError } = await supabase
    .from('cases')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingError) throw existingError;

  if (existingCases && existingCases.length > 0) {
    return existingCases[0].id;
  }

  const { data: caseId, error: caseIdError } = await supabase
    .rpc('generate_case_id');

  if (caseIdError) throw caseIdError;

  const { data: createdCase, error: createError } = await supabase
    .from('cases')
    .insert({
      case_id: caseId,
      user_id: user.id,
      title: 'Document Inbox',
      description: 'Automatically created by Kingsley for uploaded documents.',
      status: 'active',
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return createdCase.id;
};

export const getUserCases = async (userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      messages:messages(count),
      documents:documents(count)
    `)
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getCaseById = async (caseId: string) => {
  ensureConfigured();
  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      messages:messages(*),
      documents:documents(*)
    `)
    .eq('id', caseId)
    .single();

  if (error) throw error;
  return data;
};

export const deleteCase = async (caseId: string) => {
  ensureConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('id', caseId)
    .eq('user_id', user.id);

  if (error) throw error;
};

export const addMessage = async (
  caseId: string,
  content: string,
  sender: 'user' | 'assistant',
  aiProvider?: string,
  tokenCount?: number
) => {
  ensureConfigured();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      case_id: caseId,
      content,
      sender,
      ai_provider: aiProvider,
      token_count: tokenCount,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const trackUsage = async (
  actionType: string,
  caseId?: string,
  creditsUsed: number = 1,
  aiProvider?: string,
  tokenCount?: number,
  metadata?: any
) => {
  ensureConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .rpc('track_usage', {
      p_user_id: user.id,
      p_case_id: caseId,
      p_action_type: actionType,
      p_credits_used: creditsUsed,
      p_ai_provider: aiProvider,
      p_token_count: tokenCount,
      p_metadata: metadata,
    });

  if (error) throw error;
  return data;
};

// File upload helpers
export const uploadFile = async (file: File, bucket: string = 'documents', path?: string) => {
  ensureConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path || `${user.id}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return { ...data, fileName, filePath };
};

export const getFileUrl = (bucket: string = 'documents', path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

export const deleteFile = async (bucket: string = 'documents', path: string) => {
  ensureConfigured();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};

export const downloadFile = async (path: string, bucket: string = 'documents') => {
  ensureConfigured();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) throw error;
  return data;
};

export const getUserCaseTasks = async (userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('case_tasks')
    .select('*')
    .eq('user_id', uid)
    .order('priority', { ascending: false })
    .order('due_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const getUserTaskPolicies = async (userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('task_policies')
    .select('*')
    .eq('user_id', uid)
    .eq('is_active', true)
    .in('case_status', ['active', 'pending'])
    .order('case_status', { ascending: true });

  if (error) throw error;
  if ((data?.length ?? 0) > 0) {
    return data;
  }

  const fallbackPayload = DEFAULT_TASK_POLICY_INPUTS.map((policy) => ({
    user_id: uid,
    case_status: policy.caseStatus,
    source: 'system_sla',
    sla_days: policy.slaDays,
    reminder_window_days: policy.reminderWindowDays,
    is_active: true,
    metadata: { origin: 'frontend_seed' },
  }));

  const { data: seededPolicies, error: seedError } = await supabase
    .from('task_policies')
    .upsert(fallbackPayload, { onConflict: 'user_id,case_status,source' })
    .select('*');

  if (seedError) throw seedError;
  return seededPolicies;
};

export const upsertTaskPolicies = async (policies: TaskPolicyUpsertInput[], userId?: string) => {
  ensureConfigured();
  if (policies.length === 0) return [] as TaskPolicy[];

  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const payload = policies.map((policy) => ({
    user_id: uid,
    case_status: policy.caseStatus,
    source: policy.source ?? 'custom',
    sla_days: policy.slaDays,
    reminder_window_days: policy.reminderWindowDays,
    is_active: policy.isActive ?? true,
    metadata: policy.metadata ?? null,
  }));

  const { data, error } = await supabase
    .from('task_policies')
    .upsert(payload, { onConflict: 'user_id,case_status,source' })
    .select('*');

  if (error) throw error;
  return data;
};

export const getUserTaskPolicyEvents = async (limit: number = 20, userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('task_policy_events')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

export const createTaskPolicyEvents = async (events: TaskPolicyEventInsertInput[], userId?: string) => {
  ensureConfigured();
  if (events.length === 0) return [] as TaskPolicyEvent[];

  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const payload = events.map((event) => ({
    user_id: uid,
    case_status: event.caseStatus,
    event_source: event.eventSource ?? 'dashboard-policy',
    previous_sla_days: event.previousSlaDays ?? null,
    previous_reminder_window_days: event.previousReminderWindowDays ?? null,
    new_sla_days: event.newSlaDays,
    new_reminder_window_days: event.newReminderWindowDays,
    metadata: event.metadata ?? null,
  }));

  const { data, error } = await supabase
    .from('task_policy_events')
    .insert(payload)
    .select('*');

  if (error) throw error;
  return data;
};

export const getUserTaskEventsPage = async (
  options: TaskEventQueryOptions = {},
  userId?: string
): Promise<TaskEventPageResult> => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const limit = Math.max(1, Math.min(100, options.limit ?? 20));
  const offset = Math.max(0, options.offset ?? 0);

  let query = supabase
    .from('task_events')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);

  if (options.eventType && options.eventType !== 'all') {
    query = query.eq('event_type', options.eventType);
  }

  if (options.caseId && options.caseId !== 'all') {
    query = query.eq('case_id', options.caseId);
  }

  if (options.playbookId && options.playbookId !== 'all') {
    query = query.eq('playbook_id', options.playbookId);
  }

  if (options.eventSource && options.eventSource !== 'all') {
    query = query.eq('event_source', options.eventSource);
  }

  if (options.windowDays && options.windowDays !== 'all') {
    const normalizedDays = Math.max(1, Math.min(365, Number(options.windowDays)));
    const windowStart = new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', windowStart);
  }

  const { data, error } = await query;

  if (error) throw error;
  const fetchedEvents = data ?? [];
  const hasMore = fetchedEvents.length > limit;
  const events = hasMore ? fetchedEvents.slice(0, limit) : fetchedEvents;
  return {
    events,
    hasMore,
    nextOffset: offset + events.length,
  };
};

export const getUserTaskEvents = async (limit: number = 20, userId?: string) => {
  const page = await getUserTaskEventsPage({ limit }, userId);
  return page.events;
};

export const trimUserTaskEvents = async (keepDays: number = 180, keepLatest: number = 200) => {
  ensureConfigured();
  const { data, error } = await supabase.rpc('trim_task_events', {
    p_keep_days: keepDays,
    p_keep_latest: keepLatest,
  });

  if (error) throw error;
  return Number(data ?? 0);
};

export const createTaskEvents = async (events: TaskEventInsertInput[], userId?: string) => {
  ensureConfigured();
  if (events.length === 0) return [] as TaskEvent[];

  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const payload = events.map((event) => ({
    task_id: event.taskId,
    case_id: event.caseId,
    user_id: uid,
    playbook_id: event.playbookId ?? null,
    event_type: event.eventType,
    event_source: event.eventSource ?? 'dashboard',
    payload: event.payload ?? null,
  }));

  const { data, error } = await supabase
    .from('task_events')
    .insert(payload)
    .select('*');

  if (error) throw error;
  return data;
};

export const getUserDeadlineSources = async (taskIds?: string[], userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  let query = supabase
    .from('deadline_sources')
    .select('*')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false });

  if (taskIds && taskIds.length > 0) {
    query = query.in('task_id', taskIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const upsertDeadlineSources = async (sources: DeadlineSourceUpsertInput[], userId?: string) => {
  ensureConfigured();
  if (sources.length === 0) return [] as DeadlineSource[];

  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const payload = sources.map((source) => ({
    task_id: source.taskId,
    case_id: source.caseId,
    user_id: uid,
    source_document: source.sourceDocument ?? null,
    deadline_type: source.deadlineType ?? 'procedural',
    jurisdiction_rule_ref: source.jurisdictionRuleRef ?? null,
    citation_anchor: source.citationAnchor ?? null,
    confidence_basis: source.confidenceBasis ?? null,
    metadata: source.metadata ?? null,
  }));

  const { data, error } = await supabase
    .from('deadline_sources')
    .upsert(payload, { onConflict: 'task_id' })
    .select('*');

  if (error) throw error;
  return data;
};

export const getUserDeadlineEvidence = async (taskIds?: string[], userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  let query = supabase
    .from('deadline_evidence')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (taskIds && taskIds.length > 0) {
    query = query.in('task_id', taskIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createDeadlineEvidence = async (evidence: DeadlineEvidenceInsertInput[], userId?: string) => {
  ensureConfigured();
  if (evidence.length === 0) return [] as DeadlineEvidence[];

  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const payload = evidence.map((item) => ({
    source_id: item.sourceId ?? null,
    task_id: item.taskId,
    case_id: item.caseId,
    user_id: uid,
    evidence_type: item.evidenceType ?? 'document_excerpt',
    evidence_excerpt: item.evidenceExcerpt ?? null,
    evidence_locator: item.evidenceLocator ?? null,
    metadata: item.metadata ?? null,
  }));

  const { data, error } = await supabase
    .from('deadline_evidence')
    .insert(payload)
    .select('*');

  if (error) throw error;
  return data;
};

export const getUserReadinessTelemetry = async (
  limit: number = 200,
  userId?: string,
  filters?: {
    playbookId?: string | null;
    caseScope?: 'case-linked' | 'ad-hoc' | null;
  }
) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const boundedLimit = Math.max(1, Math.min(500, limit));
  let query = supabase
    .from('readiness_telemetry')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (filters?.playbookId) {
    query = query.contains('metadata', { playbookId: filters.playbookId });
  }
  if (filters?.caseScope) {
    query = query.contains('metadata', { caseScope: filters.caseScope });
  }

  const { data, error } = await query.limit(boundedLimit);

  if (error) throw error;
  return data;
};

export const createReadinessTelemetryEvents = async (
  events: ReadinessTelemetryInsertInput[],
  userId?: string
) => {
  ensureConfigured();
  if (events.length === 0) return [] as ReadinessTelemetry[];

  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const payload = events.map((event) => ({
    user_id: uid,
    action_id: event.actionId,
    event_name: event.eventName,
    score_before: event.scoreBefore ?? null,
    score_after: event.scoreAfter ?? null,
    complete_before: event.completeBefore ?? null,
    complete_after: event.completeAfter ?? null,
    elapsed_ms: event.elapsedMs ?? null,
    metadata: event.metadata ?? null,
  }));

  const { data, error } = await supabase
    .from('readiness_telemetry')
    .insert(payload)
    .select('*');

  if (error) throw error;
  return data;
};

export const upsertCaseTasks = async (tasks: CaseTaskUpsertInput[], userId?: string) => {
  ensureConfigured();
  if (tasks.length === 0) return [] as CaseTask[];

  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const payload = tasks.map((task) => ({
    case_id: task.caseId,
    user_id: uid,
    playbook_id: task.playbookId,
    source: task.source ?? 'system_sla',
    status: task.status ?? 'scheduled',
    priority: task.priority,
    due_at: task.dueAt,
    completed_at: task.completedAt ?? null,
    metadata: task.metadata ?? null,
  }));

  const { data, error } = await supabase
    .from('case_tasks')
    .upsert(payload, { onConflict: 'case_id,playbook_id,source' })
    .select('*');

  if (error) throw error;
  return data;
};

export const completeCaseTask = async (taskId: string) => {
  ensureConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('case_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const getUserStorageUsage = async (userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase.storage
    .from('documents')
    .list(uid, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) throw error;

  const totalSize = data?.reduce((acc, file) => acc + (file.metadata?.size || 0), 0) || 0;
  return { files: data?.length || 0, totalSize };
};

// Document operations
export const createDocument = async (document: {
  caseId: string;
  name: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  url?: string;
}) => {
  ensureConfigured();
  const { data, error } = await supabase
    .from('documents')
    .insert([{
      case_id: document.caseId,
      name: document.name,
      original_name: document.originalName,
      file_size: document.fileSize,
      mime_type: document.mimeType,
      storage_path: document.storagePath,
      url: document.url,
      analysis_status: 'pending'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserDocuments = async (userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      cases!inner(user_id)
    `)
    .eq('cases.user_id', uid)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getUserDocumentById = async (documentId: string, userId?: string) => {
  ensureConfigured();
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      case_id,
      name,
      original_name,
      file_size,
      mime_type,
      storage_path,
      uploaded_at,
      cases!inner(user_id)
    `)
    .eq('id', documentId)
    .eq('cases.user_id', uid)
    .single();

  if (error) throw error;
  return data;
};

export const deleteDocument = async (documentId: string) => {
  ensureConfigured();
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();

  if (fetchError) throw fetchError;

  if (document?.storage_path) {
    await deleteFile('documents', document.storage_path);
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) throw error;
};

export default supabase;
