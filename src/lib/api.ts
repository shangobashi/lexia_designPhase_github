import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to get auth token
const getAuthToken = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('User not authenticated');
  }
  return session.access_token;
};

// Helper for authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API call failed: ${response.status}`);
  }

  return response.json();
};

import { aiClient } from './ai-client';
import { useGuestQuery, getGuestQueriesRemaining } from './guest-session';

// AI API calls - now using direct client connections
export const aiApi = {
  async chat(messages: any[], caseId?: string, provider?: string, isGuestUser?: boolean) {
    try {
      // Check guest query limits
      if (isGuestUser) {
        const queryResult = useGuestQuery();
        if (!queryResult.success) {
          throw new Error(`Limite de questions gratuites atteinte! Vous avez utilisé vos 10 questions gratuites. Inscrivez-vous pour continuer à utiliser LexiA.`);
        }
      }

      // Convert message format
      const chatMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      const response = await aiClient.chat(chatMessages, provider as 'gemini' | 'groq' | 'huggingface' | 'mistral' | 'fallback');
      
      // Add remaining queries info for guest users
      if (isGuestUser) {
        const remaining = getGuestQueriesRemaining();
        response.guestQueriesRemaining = remaining;
      }
      
      return response;
    } catch (error) {
      console.error('AI chat error:', error);
      throw error;
    }
  },

  async analyzeDocuments(documents: string[], caseId?: string, provider?: string) {
    try {
      const analysisPrompt = `Veuillez analyser les documents suivants dans le contexte juridique français:\n\n${documents.join('\n\n')}`;
      
      const response = await aiClient.chat([
        { role: 'user', content: analysisPrompt }
      ], provider as 'gemini' | 'groq');
      
      return {
        analysis: response.message,
        provider: response.provider,
        tokenCount: response.tokenCount
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      throw error;
    }
  },
};

// Cases API
export const casesApi = {
  async getAll() {
    return apiCall('/api/cases');
  },

  async getById(id: string) {
    return apiCall(`/api/cases/${id}`);
  },

  async create(title: string, description: string) {
    return apiCall('/api/cases', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  },

  async update(id: string, data: { title?: string; description?: string; status?: string }) {
    return apiCall(`/api/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return apiCall(`/api/cases/${id}`, {
      method: 'DELETE',
    });
  },
};

// Messages API
export const messagesApi = {
  async create(caseId: string, content: string, sender: 'user' | 'assistant', aiProvider?: string, tokenCount?: number) {
    return apiCall(`/api/cases/${caseId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, sender, aiProvider, tokenCount }),
    });
  },
};

// Profile API
export const profileApi = {
  async get() {
    return apiCall('/api/profile');
  },

  async update(data: any) {
    return apiCall('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Health check
export const healthApi = {
  async check() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  },
};

// Error types
export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}