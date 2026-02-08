import { AIMessage, AIResponse } from '../ai-service';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-3-flash-preview';

export class GeminiProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  private toGeminiMessages(messages: AIMessage[]) {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (text: string) => void
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured.');
    }

    const geminiMessages = this.toGeminiMessages(messages);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(
        `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 4096,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Gemini ${response.status}: ${JSON.stringify(err)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Gemini: no readable stream');

      const decoder = new TextDecoder();
      let fullText = '';
      let receivedAny = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              receivedAny = true;
              fullText += text;
              onChunk(fullText);
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      if (receivedAny && fullText) {
        return { message: fullText };
      }

      throw new Error('Gemini: empty response');
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Gemini: request timed out');
      }
      throw error;
    }
  }

  async generateResponse(
    messages: AIMessage[],
    systemPrompt: string
  ): Promise<AIResponse> {
    let result = '';
    return this.generateStreamingResponse(messages, systemPrompt, (text) => {
      result = text;
    });
  }

  async analyzeDocuments(
    documents: string[],
    systemPrompt: string
  ): Promise<AIResponse> {
    return this.generateResponse(
      [{ role: 'user', content: `Please analyze the following documents and provide a summary:\n\n${documents.join('\n\n')}` }],
      systemPrompt
    );
  }
}

let instance: GeminiProvider | null = null;

export const getGeminiProvider = (apiKey?: string): GeminiProvider => {
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!instance || apiKey) {
    instance = new GeminiProvider(key);
  }
  return instance;
};
