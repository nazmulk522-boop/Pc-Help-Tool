import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

// Helper to reliably extract Client IP
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

// ==========================================
// USER DATABASE & IP-BOUND AUTH SESSIONS
// ==========================================
interface StoredUser {
  shopId: string;
  ownerEmail: string;
  passwordHash: string; // Plain/hash for simple verification
  ownerName: string;
  shopName: string;
  phone?: string;
  address?: string;
  tagline?: string;
  role: 'super_admin' | 'shop_owner';
  createdAt: string;
  updatedAt: string;
}

interface ActiveSession {
  token: string;
  email: string;
  ip: string;
  user: StoredUser;
  createdAt: number;
  lastActive: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data folder exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data dir:', e);
}

// In-memory users map with file persistence
const usersMap = new Map<string, StoredUser>();
const sessionsMap = new Map<string, ActiveSession>();

// Seed default Super Admin
const DEFAULT_SUPER_ADMIN: StoredUser = {
  shopId: 'shop_admin_default',
  ownerEmail: 'nazmulk522@gmail.com',
  passwordHash: 'admin123',
  ownerName: 'সুপার এডমিন',
  shopName: 'ডিজিটাল কম্পিউটার শপ ও স্টুডিও',
  phone: '+8809649487206',
  address: 'সাবানা রোড, বনবাড়িয়া',
  tagline: 'কম্পিউটার সেবা, অনলাইন আবেদন, NID সংশোধন ও ডিজিটাল ফটো স্টুডিও',
  role: 'super_admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed: StoredUser[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => {
          if (u.ownerEmail) {
            usersMap.set(u.ownerEmail.toLowerCase().trim(), u);
          }
        });
      }
    }
  } catch (e) {
    console.error('Failed to read users.json:', e);
  }

  // Ensure default super admin exists
  if (!usersMap.has(DEFAULT_SUPER_ADMIN.ownerEmail.toLowerCase())) {
    usersMap.set(DEFAULT_SUPER_ADMIN.ownerEmail.toLowerCase(), DEFAULT_SUPER_ADMIN);
    saveUsersToDisk();
  }
}

function saveUsersToDisk() {
  try {
    const list = Array.from(usersMap.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save users.json:', e);
  }
}

loadUsersFromDisk();

function sanitizeUser(user: StoredUser) {
  return {
    shopId: user.shopId,
    ownerEmail: user.ownerEmail,
    ownerName: user.ownerName,
    shopName: user.shopName,
    phone: user.phone || '',
    address: user.address || '',
    tagline: user.tagline || '',
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// 1. Get Client IP Info
app.get('/api/auth/client-ip', (req, res) => {
  const ip = getClientIp(req);
  res.json({ success: true, ip });
});

// 2. User Registration (First-time sign up with Email, Password & Shop Info)
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, ownerName, shopName, phone, address, tagline } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'সঠিক ইমেইল বা জিমেইল ঠিকানা দিন।' });
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
    }
    if (!shopName || !shopName.trim()) {
      return res.status(400).json({ success: false, message: 'দোকানের নাম আবশ্যক।' });
    }

    if (usersMap.has(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা হয়েছে। অনুগ্রহ করে পাসওয়ার্ড দিয়ে লগইন করুন।',
      });
    }

    const clientIp = getClientIp(req);
    const isSuperAdmin = cleanEmail === 'nazmulk522@gmail.com';

    const newUser: StoredUser = {
      shopId: 'shop_' + Date.now(),
      ownerEmail: cleanEmail,
      passwordHash: cleanPassword,
      ownerName: (ownerName || 'দোকান পরিচালক').trim(),
      shopName: shopName.trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      tagline: (tagline || 'অনলাইন সেবা ও ফটো স্টুডিও').trim(),
      role: isSuperAdmin ? 'super_admin' : 'shop_owner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usersMap.set(cleanEmail, newUser);
    saveUsersToDisk();

    // Create session token bound to this client's IP
    const token = 'sess_' + crypto.randomBytes(24).toString('hex');
    sessionsMap.set(token, {
      token,
      email: cleanEmail,
      ip: clientIp,
      user: newUser,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });

    return res.json({
      success: true,
      token,
      clientIp,
      profile: sanitizeUser(newUser),
      message: `স্বাগতম! "${newUser.shopName}" সফলভাবে নিবন্ধিত হয়েছে।`,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'রেজিস্ট্রেশন ত্রুটি।' });
  }
});

