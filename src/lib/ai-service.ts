import { getOpenRouterProvider } from './ai-providers/openrouter';
import { getFallbackProvider } from './ai-providers/fallback';

export type AIProvider = 'openrouter' | 'fallback';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  message: string;
  error?: string;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

export const generateAIResponse = async (
  messages: AIMessage[],
  systemPrompt: string,
  config: AIConfig
): Promise<AIResponse> => {
  // Always use OpenRouter (Kingsley's engine)
  const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || config.apiKey;

  if (openrouterKey) {
    try {
      const orProvider = getOpenRouterProvider(openrouterKey);
      return await orProvider.generateResponse(messages, systemPrompt);
    } catch (error) {
      console.error('Kingsley AI error:', error);
    }
  }

  // Final fallback: demo responses
  const fallbackProvider = getFallbackProvider();
  return await fallbackProvider.generateResponse(messages, systemPrompt);
};

export const analyzeCaseDocuments = async (
  documents: string[],
  systemPrompt: string,
  _config: AIConfig
): Promise<AIResponse> => {
  const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (openrouterKey) {
    try {
      const orProvider = getOpenRouterProvider(openrouterKey);
      return await orProvider.analyzeDocuments(documents, systemPrompt);
    } catch (error) {
      console.error('Kingsley document analysis error:', error);
    }
  }

  const fallbackProvider = getFallbackProvider();
  return await fallbackProvider.analyzeDocuments(documents, systemPrompt);
};

class AIService {
  private provider: AIProvider = 'openrouter';

  setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  async chat(messages: any[]) {
    return await generateAIResponse(
      messages,
      "You are Kingsley, a helpful Belgian legal AI assistant.",
      { provider: this.provider, apiKey: '' }
    );
  }
}

export const aiService = new AIService();
