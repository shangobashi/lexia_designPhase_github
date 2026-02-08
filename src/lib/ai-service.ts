import { getGeminiProvider } from './ai-providers/gemini';
import { getMistralProvider } from './ai-providers/mistral';
import { getOpenRouterProvider } from './ai-providers/openrouter';

export type KingsleyMode = 'fast' | 'thinking';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  message: string;
  error?: string;
}

/**
 * Orchestrates AI provider chains based on mode.
 *
 * Fast mode:     Gemini 3 Flash Preview → Mistral Small → OpenRouter (Mistral 3.1 → GPT OSS 20B → Step 3.5 Flash) → error
 * Thinking mode: OpenRouter (GLM 4.7 → Kimi K2.5 → GPT OSS 120B) → Gemini → Mistral → error
 */
export const generateStreamingChat = async (
  messages: AIMessage[],
  systemPrompt: string,
  mode: KingsleyMode,
  onChunk: (text: string) => void
): Promise<AIResponse> => {
  const errors: string[] = [];

  if (mode === 'fast') {
    // Fast chain: Gemini → Mistral → OpenRouter (Dolphin, GPT OSS, DeepSeek)
    try {
      const gemini = getGeminiProvider();
      const result = await gemini.generateStreamingResponse(messages, systemPrompt, onChunk);
      if (result.message) return result;
    } catch (error: any) {
      console.warn('[Kingsley] Gemini failed:', error.message);
      errors.push(`Gemini: ${error.message}`);
      onChunk('');
    }

    try {
      const mistral = getMistralProvider();
      const result = await mistral.generateStreamingResponse(messages, systemPrompt, onChunk);
      if (result.message) return result;
    } catch (error: any) {
      console.warn('[Kingsley] Mistral failed:', error.message);
      errors.push(`Mistral: ${error.message}`);
      onChunk('');
    }

    try {
      const orProvider = getOpenRouterProvider();
      orProvider.setMode('fast');
      const result = await orProvider.generateStreamingResponse(messages, systemPrompt, onChunk);
      if (result.message) return result;
    } catch (error: any) {
      console.warn('[Kingsley] OpenRouter fast fallback failed:', error.message);
      errors.push(`OpenRouter: ${error.message}`);
      onChunk('');
    }
  } else {
    // Thinking chain: OpenRouter → Gemini → Mistral
    try {
      const orProvider = getOpenRouterProvider();
      orProvider.setMode('thinking');
      const result = await orProvider.generateStreamingResponse(messages, systemPrompt, onChunk);
      if (result.message) return result;
    } catch (error: any) {
      console.warn('[Kingsley] OpenRouter thinking failed:', error.message);
      errors.push(`OpenRouter: ${error.message}`);
      onChunk('');
    }

    // Fallback to Gemini if OpenRouter unavailable
    try {
      const gemini = getGeminiProvider();
      const result = await gemini.generateStreamingResponse(messages, systemPrompt, onChunk);
      if (result.message) return result;
    } catch (error: any) {
      console.warn('[Kingsley] Gemini thinking fallback failed:', error.message);
      errors.push(`Gemini: ${error.message}`);
      onChunk('');
    }

    // Fallback to Mistral
    try {
      const mistral = getMistralProvider();
      const result = await mistral.generateStreamingResponse(messages, systemPrompt, onChunk);
      if (result.message) return result;
    } catch (error: any) {
      console.warn('[Kingsley] Mistral thinking fallback failed:', error.message);
      errors.push(`Mistral: ${error.message}`);
      onChunk('');
    }
  }

  // All providers exhausted — return error for chat display
  const errorDetail = errors.join(' | ');
  console.error(`[Kingsley] All ${mode} providers failed:`, errorDetail);

  return {
    message: '',
    error: `All ${mode} mode providers are currently unavailable. ${errorDetail}`,
  };
};

/**
 * Non-streaming version for document analysis and other non-chat uses.
 */
export const generateAIResponse = async (
  messages: AIMessage[],
  systemPrompt: string
): Promise<AIResponse> => {
  try {
    const gemini = getGeminiProvider();
    return await gemini.generateResponse(messages, systemPrompt);
  } catch {
    // continue
  }

  try {
    const mistral = getMistralProvider();
    return await mistral.generateResponse(messages, systemPrompt);
  } catch {
    // continue
  }

  return { message: '', error: 'All AI providers are currently unavailable.' };
};