// 3. User Login (Email + Password Verification & IP binding)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'সঠিক ইমেইল ঠিকানা লিখুন।' });
    }
    if (!cleanPassword) {
      return res.status(400).json({ success: false, message: 'পাসওয়ার্ড প্রদান করুন।' });
    }

    const user = usersMap.get(cleanEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে প্রথমে রেজিস্ট্রেশন করুন।',
      });
    }

    if (user.passwordHash !== cleanPassword) {
      return res.status(401).json({
        success: false,
        message: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।',
      });
    }

    const clientIp = getClientIp(req);

    // Invalidate old sessions for this user on other tokens
    for (const [t, s] of sessionsMap.entries()) {
      if (s.email === cleanEmail) {
        sessionsMap.delete(t);
      }
    }

    // Create session token bound to the current IP
    const token = 'sess_' + crypto.randomBytes(24).toString('hex');
    sessionsMap.set(token, {
      token,
      email: cleanEmail,
      ip: clientIp,
      user,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });

    return res.json({
      success: true,
      token,
      clientIp,
      profile: sanitizeUser(user),
      message: `স্বাগতম! (${cleanEmail}) সফলভাবে লগইন হয়েছেন।`,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'লগইন ত্রুটি।' });
  }
});

// 4. Verify Session (Checks Token & IP Match)
app.post('/api/auth/verify-session', (req, res) => {
  try {
    const { token, email } = req.body;
    const currentIp = getClientIp(req);

    if (!token) {
      return res.json({
        valid: false,
        reason: 'no_token',
        currentIp,
        message: 'কোনো লগইন সেশন পাওয়া যায়নি। লগইন করুন।',
      });
    }

    const session = sessionsMap.get(token);
    if (!session) {
      return res.json({
        valid: false,
        reason: 'session_expired',
        currentIp,
        message: 'লগইন সেশনের মেয়াদ শেষ হয়েছে। পুনরায় লগইন করুন।',
      });
    }

    // Check IP match: Same IP remains logged in; changed IP asks for login!
    if (session.ip !== currentIp) {
      // IP changed! Force re-login for security
      sessionsMap.delete(token);
      return res.json({
        valid: false,
        reason: 'ip_changed',
        currentIp,
        sessionIp: session.ip,
        message: `আপনার আইপি পরিবর্তিত হয়েছে (${session.ip} ➔ ${currentIp})। নিরাপত্তার জন্য পুনরায় লগইন করুন।`,
      });
    }

    // Refresh user data in case it was updated
    const freshUser = usersMap.get(session.email) || session.user;
    session.lastActive = Date.now();

    return res.json({
      valid: true,
      token,
      clientIp: currentIp,
      profile: sanitizeUser(freshUser),
    });
  } catch (err: any) {
    console.error('Session verify error:', err);
    return res.status(500).json({ valid: false, message: 'সার্ভার ত্রুটি' });
  }
});

// 5. User Logout
app.post('/api/auth/logout', (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      sessionsMap.delete(token);
    }
    return res.json({ success: true, message: 'সফলভাবে লগআউট হয়েছে।' });
  } catch (err: any) {
    return res.status(500).json({ success: false });
  }
});

// 6. Update Profile
app.post('/api/auth/update-profile', (req, res) => {
  try {
    const { token, updates } = req.body;
    const session = sessionsMap.get(token);
    if (!session) {
      return res.status(401).json({ success: false, message: 'অননুমোদিত অনুরোধ। লগইন করুন।' });
    }

    const user = usersMap.get(session.email);
    if (!user) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    }

    if (updates.shopName) user.shopName = updates.shopName.trim();
    if (updates.ownerName) user.ownerName = updates.ownerName.trim();
    if (updates.phone !== undefined) user.phone = updates.phone.trim();
    if (updates.address !== undefined) user.address = updates.address.trim();
    if (updates.tagline !== undefined) user.tagline = updates.tagline.trim();
    user.updatedAt = new Date().toISOString();

    usersMap.set(session.email, user);
    session.user = user;
    saveUsersToDisk();

    return res.json({
      success: true,
      profile: sanitizeUser(user),
      message: 'প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে।',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'আপডেট ত্রুটি।' });
  }
});

