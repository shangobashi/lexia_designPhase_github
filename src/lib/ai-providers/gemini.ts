import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIMessage, AIResponse } from '../ai-service';

export class GeminiProvider {
  private apiKey: string;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateResponse(
    messages: AIMessage[],
    systemPrompt: string
  ): Promise<AIResponse> {
    if (!this.genAI || !this.apiKey) {
      throw new Error('Google Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.');
    }

    try {
      // Get the Gemini Pro model
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      // Build conversation history for context
      const conversationHistory = messages.map(msg => {
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      }).join('\n\n');

      // Combine system prompt with conversation
      const prompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\n\nPlease respond as a Belgian legal AI assistant:`;

      console.log('🔍 Sending to Gemini:', { prompt: prompt.substring(0, 200) + '...' });

      // Generate response
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('✅ Gemini response received:', text.substring(0, 100) + '...');

      return {
        message: text
      };
    } catch (error: any) {
      console.error('❌ Gemini AI Error:', error);
      
      // Handle specific error types and rethrow to continue to next provider
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Google Gemini API key. Please check your VITE_GEMINI_API_KEY environment variable.');
      }
      
      if (error.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      }

      // For other errors, rethrow to allow fallback
      throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`);
    }
  }

  async analyzeDocuments(
    documents: string[],
    systemPrompt: string
  ): Promise<AIResponse> {
    const analysisPrompt = `Please analyze the following documents and provide a summary:\n\n${documents.join('\n\n')}`;
    
    return this.generateResponse([{
      role: 'user',
      content: analysisPrompt
    }], systemPrompt);
  }
}

// Create a singleton instance
let geminiInstance: GeminiProvider | null = null;

export const getGeminiProvider = (apiKey?: string): GeminiProvider => {
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  
  if (!geminiInstance || (apiKey && geminiInstance)) {
    geminiInstance = new GeminiProvider(key);
  }
  
  return geminiInstance;
};
