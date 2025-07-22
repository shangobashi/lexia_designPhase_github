import { AIMessage, AIResponse } from '../ai-service';

export class GroqProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    messages: AIMessage[],
    systemPrompt: string
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured. Please add VITE_GROQ_API_KEY to your environment variables.');
    }

    try {
      console.log('🔍 Sending to Groq:', { messageCount: messages.length });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Fast and free model
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 2000,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      console.log('✅ Groq response received:', content.substring(0, 100) + '...');

      return {
        message: content
      };
    } catch (error: any) {
      console.error('❌ Groq AI Error:', error);
      
      // Rethrow to allow fallback to next provider
      throw new Error(`Groq API error: ${error.message || 'Unknown error'}`);
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
let groqInstance: GroqProvider | null = null;

export const getGroqProvider = (apiKey?: string): GroqProvider => {
  const key = apiKey || import.meta.env.VITE_GROQ_API_KEY || '';
  
  if (!groqInstance || (apiKey && groqInstance)) {
    groqInstance = new GroqProvider(key);
  }
  
  return groqInstance;
};
