const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_TEXT_LENGTH = 5000;

const VOICE_CONFIG = {
  en: {
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    languageCode: 'en',
    modelId: 'eleven_flash_v2_5',
  },
  fr: {
    voiceId: 'nbiTBaMRdSobTQJDzIWm',
    languageCode: 'fr',
    modelId: 'eleven_multilingual_v2',
  },
};

function normalizeLanguage(language) {
  return language === 'fr' ? 'fr' : 'en';
}

function toSpeakableText(text) {
  const truncatedText = text.length > MAX_TEXT_LENGTH
    ? `${text.slice(0, MAX_TEXT_LENGTH - 3)}...`
    : text;

  return truncatedText
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  const { text, language = 'en' } = parseBody(req.body);
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const cleanText = toSpeakableText(text);
  if (!cleanText) {
    return res.status(400).json({ error: 'No speakable text after cleanup' });
  }

  const languageCode = normalizeLanguage(language);
  const voiceConfig = VOICE_CONFIG[languageCode];

  try {
    const elevenLabsResponse = await fetch(
      `${ELEVENLABS_API_URL}/${voiceConfig.voiceId}/stream?optimize_streaming_latency=2&output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: voiceConfig.modelId,
          language_code: voiceConfig.languageCode,
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.78,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      console.error('[Voice API] ElevenLabs error:', elevenLabsResponse.status, errorBody);
      return res.status(elevenLabsResponse.status).json({
        error: `ElevenLabs API error: ${elevenLabsResponse.status}`,
      });
    }

    const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error('[Voice API] Generation failed:', error);
    return res.status(500).json({ error: 'Voice generation failed' });
  }
}
