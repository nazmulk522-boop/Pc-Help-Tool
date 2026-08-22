import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsing with large limits for high-res studio images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy init Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Background Removal API (Remove.bg integration & smart transparent cutout)
app.post('/api/remove-bg', async (req, res) => {
  try {
    const { imageBase64, apiKey } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const removeBgKey = apiKey || process.env.REMOVE_BG_API_KEY;
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // 1. If Remove.bg API key is provided
    if (removeBgKey) {
      try {
        const fetchRes = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': removeBgKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            image_file_b64: cleanBase64,
            size: 'auto',
            // DO NOT pass bg_color so remove.bg ALWAYS returns a pure transparent PNG!
          }),
        });

        if (fetchRes.ok) {
          const json = await fetchRes.json();
          if (json.data && json.data.result_b64) {
            return res.json({
              success: true,
              source: 'remove.bg',
              imageBase64: `data:image/png;base64,${json.data.result_b64}`,
            });
          }
        } else {
          const errData = await fetchRes.text();
          console.warn('remove.bg API response not ok:', fetchRes.status, errData);
        }
      } catch (err: any) {
        console.error('remove.bg API error:', err);
      }
    }

    // 2. Client engine fallback signal
    return res.json({
      success: false,
      useClientEngine: true,
      message: 'বিল্ট-ইন স্টুডিও অ্যালগরিদম দ্বারা ব্যাকগ্রাউন্ড প্রসেস হবে।',
    });
  } catch (error: any) {
    console.error('Server remove-bg error:', error);
    return res.status(500).json({ error: error?.message || 'Server error removing background' });
  }
});

// Dedicated Gemini Passport Photo Enhancement & Retouching
app.post('/api/gemini/enhance-passport', async (req, res) => {
  try {
    const { imageBase64, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY পাওয়া যায়নি। অনুগ্রহ করে সেটিংস চেক করুন।' });
    }

    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:image/png')) {
      mimeType = 'image/png';
    } else if (imageBase64.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    }
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const defaultPrompt = `Make bd passport size photo \nFace 100% match ,Face Cleaning Retouching Smoothing &\nSoftening, Pimples Remove, Remove shadows from all faces Brightness Adjust, and Background Change light blue Background Add`;
    const promptToUse = prompt?.trim() || defaultPrompt;

    let resultBase64: string | null = null;
    let textResponse: string | null = null;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: promptToUse,
            },
          ],
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            resultBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          } else if (part.text) {
            textResponse = part.text;
          }
        }
      }
    } catch (liteErr: any) {
      console.warn('gemini-3.1-flash-lite-image attempt error:', liteErr?.message);
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: promptToUse,
            },
          ],
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            resultBase64 = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          } else if (part.text) {
            textResponse = part.text;
          }
        }
      }
    }

    if (resultBase64) {
      return res.json({
        success: true,
        source: 'gemini',
        imageBase64: resultBase64,
        promptUsed: promptToUse,
      });
    } else {
      return res.status(422).json({
        success: false,
        error: textResponse || 'Gemini থেকে ছবির আউটপুট তৈরি করা যায়নি।',
      });
    }
  } catch (err: any) {
    console.error('Gemini passport enhance error:', err);
    return res.status(500).json({ error: err?.message || 'Server error processing Gemini passport enhancement' });
  }
});

// AI Portrait Segmentation / Background Analysis Assist
app.post('/api/ai/analyze-portrait', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured; client-side algorithms will run directly.',
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this portrait or ID card photo for a photo studio / computer shop editing task.
Return a valid JSON object with:
1. "detectedType": "single_portrait" | "couple_portrait" | "nid_card" | "document" | "other"
2. "primarySubjectBox": {"ymin": number, "xmin": number, "ymax": number, "xmax": number} (values 0-1000 representing bounding box)
3. "recommendedBgColor": string (e.g. "#4A90E2" or "#FFFFFF" or "#C8DCF0")
4. "faceBox": {"ymin": number, "xmin": number, "ymax": number, "xmax": number}
5. "enhancementAdvice": string (short advice in Bengali, e.g. "ছবিটি কিছুটা অনুজ্জ্বল, উজ্জ্বলতা ১০% বৃদ্ধি করতে পারেন")
Ensure the output is strictly valid JSON without markdown wrapping.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    try {
      const data = JSON.parse(text);
      return res.json({ success: true, data });
    } catch {
      return res.json({ success: true, raw: text });
    }
  } catch (error: any) {
    console.error('Gemini portrait analysis error:', error);
    return res.status(500).json({ error: error?.message || 'Server error analyzing photo' });
  }
});

// Quick Document / Bio-data / Bangla Application AI Assistant
app.post('/api/ai/generate-template', async (req, res) => {
  try {
    const { templateType, details } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        content: `তারিখ: ${new Date().toLocaleDateString('bn-BD')}\nবরাবর,\nউপযুক্ত কর্তৃপক্ষ,\nবিষয়: আবেদনপত্র।\n\nজনাব,\nবিনীত নিবেদন এই যে, ...\n\nবিনীত,\n${details?.name || 'আবেদনকারী'}`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `Create a formal Bengali computer shop print-ready letter/application for: "${templateType}".
Details provided: ${JSON.stringify(details || {})}.
Format cleanly with standard Bengali official structure, correct spelling, ready for instant A4 printing.`,
    });

    return res.json({ success: true, text: response.text });
  } catch (err: any) {
    console.error('Template gen error:', err);
    return res.status(500).json({ error: err?.message || 'Error generating template' });
  }
});

// Vite middleware / static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Computer Shop Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
