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
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Case = Database['public']['Tables']['cases']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type UsageLog = Database['public']['Tables']['usage_logs']['Row'];

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