// 7. Change Password
app.post('/api/auth/change-password', (req, res) => {
  try {
    const { token, oldPassword, newPassword } = req.body;
    const session = sessionsMap.get(token);
    if (!session) {
      return res.status(401).json({ success: false, message: 'অনুগ্রহ করে লগইন করুন।' });
    }

    const user = usersMap.get(session.email);
    if (!user) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    }

    if (user.passwordHash !== (oldPassword || '').trim()) {
      return res.status(400).json({ success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' });
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
    }

    user.passwordHash = newPassword.trim();
    user.updatedAt = new Date().toISOString();
    usersMap.set(session.email, user);
    saveUsersToDisk();

    return res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'পাসওয়ার্ড পরিবর্তন ত্রুটি।' });
  }
});

// 8. Admin Get All Registered Users
app.post('/api/auth/admin-users', (req, res) => {
  try {
    const { token } = req.body;
    const session = sessionsMap.get(token);
    if (!session || session.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'শুধুমাত্র সুপার এডমিন দেখতে পারবেন।' });
    }

    const list = Array.from(usersMap.values()).map(sanitizeUser);
    return res.json({ success: true, users: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'ত্রুটি' });
  }
});

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

async function tryFetchXtreamApi(baseUrl: string, queryParams: string, timeoutMs = 20000): Promise<{ ok: boolean; status: number; text: string; data?: any; successfulUrl?: string }> {
  // Candidate URLs to try in case port was omitted or protocol varies
  const clean = baseUrl.trim().replace(/\/+$/, '');
  const urlWithProto = (!clean.startsWith('http://') && !clean.startsWith('https://')) ? `http://${clean}` : clean;
  
  const parsed = new URL(urlWithProto);
  const host = parsed.hostname;
  const currentPort = parsed.port;
  const protocol = parsed.protocol;

  const candidates: string[] = [urlWithProto];
  if (!currentPort) {
    candidates.push(`${protocol}//${host}:80`);
    candidates.push(`${protocol}//${host}:8080`);
    candidates.push(`${protocol}//${host}:8880`);
  }

  for (const candidate of candidates) {
    try {
      const apiUrl = `${candidate}/player_api.php?${queryParams}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': IPTV_USER_AGENT,
          Accept: 'application/json, text/plain, */*',
        },
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data) {
          return { ok: true, status: response.status, text, data, successfulUrl: candidate };
        }
      } catch (jsonErr) {
        // Not valid JSON from this candidate, continue
      }
    } catch (netErr) {
      // Continue to next candidate
    }
  }

  return { ok: false, status: 500, text: 'No response or invalid format from Xtream server' };
}

// 1. Xtream Codes Authentication & Server Info
app.post('/api/iptv/xtream-auth', async (req, res) => {
  try {
    let { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, error: 'সার্ভার URL, ইউজারনেম ও পাসওয়ার্ড পূরণ করুন।' });
    }

    const queryParams = `username=${encodeURIComponent(username.trim())}&password=${encodeURIComponent(password.trim())}`;
    const result = await tryFetchXtreamApi(serverUrl, queryParams, 20000);

    if (!result.ok || !result.data) {
      return res.status(400).json({
        success: false,
        error: 'Xtream Codes সার্ভার থেকে অপ্রত্যাশিত রেসপন্স এসেছে। সার্ভার URL ও ইউজারনেম/পাসওয়ার্ড সঠিক কিনা যাচাই করুন।',
      });
    }

    const data = result.data;
    if (data.user_info && data.user_info.auth === 0) {
      return res.status(401).json({
        success: false,
        error: 'ভুল ইউজারনেম বা পাসওয়ার্ড অথবা অ্যাকাউন্টটির মেয়াদ শেষ হয়েছে!',
      });
    }

    return res.json({
      success: true,
      serverUrl: result.successfulUrl || serverUrl,
      data,
    });
  } catch (error: any) {
    console.error('Xtream Auth Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.name === 'AbortError' ? 'Xtream সার্ভারে কানেক্ট হতে বেশি সময় লেগেছে (Timeout)।' : error?.message || 'Xtream প্রমাণীকরণ ব্যর্থ হয়েছে।',
    });
  }
});

// 2. Xtream Codes Data (Categories, Live Streams, VOD Streams, Series)
const DEFAULT_XTREAM_SERVER = 'http://rgkkw.live:80';
const DEFAULT_XTREAM_USER = '1Aoen7elp5';
const DEFAULT_XTREAM_PASS = 'IgMJ60tmAa';

let cachedBundle: {
  categories: any[];
  channels: any[];
  timestamp: number;
} | null = null;

// Endpoint to get pre-bundled live channels directly from the configured Xtream account
app.get('/api/iptv/live-bundle', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const now = Date.now();

    // Return memory cache if fresh (within 10 minutes) and not forced
    if (!force && cachedBundle && now - cachedBundle.timestamp < 10 * 60 * 1000) {
      return res.json({
        success: true,
        cached: true,
        serverUrl: DEFAULT_XTREAM_SERVER,
        categories: cachedBundle.categories,
        channels: cachedBundle.channels,
        totalChannels: cachedBundle.channels.length,
      });
    }

    // 1. Fetch categories
    const catQuery = `username=${encodeURIComponent(DEFAULT_XTREAM_USER)}&password=${encodeURIComponent(DEFAULT_XTREAM_PASS)}&action=get_live_categories`;
    const catResult = await tryFetchXtreamApi(DEFAULT_XTREAM_SERVER, catQuery, 25000);
    const rawCategories = Array.isArray(catResult.data) ? catResult.data : [];

    // 2. Fetch streams
    const streamQuery = `username=${encodeURIComponent(DEFAULT_XTREAM_USER)}&password=${encodeURIComponent(DEFAULT_XTREAM_PASS)}&action=get_live_streams`;
    const streamResult = await tryFetchXtreamApi(DEFAULT_XTREAM_SERVER, streamQuery, 35000);
    const rawStreams = Array.isArray(streamResult.data) ? streamResult.data : [];

    if (!rawStreams || rawStreams.length === 0) {
      if (cachedBundle) {
        return res.json({
          success: true,
          cached: true,
          categories: cachedBundle.categories,
          channels: cachedBundle.channels,
          totalChannels: cachedBundle.channels.length,
        });
      }
      return res.status(502).json({
        success: false,
        error: 'Xtream লাইভ চ্যানেল সার্ভার থেকে লোড করা যায়নি',
      });
    }

    const catMap = new Map<string, string>();
    const categories: any[] = [
      { id: 'all', name: 'সকল চ্যানেল (All Channels)', count: rawStreams.length },
    ];

    rawCategories.forEach((c: any) => {
      const cId = String(c.category_id);
      catMap.set(cId, c.category_name);
      categories.push({
        id: cId,
        name: c.category_name,
        count: 0,
      });
    });

    const cleanUrl = DEFAULT_XTREAM_SERVER.replace(/\/+$/, '');
    const channels = rawStreams.map((s: any, idx: number) => {
      const streamId = s.stream_id || s.num;
      const catId = String(s.category_id || 'general');
      const catName = catMap.get(catId) || 'General';

      const foundCat = categories.find((c) => c.id === catId);
      if (foundCat) {
        foundCat.count = (foundCat.count || 0) + 1;
      }

      let resQuality = '1080p FHD';
      if (/4k|uhd/i.test(s.name || '')) resQuality = '4K UHD';
      else if (/720|hd/i.test(s.name || '')) resQuality = '720p HD';

      return {
        id: `xt_${streamId}`,
        num: s.num || idx + 1,
        name: s.name || `Channel ${idx + 1}`,
        streamId,
        streamIcon: s.stream_icon || '',
        categoryId: catId,
        categoryName: catName,
        streamUrl: `${cleanUrl}/live/${encodeURIComponent(DEFAULT_XTREAM_USER)}/${encodeURIComponent(DEFAULT_XTREAM_PASS)}/${streamId}.ts`,
        resolution: resQuality,
        currentProgram: s.epg_channel_id ? 'ইলেকট্রনিক প্রোগ্রাম' : 'লাইভ সম্প্রচার',
        nextProgram: 'পরবর্তী অনুষ্ঠানমালা',
      };
    });

    // Sort categories: Bengali, Sports, Islamic, News on top
    categories.sort((a, b) => {
      if (a.id === 'all') return -1;
      if (b.id === 'all') return 1;
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      const isBanglaA = aName.includes('bengali') || aName.includes('bangla');
      const isBanglaB = bName.includes('bengali') || bName.includes('bangla');
      if (isBanglaA && !isBanglaB) return -1;
      if (!isBanglaA && isBanglaB) return 1;

      const isSportsA = aName.includes('sport') || aName.includes('cricket') || aName.includes('football');
      const isSportsB = bName.includes('sport') || bName.includes('cricket') || bName.includes('football');
      if (isSportsA && !isSportsB) return -1;
      if (!isSportsA && isSportsB) return 1;

      const isIslamicA = aName.includes('islam') || aName.includes('religious');
      const isIslamicB = bName.includes('islam') || bName.includes('religious');
      if (isIslamicA && !isIslamicB) return -1;
      if (!isIslamicA && isIslamicB) return 1;

      return (b.count || 0) - (a.count || 0);
    });

    cachedBundle = {
      categories,
      channels,
      timestamp: now,
    };

    return res.json({
      success: true,
      cached: false,
      serverUrl: DEFAULT_XTREAM_SERVER,
      categories,
      channels,
      totalChannels: channels.length,
    });
  } catch (err: any) {
    console.error('Live Bundle Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to generate live bundle',
    });
  }
});

app.post('/api/iptv/xtream-data', async (req, res) => {
  try {
    let { serverUrl, username, password, action = 'get_live_streams', category_id, series_id, vod_id } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, error: 'Missing required credentials' });
    }

    let queryParams = `username=${encodeURIComponent(username.trim())}&password=${encodeURIComponent(password.trim())}&action=${encodeURIComponent(action)}`;
    if (category_id !== undefined && category_id !== '') {
      queryParams += `&category_id=${encodeURIComponent(category_id)}`;
    }
    if (series_id !== undefined) {
      queryParams += `&series_id=${encodeURIComponent(series_id)}`;
    }
    if (vod_id !== undefined) {
      queryParams += `&vod_id=${encodeURIComponent(vod_id)}`;
    }

    const result = await tryFetchXtreamApi(serverUrl, queryParams, 35000);

    if (!result.ok || !result.data) {
      return res.status(400).json({
        success: false,
        error: `চ্যানেল ডেটা লোড করা যায়নি।`,
        data: [],
      });
    }

    return res.json({
      success: true,
      data: result.data,
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
    let { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Playlist URL is required' });
    }

    // Remove any accidental whitespace inside domain/path (e.g., "skym3u. top" -> "skym3u.top")
    let targetUrl = String(url).trim().replace(/\s+/g, '');
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
        error: `প্লেলিস্ট সার্ভার থেকে HTTP ${response.status} রেসপন্স এসেছে। লিঙ্কটি সঠিক কিনা যাচাই করুন।`,
      });
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Check if the returned content is an HTML webpage rather than an actual M3U/M3U8 file
    const isHtml = contentType.includes('text/html') || 
                   text.trim().startsWith('<!DOCTYPE html') || 
                   text.trim().startsWith('<html') ||
                   (text.includes('</head>') && !text.includes('#EXTINF') && !text.includes('#EXTM3U'));

    if (isHtml) {
      // Check if there are any embedded .m3u or .m3u8 URLs in the HTML
      const embeddedM3u = text.match(/https?:\/\/[^\s"'<>]+\.m3u[8]?[^\s"'<>]*/i);
      if (embeddedM3u) {
        // Automatically try downloading the embedded M3U
        try {
          const directRes = await fetch(embeddedM3u[0], {
            headers: { 'User-Agent': IPTV_USER_AGENT, Accept: '*/*' },
          });
          if (directRes.ok) {
            const directText = await directRes.text();
            if (directText.includes('#EXTINF') || directText.includes('#EXTM3U') || directText.includes('http')) {
              return res.json({
                success: true,
                content: directText,
                url: embeddedM3u[0],
                size: directText.length,
              });
            }
          }
        } catch (embeddedErr) {}
      }

      return res.status(400).json({
        success: false,
        isHtml: true,
        error: 'প্রদত্ত লিঙ্কটি সরাসরি M3U প্লেলিস্ট বা .m3u8 ফাইল নয়, এটি একটি ওয়েবসাইট/ব্লগ পেজ (HTML)।',
        details: 'এই পেজে গিয়ে "Download M3U" বাটনে ক্লিক করে ফাইলটি ডাউনলোড করুন এবং "M3U ফাইল আপলোড" ট্যাবে আপলোড করুন, অথবা ডাইরেক্ট .m3u/.m3u8 স্ট্রিম লিঙ্কটি ব্যবহার করুন।',
      });
    }

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
      error: error?.name === 'AbortError' ? 'প্লেলিস্ট ডাউনলোড হতে বেশি সময় নিয়েছে (Timeout)।' : error?.message || 'Failed to download M3U playlist',
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
