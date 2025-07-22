-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE case_status AS ENUM ('active', 'pending', 'closed');
CREATE TYPE message_sender AS ENUM ('user', 'assistant');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_status subscription_status DEFAULT 'trialing',
    subscription_plan subscription_plan DEFAULT 'free',
    stripe_customer_id TEXT UNIQUE,
    paypal_customer_id TEXT UNIQUE,
    credits_remaining INTEGER DEFAULT 100,
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '14 days',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cases table
CREATE TABLE public.cases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_id TEXT UNIQUE NOT NULL, -- Human-readable case ID like "LEX-2025-001"
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status case_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender message_sender NOT NULL,
    ai_provider TEXT, -- 'gemini', 'groq', 'openai', etc.
    token_count INTEGER, -- For usage tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path
    url TEXT, -- Public URL if applicable
    analysis_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    analysis_result JSONB, -- AI analysis results
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File attachments for messages
CREATE TABLE public.message_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    paypal_subscription_id TEXT UNIQUE,
    plan subscription_plan NOT NULL,
    status subscription_status NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE public.usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'ai_query', 'document_upload', 'document_analysis'
    ai_provider TEXT, -- For AI queries
    token_count INTEGER, -- For AI usage
    credits_used INTEGER DEFAULT 1,
    metadata JSONB, -- Additional tracking data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_created_at ON public.cases(created_at DESC);

CREATE INDEX idx_messages_case_id ON public.messages(case_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX idx_documents_case_id ON public.documents(case_id);
CREATE INDEX idx_documents_analysis_status ON public.documents(analysis_status);

CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Cases policies
CREATE POLICY "Users can view own cases" ON public.cases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cases" ON public.cases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases" ON public.cases
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases" ON public.cases
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages for own cases" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = messages.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages for own cases" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = messages.case_id 
            AND cases.user_id = auth.uid()
        )
    );

-- Documents policies
CREATE POLICY "Users can view documents for own cases" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create documents for own cases" ON public.documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update documents for own cases" ON public.documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete documents for own cases" ON public.documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    );

-- Message attachments policies
CREATE POLICY "Users can view attachments for own messages" ON public.message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.messages 
            JOIN public.cases ON cases.id = messages.case_id
            WHERE messages.id = message_attachments.message_id 
            AND cases.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create attachments for own messages" ON public.message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages 
            JOIN public.cases ON cases.id = messages.case_id
            WHERE messages.id = message_attachments.message_id 
            AND cases.user_id = auth.uid()
        )
    );

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Usage logs policies
CREATE POLICY "Users can view own usage logs" ON public.usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamps
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at 
    BEFORE UPDATE ON public.cases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON public.subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate human-readable case IDs
CREATE OR REPLACE FUNCTION generate_case_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    year_part TEXT;
    sequence_part INTEGER;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(case_id, '-', 3) AS INTEGER)
    ), 0) + 1
    INTO sequence_part
    FROM public.cases
    WHERE case_id LIKE 'LEX-' || year_part || '-%';
    
    new_id := 'LEX-' || year_part || '-' || LPAD(sequence_part::TEXT, 3, '0');
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to track usage and deduct credits
CREATE OR REPLACE FUNCTION public.track_usage(
    p_user_id UUID,
    p_case_id UUID,
    p_action_type TEXT,
    p_credits_used INTEGER DEFAULT 1,
    p_ai_provider TEXT DEFAULT NULL,
    p_token_count INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Check current credits
    SELECT credits_remaining INTO current_credits
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Check if user has enough credits
    IF current_credits < p_credits_used THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct credits
    UPDATE public.profiles
    SET credits_remaining = credits_remaining - p_credits_used
    WHERE id = p_user_id;
    
    -- Log usage
    INSERT INTO public.usage_logs (
        user_id, case_id, action_type, ai_provider, 
        token_count, credits_used, metadata
    ) VALUES (
        p_user_id, p_case_id, p_action_type, p_ai_provider,
        p_token_count, p_credits_used, p_metadata
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );