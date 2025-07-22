import OpenAI from 'openai';
import { getGeminiProvider } from './ai-providers/gemini';
import { getGroqProvider } from './ai-providers/groq';
import { getFallbackProvider } from './ai-providers/fallback';

// Initialize OpenAI client
let openai: OpenAI;

export type AIProvider = 'gemini' | 'groq' | 'openai' | 'huggingface' | 'fallback';

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

export const initializeAI = (config: AIConfig) => {
  if (config.provider === 'openai') {
    openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true // Note: In production, API calls should be made from the backend
    });
  }
};

const generateHuggingFaceResponse = async (
  messages: AIMessage[],
  systemPrompt: string,
  apiKey: string
): Promise<AIResponse> => {
  try {
    // Using Mistral-7B-Instruct model through HuggingFace
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          inputs: `<system>${systemPrompt}</system>\n${messages.map(m => 
            `<${m.role}>${m.content}</${m.role}>`).join('\n')}`
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get response from HuggingFace');
    }

    const data = await response.json();
    return {
      message: data[0].generated_text
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      message: '',
      error: 'Failed to generate AI response. Please try again.'
    };
  }
};

export const generateAIResponse = async (
  messages: AIMessage[],
  systemPrompt: string,
  config: AIConfig
): Promise<AIResponse> => {
  console.log('🤖 generateAIResponse called with provider:', config.provider);
  
  // Handle specific provider selection (not fallback mode)
  if (config.provider !== 'fallback') {
    try {
      switch (config.provider) {
        case 'gemini': {
          const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || config.apiKey;
          console.log('🔍 Trying Gemini with key:', geminiKey ? 'Present' : 'Missing');
          if (geminiKey) {
            const geminiProvider = getGeminiProvider(geminiKey);
            return await geminiProvider.generateResponse(messages, systemPrompt);
          } else {
            throw new Error('Gemini API key not configured');
          }
        }
        
        case 'groq': {
          const groqKey = import.meta.env.VITE_GROQ_API_KEY || config.apiKey;
          console.log('🔍 Trying Groq with key:', groqKey ? 'Present' : 'Missing');
          if (groqKey) {
            const groqProvider = getGroqProvider(groqKey);
            return await groqProvider.generateResponse(messages, systemPrompt);
          } else {
            throw new Error('Groq API key not configured');
          }
        }
        
        case 'openai': {
          if (!openai && config.apiKey) {
            initializeAI(config);
          }
          if (openai) {
            console.log('🔍 Trying OpenAI');
            const completion = await openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages
              ],
              temperature: 0.7,
              max_tokens: 2000,
            });
            return {
              message: completion.choices[0]?.message?.content || ''
            };
          } else {
            throw new Error('OpenAI not configured');
          }
        }
        
        case 'huggingface': {
          console.log('🔍 Trying HuggingFace');
          if (config.apiKey) {
            return generateHuggingFaceResponse(messages, systemPrompt, config.apiKey);
          } else {
            throw new Error('HuggingFace API key not configured');
          }
        }
        
        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }
    } catch (error) {
      console.error(`❌ ${config.provider} failed:`, error);
      return {
        message: '',
        error: `${config.provider} error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Fallback mode: try providers in order until one works
  console.log('🔄 Fallback mode: trying providers in order...');
  
  // 1. Try Gemini first (completely free)
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log('🔍 Fallback trying Gemini...');
      const geminiProvider = getGeminiProvider(geminiKey);
      return await geminiProvider.generateResponse(messages, systemPrompt);
    } catch (error) {
      console.log('❌ Fallback Gemini failed:', error);
    }
  }

  // 2. Try Groq (free but requires API key)
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (groqKey) {
    try {
      console.log('🔍 Fallback trying Groq...');
      const groqProvider = getGroqProvider(groqKey);
      return await groqProvider.generateResponse(messages, systemPrompt);
    } catch (error) {
      console.log('❌ Fallback Groq failed:', error);
    }
  }

  // 3. Try OpenAI if configured
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (openaiKey && openai) {
    try {
      console.log('🔍 Fallback trying OpenAI...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      return {
        message: completion.choices[0]?.message?.content || ''
      };
    } catch (error) {
      console.log('❌ Fallback OpenAI failed:', error);
    }
  }

  // 4. Try HuggingFace if configured
  const hfKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
  if (hfKey) {
    try {
      console.log('🔍 Fallback trying HuggingFace...');
      return generateHuggingFaceResponse(messages, systemPrompt, hfKey);
    } catch (error) {
      console.log('❌ Fallback HuggingFace failed:', error);
    }
  }

  // 5. Final fallback: demo responses
  console.log('🎭 Using demo provider (all real providers failed or not configured)');
  const fallbackProvider = getFallbackProvider();
  return await fallbackProvider.generateResponse(messages, systemPrompt);
};

export const analyzeCaseDocuments = async (
  documents: string[],
  systemPrompt: string,
  config: AIConfig
): Promise<AIResponse> => {
  // Try providers in order of preference: Gemini -> Groq -> OpenAI -> HuggingFace -> Fallback
  
  // 1. Try Gemini first (completely free)
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiProvider = getGeminiProvider(geminiKey);
      return await geminiProvider.analyzeDocuments(documents, systemPrompt);
    } catch (error) {
      console.log('Gemini document analysis failed, trying next provider...', error);
    }
  }

  // 2. Try Groq (free but requires API key)
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (groqKey) {
    try {
      const groqProvider = getGroqProvider(groqKey);
      return await groqProvider.analyzeDocuments(documents, systemPrompt);
    } catch (error) {
      console.log('Groq document analysis failed, trying next provider...', error);
    }
  }

  // 3. Try HuggingFace
  if (config.provider === 'huggingface') {
    return generateHuggingFaceResponse([{
      role: 'user',
      content: `Please analyze the following documents and provide a summary:\n\n${documents.join('\n\n')}`
    }], systemPrompt, config.apiKey);
  }

  // 4. Try OpenAI implementation
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Please analyze the following documents and provide a summary:\n\n${documents.join('\n\n')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      return {
        message: completion.choices[0]?.message?.content || ''
      };
    } catch (error) {
      console.error('OpenAI document analysis error:', error);
      // Continue to fallback
    }
  }

  // 5. Use fallback demo provider
  console.log('Using fallback AI provider for document analysis');
  const fallbackProvider = getFallbackProvider();
  return await fallbackProvider.analyzeDocuments(documents, systemPrompt);
};

interface AIServiceConfig {
  provider: AIProvider;
  openaiApiKey?: string;
  huggingfaceApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
}

class AIService {
  private config: AIServiceConfig = {
    provider: 'gemini', // Default to free Gemini
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    huggingfaceApiKey: import.meta.env.VITE_HUGGINGFACE_API_KEY,
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
    groqApiKey: import.meta.env.VITE_GROQ_API_KEY,
  };

  setProvider(provider: AIProvider) {
    this.config.provider = provider;
  }

  async chat(messages: any[]) {
    // Use the new generateAIResponse function with fallback logic
    return await generateAIResponse(
      messages,
      "You are a helpful Belgian legal AI assistant.",
      {
        provider: this.config.provider,
        apiKey: this.getApiKeyForProvider(this.config.provider)
      }
    );
  }

  private getApiKeyForProvider(provider: AIProvider): string {
    switch (provider) {
      case 'gemini':
        return this.config.geminiApiKey || '';
      case 'groq':
        return this.config.groqApiKey || '';
      case 'openai':
        return this.config.openaiApiKey || '';
      case 'huggingface':
        return this.config.huggingfaceApiKey || '';
      default:
        return '';
    }
  }

  private async chatWithOpenAI(messages: any[]) {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async chatWithHuggingFace(messages: any[]) {
    if (!this.config.huggingfaceApiKey) {
      throw new Error('HuggingFace API key not configured');
    }

    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.huggingfaceApiKey}`,
      },
      body: JSON.stringify({
        inputs: messages.map(m => m.content).join('\n'),
        parameters: {
          temperature: 0.7,
          max_new_tokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('HuggingFace API request failed');
    }

    const data = await response.json();
    return data[0].generated_text;
  }
}

export const aiService = new AIService(); 