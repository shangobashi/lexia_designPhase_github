const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_TEXT_LENGTH = 5000;
const DEFAULT_EN_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';
const DEFAULT_FR_FREE_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George (premade, warm)

function normalizeLanguage(language) {
  return language === 'fr' ? 'fr' : 'en';
}

function buildVoiceAttempts(languageCode) {
  if (languageCode === 'fr') {
    const attempts = [
      {
        id: process.env.ELEVENLABS_FRENCH_VOICE_ID || DEFAULT_FR_FREE_VOICE_ID,
        modelId: 'eleven_multilingual_v2',
        languageCode: 'fr',
        label: 'fr-primary',
      },
      {
        id: process.env.ELEVENLABS_FRENCH_FALLBACK_VOICE_ID || DEFAULT_EN_VOICE_ID,
        modelId: 'eleven_multilingual_v2',
        languageCode: 'fr',
        label: 'fr-fallback',
      },
      {
        id: DEFAULT_EN_VOICE_ID,
        modelId: 'eleven_flash_v2_5',
        languageCode: 'fr',
        label: 'fr-last-resort',
      },
    ];

    const unique = new Set();
    return attempts.filter((attempt) => {
      const key = `${attempt.id}|${attempt.modelId}|${attempt.languageCode}`;
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    });
  }

  return [
    {
      id: process.env.ELEVENLABS_ENGLISH_VOICE_ID || DEFAULT_EN_VOICE_ID,
      modelId: 'eleven_flash_v2_5',
      languageCode: 'en',
      label: 'en-primary',
    },
  ];
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
  const voiceAttempts = buildVoiceAttempts(languageCode);
  let lastFailure = {
    status: 500,
    detail: 'Voice generation failed',
    label: 'unknown',
  };

  try {
    for (const attempt of voiceAttempts) {
      const elevenLabsResponse = await fetch(
        `${ELEVENLABS_API_URL}/${attempt.id}/stream?optimize_streaming_latency=2&output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: attempt.modelId,
            language_code: attempt.languageCode,
            voice_settings: {
              stability: 0.65,
              similarity_boost: 0.78,
            },
          }),
        }
      );

      if (elevenLabsResponse.ok) {
        const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();
        const audioBuffer = Buffer.from(audioArrayBuffer);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).send(audioBuffer);
      }

      const errorBody = await elevenLabsResponse.text();
      lastFailure = {
        status: elevenLabsResponse.status,
        detail: errorBody || `ElevenLabs API error: ${elevenLabsResponse.status}`,
        label: attempt.label,
      };

      // If auth is broken, fallback attempts won't help.
      if (elevenLabsResponse.status === 401 || elevenLabsResponse.status === 403) {
        break;
      }
    }

    console.error(
      '[Voice API] ElevenLabs fallback chain exhausted:',
      `${lastFailure.label} -> ${lastFailure.status}`,
      lastFailure.detail
    );

    return res.status(lastFailure.status).json({
      error: `ElevenLabs API error: ${lastFailure.status}`,
    });
  } catch (error) {
    console.error('[Voice API] Generation failed:', error);
    return res.status(500).json({ error: 'Voice generation failed' });
  }
}
