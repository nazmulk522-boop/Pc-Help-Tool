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

// ==========================================
// IPTV & XTREAM CODES API PROXY ENDPOINTS
// ==========================================

const IPTV_USER_AGENT = 'IPTVSmartersPro/1.0.0 (Linux; Android 10; SmartTV)';

// 1. Xtream Codes Authentication & Server Info
app.post('/api/iptv/xtream-auth', async (req, res) => {
  try {
    let { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, error: 'Server URL, username, and password are required' });
    }

    serverUrl = serverUrl.trim().replace(/\/+$/, '');
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `http://${serverUrl}`;
    }

    const apiUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': IPTV_USER_AGENT,
        Accept: 'application/json, text/plain, */*',
      },
    });
    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.warn('Xtream Auth non-JSON response:', text.substring(0, 200));
      return res.status(400).json({
        success: false,
        error: `সার্ভার থেকে সঠিক ডেটা পাওয়া যায়নি (HTTP ${response.status})। সার্ভার URL (${serverUrl}) অথবা ইউজারনেম/পাসওয়ার্ড চেক করুন।`,
        rawPreview: text.substring(0, 200),
      });
    }

    if (data.user_info && data.user_info.auth === 0) {
      return res.status(401).json({
        success: false,
        error: 'ভুল ইউজারনেম বা পাসওয়ার্ড অথবা অ্যাকাউন্ট মেয়াদোত্তীর্ণ!',
      });
    }

    return res.json({
      success: true,
      serverUrl,
      data,
    });
  } catch (error: any) {
    console.error('Xtream Auth Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.name === 'AbortError' ? 'Xtream সার্ভারে কানেক্ট হতে বেশি সময় লেগেছে (Timeout)' : error?.message || 'Failed to authenticate with Xtream Codes',
    });
  }
});

// 2. Xtream Codes Data (Categories, Live Streams, VOD Streams, Series)
app.post('/api/iptv/xtream-data', async (req, res) => {
  try {
    let { serverUrl, username, password, action = 'get_live_streams', category_id, series_id, vod_id } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, error: 'Missing required credentials' });
    }

    serverUrl = serverUrl.trim().replace(/\/+$/, '');
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `http://${serverUrl}`;
    }

    let queryParams = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${encodeURIComponent(action)}`;
    if (category_id !== undefined && category_id !== '') {
      queryParams += `&category_id=${encodeURIComponent(category_id)}`;
    }
    if (series_id !== undefined) {
      queryParams += `&series_id=${encodeURIComponent(series_id)}`;
    }
    if (vod_id !== undefined) {
      queryParams += `&vod_id=${encodeURIComponent(vod_id)}`;
    }

    const apiUrl = `${serverUrl}/player_api.php?${queryParams}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': IPTV_USER_AGENT,
        Accept: 'application/json, text/plain, */*',
      },
    });
    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        error: `চ্যানেল ডেটা পার্স করা যায়নি (HTTP ${response.status})`,
        data: [],
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Xtream Data Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch Xtream data',
      data: [],
    });
  }
});

// 3. Fetch remote M3U / M3U8 Playlist
app.post('/api/iptv/fetch-m3u', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Playlist URL is required' });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `http://${targetUrl}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': IPTV_USER_AGENT,
        Accept: '*/*',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Failed to download playlist: HTTP ${response.status}`,
      });
    }

    const text = await response.text();
    return res.json({
      success: true,
      content: text,
      url: targetUrl,
      size: text.length,
    });
  } catch (error: any) {
    console.error('Fetch M3U Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.name === 'AbortError' ? 'প্লেলিস্ট ডাউনলোড হতে বেশি সময় নিয়েছে।' : error?.message || 'Failed to download M3U playlist',
    });
  }
});

// 4. Stream Proxy (for HLS / TS live streams to bypass CORS and Mixed-Content)
app.get('/api/iptv/proxy-stream', async (req, res) => {
  try {
    const streamUrl = req.query.url as string;
    if (!streamUrl) {
      return res.status(400).send('Stream URL is required');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(streamUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': IPTV_USER_AGENT,
        Accept: '*/*',
      },
    });
    clearTimeout(timeoutId);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    const contentType = response.headers.get('content-type') || 'video/mp2t';
    res.setHeader('Content-Type', contentType);

    // If it's an HLS manifest, rewrite relative segment paths
    if (contentType.includes('mpegurl') || streamUrl.endsWith('.m3u8')) {
      const manifestText = await response.text();
      const lines = manifestText.split('\n');
      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          try {
            const absoluteChunkUrl = new URL(trimmed, streamUrl).href;
            return `/api/iptv/proxy-stream?url=${encodeURIComponent(absoluteChunkUrl)}`;
          } catch (e) {
            return line;
          }
        }
        return line;
      }).join('\n');

      return res.send(rewritten);
    }

    // Binary / TS stream piping
    if (!response.body) {
      return res.status(500).send('No stream body');
    }

    const reader = response.body.getReader();
    const pump = async () => {
      try {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        await pump();
      } catch (streamErr) {
        res.end();
      }
    };
    await pump();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).send('Stream proxy failed: ' + error?.message);
    }
  }
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
