import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// We also ship a no-key local fallback using @xenova/transformers so that
// users can chat even without third-party API credentials.
let localPipelinePromise = null;

// Hardcoded demo keys (may be overridden by environment variables).
// These are intentionally non-secret free-tier placeholders; for production,
// replace with real credentials in the environment.
const DEFAULT_KEYS = {
  gemini: process.env.GEMINI_API_KEY || process.env.DEMO_GEMINI_KEY || '',
  groq: process.env.GROQ_API_KEY || '',
  openai: process.env.OPENAI_API_KEY || process.env.DEMO_OPENAI_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || process.env.DEMO_ANTHROPIC_KEY || ''
};

// Lazily constructed SDK clients to avoid work when the provider is unused.
let geminiClient = null;
let openaiClient = null;
let anthropicClient = null;

const ensureGemini = () => {
  if (!DEFAULT_KEYS.gemini) return null;
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(DEFAULT_KEYS.gemini);
  return geminiClient;
};

const ensureOpenAI = () => {
  if (!DEFAULT_KEYS.openai) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: DEFAULT_KEYS.openai });
  return openaiClient;
};

const ensureAnthropic = () => {
  if (!DEFAULT_KEYS.anthropic) return null;
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: DEFAULT_KEYS.anthropic });
  return anthropicClient;
};

// Simple token estimate: rough 4 chars per token heuristic
const estimateTokens = (text = '') => Math.max(1, Math.ceil(text.length / 4));

const formatMessages = (messages = []) =>
  messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

// --- Provider call helpers -------------------------------------------------

const callGroq = async (messages, systemPrompt) => {
  if (!DEFAULT_KEYS.groq) throw new Error('Groq key missing');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEFAULT_KEYS.groq}`
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [{ role: 'system', content: systemPrompt }, ...formatMessages(messages)],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text: text.trim(), provider: 'groq-llama3' };
};

const callGemini3 = async (messages, systemPrompt) => {
  const client = ensureGemini();
  if (!client) throw new Error('Gemini key missing');

  // Gemini 1.5 Pro – use latest stable model name
  const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });
  const userText = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  const prompt = `${systemPrompt}\n\nConversation so far:\n${userText}\n\nAssistant:`;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  });

  const text = response.response?.text?.() || response.response?.text || response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text: text.trim(), provider: 'gemini-1.5-pro' };
};

const callOpenAI = async (messages, systemPrompt) => {
  const client = ensureOpenAI();
  if (!client) throw new Error('OpenAI key missing');

  const completion = await client.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'system', content: systemPrompt }, ...formatMessages(messages)],
    temperature: 0.7,
    max_tokens: 2048
  });

  const text = completion.choices?.[0]?.message?.content || '';
  return { text: text.trim(), provider: 'openai-gpt-4-turbo' };
};

const callAnthropic = async (messages, systemPrompt) => {
  const client = ensureAnthropic();
  if (!client) throw new Error('Anthropic key missing');

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101', // latest Claude Opus family
    system: systemPrompt,
    max_tokens: 2048,
    temperature: 0.7,
    messages: formatMessages(messages)
  });

  const text = response.content?.[0]?.text || '';
  return { text: text.trim(), provider: 'claude-opus-4.5' };
};

const callLocalTransformers = async (messages, systemPrompt) => {
  if (!localPipelinePromise) {
    // Lazily import to avoid adding startup cost when cloud providers succeed
    localPipelinePromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('text-generation', 'Xenova/LaMini-Flan-T5-248M');
    })();
  }

  const pipelineInstance = await localPipelinePromise;
  const lastUser = messages.filter(m => m.role === 'user').pop();
  const prompt = `${systemPrompt}\n\nUser: ${lastUser?.content || ''}\nAssistant:`;
  const output = await pipelineInstance(prompt, { max_new_tokens: 180, temperature: 0.8 });
  const generated = Array.isArray(output) ? output[0]?.generated_text : output?.generated_text;
  const text = (generated || '').split('Assistant:').pop()?.trim() || generated || '';
  return { text: text.trim(), provider: 'local-transformers' };
};

// Deterministic, no-key demo provider to guarantee a response
const callDemo = async (messages, systemPrompt) => {
  const last = messages.filter(m => m.role === 'user').pop();
  const question = last?.content || 'Question juridique';
  const text = `**Role Identified**: As Legal Advisor, I will help immediately.\n\n` +
    `**Legal Issue**: ${question.slice(0, 240)}\n\n` +
    `**Applicable Law**: Principes généraux du droit belge.\n` +
    `**Analysis**: Mode démo sans clé API. Cette réponse est fournie par le backend local.\n` +
    `**Advice**: Reformulez si besoin et basculez vers un fournisseur cloud pour des analyses longues.`;
  return { text, provider: 'demo', tokens: estimateTokens(text), billed: 0 };
};

// --- Orchestrator ----------------------------------------------------------

export const chatWithAI = async ({ messages, systemPrompt, preferredProvider }) => {
  const providersInOrder = [
    preferredProvider === 'gemini' ? callGemini3 : null,
    preferredProvider === 'groq' ? callGroq : null,
    preferredProvider === 'openai' ? callOpenAI : null,
    preferredProvider === 'anthropic' ? callAnthropic : null,
    preferredProvider === 'demo' ? callDemo : null,
    preferredProvider === 'local' ? callLocalTransformers : null,
    // Auto-select order when no preference (free first, then paid, then demo/local)
    preferredProvider ? null : callGemini3,
    preferredProvider ? null : callGroq,
    preferredProvider ? null : callOpenAI,
    preferredProvider ? null : callAnthropic,
    preferredProvider ? null : callDemo,
    callLocalTransformers
  ].filter(Boolean);

  let lastError = null;
  for (const fn of providersInOrder) {
    try {
      const { text, provider, tokens = estimateTokens(text), billed = provider === 'local-transformers' || provider === 'demo' ? 0 : 1 } =
        await fn(messages, systemPrompt);
      return { text, provider, tokens, billed };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All AI providers failed');
};

export const providerHealth = () => ({
  gemini: !!DEFAULT_KEYS.gemini,
  groq: !!DEFAULT_KEYS.groq,
  openai: !!DEFAULT_KEYS.openai,
  anthropic: !!DEFAULT_KEYS.anthropic,
  local: true,
  demo: true
});

export const analyzeDocuments = async ({ documents, systemPrompt, preferredProvider }) => {
  const combined = documents.map((doc, idx) => `Document ${idx + 1}:\n${doc}`).join('\n\n');
  const messages = [{
    role: 'user',
    content: `Analyse les documents suivants et résume en 5 puces concises avec risques et actions recommandées.\n\n${combined}`
  }];
  return chatWithAI({ messages, systemPrompt, preferredProvider });
};

