import { AIMessage, AIResponse } from '../ai-service';

const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';

export class MistralProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_MISTRAL_API_KEY || '';
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (text: string) => void
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Mistral API key not configured.');
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(MISTRAL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          messages: formattedMessages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Mistral ${response.status}: ${JSON.stringify(err)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Mistral: no readable stream');

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
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              receivedAny = true;
              fullText += delta;
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

      throw new Error('Mistral: empty response');
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Mistral: request timed out');
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

let instance: MistralProvider | null = null;

export const getMistralProvider = (apiKey?: string): MistralProvider => {
  const key = apiKey || import.meta.env.VITE_MISTRAL_API_KEY || '';
  if (!instance || apiKey) {
    instance = new MistralProvider(key);
  }
  return instance;
};
