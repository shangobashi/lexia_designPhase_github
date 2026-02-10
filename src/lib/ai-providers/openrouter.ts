import { AIMessage, AIResponse } from '../ai-service';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type KingsleyMode = 'fast' | 'thinking';

const MODE_MODELS: Record<KingsleyMode, string[]> = {
  fast: [
    'stepfun/step-3.5-flash:free',
    'openai/gpt-oss-20b:free',
  ],
  thinking: [
    'z-ai/glm-4.7',
    'z-ai/glm-4.5-air:free',
    'moonshotai/kimi-k2.5',
    'openai/gpt-oss-120b:free',
  ],
};

export class OpenRouterProvider {
  private apiKey: string;
  private mode: KingsleyMode = 'fast';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  setMode(mode: KingsleyMode) {
    this.mode = mode;
  }

  getMode(): KingsleyMode {
    return this.mode;
  }

  private getModels(): string[] {
    return MODE_MODELS[this.mode];
  }

  async generateResponse(
    messages: AIMessage[],
    systemPrompt: string
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured.');
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    for (const model of this.getModels()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(OPENROUTER_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Kingsley Legal AI',
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            temperature: 0.5,
            max_tokens: 4000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.warn(`OpenRouter ${model} failed (${response.status}):`, err?.error?.message || err);
          continue;
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (text) {
          return { message: text };
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`OpenRouter ${model} timed out`);
        } else {
          console.warn(`OpenRouter ${model} error:`, error);
        }
      }
    }

    throw new Error('All OpenRouter models failed or timed out');
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (text: string) => void
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured.');
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    for (const model of this.getModels()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(OPENROUTER_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Kingsley Legal AI',
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            temperature: 0.5,
            max_tokens: 4000,
            stream: true,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.warn(`OpenRouter ${model} stream failed (${response.status}):`, err?.error?.message || err);
          continue;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          console.warn(`OpenRouter ${model}: no readable stream`);
          continue;
        }

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
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`OpenRouter ${model} stream timed out`);
        } else {
          console.warn(`OpenRouter ${model} stream error:`, error);
        }
      }
    }

    throw new Error('All OpenRouter models failed or timed out');
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

let instance: OpenRouterProvider | null = null;

export const getOpenRouterProvider = (apiKey?: string): OpenRouterProvider => {
  const key = apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || '';
  if (!instance || apiKey) {
    instance = new OpenRouterProvider(key);
  }
  return instance;
};
