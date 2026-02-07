import { isSupabaseConfigured, supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to get auth token
const getAuthToken = async (): Promise<string | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
};

// Helper for authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('User not authenticated');
  }

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

// AI API calls - proxied through backend (uses built-in demo keys + local fallback)
export const aiApi = {
  async chat(messages: any[], caseId?: string, provider?: string, isGuestUser?: boolean) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-Guest'] = 'true';
    }

    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, caseId, provider }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API call failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      message: data.message,
      provider: data.provider,
      tokenCount: data.tokenCount,
      creditsUsed: data.creditsUsed,
      guestQueriesRemaining: isGuestUser ? Infinity : undefined,
    };
  },

  async analyzeDocuments(documents: string[], caseId?: string, provider?: string, isGuestUser?: boolean) {
    return this.chat(
      [{ role: 'user', content: `Veuillez analyser les documents suivants et fournir un résumé en cinq points : ${documents.join('\n\n')}` }],
      caseId,
      provider,
      isGuestUser
    );
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
