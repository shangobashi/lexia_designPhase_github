const ELEVENLABS_STT_API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8MB
const DEFAULT_STT_MODEL_ID = 'scribe_v1';

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

function normalizeLanguage(language) {
  return language === 'fr' ? 'fr' : 'en';
}

function sanitizeApiKey(rawApiKey) {
  if (typeof rawApiKey !== 'string') return '';
  const trimmed = rawApiKey.trim();
  if (!trimmed) return '';

  const isWrappedInDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');
  const isWrappedInSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");
  if (isWrappedInDoubleQuotes || isWrappedInSingleQuotes) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function sanitizeMimeType(mimeType) {
  const allowedTypes = new Set([
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/wav',
    'audio/x-wav',
  ]);

  if (typeof mimeType !== 'string') return 'audio/webm';
  return allowedTypes.has(mimeType) ? mimeType : 'audio/webm';
}

function extensionForMimeType(mimeType) {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = sanitizeApiKey(process.env.ELEVENLABS_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  const { audioBase64, mimeType, language = 'en' } = parseBody(req.body);
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({ error: 'Audio payload is required' });
  }

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audioBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid audio payload' });
  }

  if (!audioBuffer.length) {
    return res.status(400).json({ error: 'Empty audio payload' });
  }

  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    return res.status(413).json({ error: 'Audio payload too large' });
  }

  const safeMimeType = sanitizeMimeType(mimeType);
  const elevenLabsForm = new FormData();
  elevenLabsForm.append(
    'file',
    new Blob([audioBuffer], { type: safeMimeType }),
    `speech.${extensionForMimeType(safeMimeType)}`
  );
  elevenLabsForm.append('model_id', process.env.ELEVENLABS_STT_MODEL_ID || DEFAULT_STT_MODEL_ID);
  elevenLabsForm.append('language_code', normalizeLanguage(language));

  try {
    const sttResponse = await fetch(ELEVENLABS_STT_API_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenLabsForm,
    });

    if (!sttResponse.ok) {
      const errorBody = await sttResponse.text();
      console.error('[Voice STT API] ElevenLabs error:', sttResponse.status, errorBody);

      if (sttResponse.status === 401 || sttResponse.status === 403) {
        return res.status(sttResponse.status).json({
          error: 'ElevenLabs STT authentication failed. Verify ELEVENLABS_API_KEY in Vercel env (no extra quotes/spaces).',
        });
      }

      return res.status(sttResponse.status).json({
        error: `ElevenLabs STT API error: ${sttResponse.status}`,
      });
    }

    const data = await sttResponse.json();
    const transcript = (data?.text || data?.transcript || '').trim();

    if (!transcript) {
      return res.status(422).json({ error: 'No speech detected' });
    }

    return res.status(200).json({ text: transcript });
  } catch (error) {
    console.error('[Voice STT API] Transcription failed:', error);
    return res.status(500).json({ error: 'Transcription failed' });
  }
}
