import express from 'express';

const router = express.Router();

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

router.post('/generate', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  const { text, language = 'en' } = req.body ?? {};
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
    const response = await fetch(
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

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Voice] ElevenLabs error:', response.status, errorBody);
      return res.status(response.status).json({
        error: `ElevenLabs API error: ${response.status}`,
      });
    }

    if (!response.body) {
      return res.status(502).json({ error: 'No audio stream returned from ElevenLabs' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = response.body.getReader();
    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    while (!closed) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        res.write(Buffer.from(value));
      }
    }

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    console.error('[Voice] Generation failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Voice generation failed' });
      return;
    }
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
