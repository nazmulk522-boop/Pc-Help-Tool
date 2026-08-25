import { IptvCategory, IptvChannel, XtreamAccount, M3uPlaylist, IptvVodItem, IptvSeriesItem } from '../types';
import { DEFAULT_IPTV_CATEGORIES, DEFAULT_IPTV_CHANNELS } from '../data/defaultChannels';

const STORAGE_KEYS = {
  XTREAM_ACCOUNTS: 'shop_iptv_xtream_accounts',
  M3U_PLAYLISTS: 'shop_iptv_m3u_playlists',
  ACTIVE_SOURCE: 'shop_iptv_active_source', // 'default' | 'xtream_<id>' | 'm3u_<id>'
  FAVORITES: 'shop_iptv_favorites',
  RECENT_CHANNELS: 'shop_iptv_recents',
  CUSTOM_CHANNELS: 'shop_iptv_custom_channels',
  CUSTOM_CATEGORIES: 'shop_iptv_custom_categories',
  VOD_ITEMS: 'shop_iptv_vod_items',
  SERIES_ITEMS: 'shop_iptv_series_items',
};

export const DEFAULT_XTREAM_ACCOUNT: XtreamAccount = {
  id: 'xtream_default',
  name: 'STAR-NETWORK (rgkkw.live)',
  serverUrl: 'http://rgkkw.live:80',
  username: '1Aoen7elp5',
  password: 'IgMJ60tmAa',
  status: 'Active',
  expDate: 'Active',
  maxConnections: '1',
  activeCons: '1',
  createdAt: new Date().toISOString(),
  isDefault: true,
};

// 1. Get & Save Xtream Accounts
export function getSavedXtreamAccounts(): XtreamAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.XTREAM_ACCOUNTS);
    if (!raw) return [DEFAULT_XTREAM_ACCOUNT];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_XTREAM_ACCOUNT];
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load Xtream accounts:', e);
    return [DEFAULT_XTREAM_ACCOUNT];
  }
}

export function saveXtreamAccount(account: XtreamAccount): void {
  try {
    const accounts = getSavedXtreamAccounts();
    const existingIdx = accounts.findIndex((a) => a.id === account.id);
    if (existingIdx >= 0) {
      accounts[existingIdx] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem(STORAGE_KEYS.XTREAM_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save Xtream account:', e);
  }
}

export function deleteXtreamAccount(id: string): void {
  try {
    const accounts = getSavedXtreamAccounts().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.XTREAM_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to delete Xtream account:', e);
  }
}

// 2. Get & Save M3U Playlists
export function getSavedM3uPlaylists(): M3uPlaylist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.M3U_PLAYLISTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load M3U playlists:', e);
    return [];
  }
}

export function saveM3uPlaylist(playlist: M3uPlaylist): void {
  try {
    const playlists = getSavedM3uPlaylists();
    const existingIdx = playlists.findIndex((p) => p.id === playlist.id);
    if (existingIdx >= 0) {
      playlists[existingIdx] = playlist;
    } else {
      playlists.push(playlist);
    }
    localStorage.setItem(STORAGE_KEYS.M3U_PLAYLISTS, JSON.stringify(playlists));
  } catch (e) {
    console.error('Failed to save M3U playlist:', e);
  }
}

export function deleteM3uPlaylist(id: string): void {
  try {
    const playlists = getSavedM3uPlaylists().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.M3U_PLAYLISTS, JSON.stringify(playlists));
  } catch (e) {
    console.error('Failed to delete M3U playlist:', e);
  }
}

// 3. Favorites & Recents
export function getFavoriteChannelIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function toggleFavoriteChannel(channelId: string): boolean {
  try {
    let favs = getFavoriteChannelIds();
    let isNowFav = false;
    if (favs.includes(channelId)) {
      favs = favs.filter((id) => id !== channelId);
      isNowFav = false;
    } else {
      favs.push(channelId);
      isNowFav = true;
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
    return isNowFav;
  } catch (e) {
    return false;
  }
}

export function getRecentChannels(): IptvChannel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_CHANNELS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function addRecentChannel(channel: IptvChannel): void {
  try {
    let recents = getRecentChannels().filter((c) => c.id !== channel.id);
    recents.unshift(channel);
    if (recents.length > 20) {
      recents = recents.slice(0, 20);
    }
    localStorage.setItem(STORAGE_KEYS.RECENT_CHANNELS, JSON.stringify(recents));
  } catch (e) {
    console.error('Failed to save recent channel:', e);
  }
}

// 4. M3U Parser logic
export function parseM3uContent(content: string, playlistName = 'Custom Playlist'): {
  categories: IptvCategory[];
  channels: IptvChannel[];
} {
  if (!content) return { categories: [], channels: [] };

  const lines = content.split(/\r?\n/);
  const channels: IptvChannel[] = [];
  const categoriesMap = new Map<string, number>();

  let currentInfo: {
    id?: string;
    name?: string;
    logo?: string;
    group?: string;
    resolution?: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse attributes like tvg-id, tvg-name, tvg-logo, group-title
      const tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupTitleMatch = line.match(/group-title="([^"]+)"/i);
      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);

      // Title after comma
      const commaIdx = line.lastIndexOf(',');
      let title = commaIdx >= 0 ? line.substring(commaIdx + 1).trim() : '';
      if (!title && tvgNameMatch) {
        title = tvgNameMatch[1].trim();
      }
      if (!title) {
        title = `Channel ${channels.length + 1}`;
      }

      const group = groupTitleMatch ? groupTitleMatch[1].trim() : 'General';
      const logo = tvgLogoMatch ? tvgLogoMatch[1].trim() : '';
      const id = tvgIdMatch ? tvgIdMatch[1].trim() : `ch_${channels.length + 1}`;

      // Detect resolution from title
      let resolution = '1080p HD';
      if (/4k|uhd/i.test(title)) resolution = '4K UHD';
      else if (/fhd|1080/i.test(title)) resolution = '1080p FHD';
      else if (/720|hd/i.test(title)) resolution = '720p HD';
      else if (/sd|576|480/i.test(title)) resolution = 'SD';

      currentInfo = {
        id,
        name: title,
        logo,
        group,
        resolution,
      };
    } else if (!line.startsWith('#')) {
      // Line is stream URL (either preceded by #EXTINF or raw URL)
      const streamUrl = line;
      if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://') || streamUrl.startsWith('rtmp://')) {
        const info = currentInfo || {
          id: `ch_${channels.length + 1}`,
          name: `Channel ${channels.length + 1}`,
          logo: '',
          group: 'General',
          resolution: '1080p HD',
        };

        const categoryId = (info.group || 'General')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_');

        const channelObj: IptvChannel = {
          id: `m3u_${channels.length + 1}_${Math.random().toString(36).substring(2, 7)}`,
          num: channels.length + 1,
          name: info.name || `Channel ${channels.length + 1}`,
          streamUrl: streamUrl,
          streamIcon: info.logo,
          categoryId: categoryId,
          categoryName: info.group || 'General',
          resolution: info.resolution || '1080p HD',
          currentProgram: `${info.name} Live Broadcast`,
          nextProgram: 'Regular Schedule',
        };

        channels.push(channelObj);
        categoriesMap.set(
          info.group || 'General',
          (categoriesMap.get(info.group || 'General') || 0) + 1
        );

        currentInfo = null;
      }
    }
  }

  const categories: IptvCategory[] = [
    { id: 'all', name: 'সকল চ্যানেল (All Channels)', count: channels.length },
  ];

  categoriesMap.forEach((count, groupName) => {
    categories.push({
      id: groupName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: groupName,
      count,
    });
  });

  return { categories, channels };
}

export async function applyAndCacheM3uPlaylist(
  channels: IptvChannel[],
  categories: IptvCategory[]
): Promise<void> {
  inMemoryChannels = channels;
  inMemoryCategories = categories;
  await saveChannelsToIndexedDB(channels, categories);
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CHANNELS, JSON.stringify(channels.slice(0, 150)));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories.slice(0, 50)));
  } catch (e) {}
}

// 5. Xtream Codes API Integration
export async function authenticateXtreamCodes(
  serverUrl: string,
  username: string,
  password: string
): Promise<{
  success: boolean;
  account?: XtreamAccount;
  error?: string;
}> {
  try {
    const res = await fetch('/api/iptv/xtream-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl, username, password }),
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      return {
        success: false,
        error: `সার্ভার থেকে সঠিক রেসপন্স পাওয়া যায়নি (Status: ${res.status})। সার্ভার ও ইন্টারনেট সংযোগ চেক করুন।`,
      };
    }

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || 'Xtream Codes সার্ভারে লগইন করা সম্ভব হয়নি। ইউজারনেম ও পাসওয়ার্ড সঠিক কিনা চেক করুন।',
      };
    }

    const data = json.data;
    const userInfo = data?.user_info || {};
    const serverInfo = data?.server_info || {};

    let expDate = 'Unlimited';
    if (userInfo.exp_date && !isNaN(Number(userInfo.exp_date))) {
      expDate = new Date(Number(userInfo.exp_date) * 1000).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    const cleanServerUrl = json.serverUrl || serverUrl;
    const account: XtreamAccount = {
      id: `xtream_${Date.now()}`,
      name: userInfo.username ? `${userInfo.username} (${serverInfo.url || cleanServerUrl})` : 'Xtream Server',
      serverUrl: cleanServerUrl,
      username,
      password,
      status: (userInfo.status as any) || 'Active',
      expDate,
      maxConnections: userInfo.max_connections || '1',
      activeCons: userInfo.active_cons || '0',
      createdAt: new Date().toISOString(),
      userInfo,
      serverInfo,
      isDefault: true,
    };

    saveXtreamAccount(account);
    return { success: true, account };
  } catch (err: any) {
    console.error('Xtream Auth Fetch Error:', err);
    return { success: false, error: err?.message || 'নেটওয়ার্ক বা সার্ভার কানেকশন এরর' };
  }
}

// In-memory channel cache for high performance
let inMemoryChannels: IptvChannel[] = [];
let inMemoryCategories: IptvCategory[] = [];

// Helper to store in IndexedDB
function saveChannelsToIndexedDB(channels: IptvChannel[], categories: IptvCategory[]): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(false);
      return;
    }
    try {
      const request = indexedDB.open('UltraXC_IPTV_DB', 2);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('channels')) {
          db.createObjectStore('channels', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(['channels', 'categories'], 'readwrite');
          const chanStore = tx.objectStore('channels');
          const catStore = tx.objectStore('categories');
          chanStore.clear();
          catStore.clear();

          channels.forEach((c) => chanStore.put(c));
          categories.forEach((cat) => catStore.put(cat));

          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (txErr) {
          resolve(false);
        }
      };
      request.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

// 6. Fetch Xtream Live Streams and Categories
export async function syncXtreamContent(account: XtreamAccount): Promise<{
  success: boolean;
  categories: IptvCategory[];
  channels: IptvChannel[];
  vodItems?: IptvVodItem[];
  seriesItems?: IptvSeriesItem[];
  error?: string;
}> {
  try {
    // 1. Fetch live categories
    const catRes = await fetch('/api/iptv/xtream-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverUrl: account.serverUrl,
        username: account.username,
        password: account.password,
        action: 'get_live_categories',
      }),
    });

    const catText = await catRes.text();
    let rawCategories: any[] = [];
    try {
      const catJson = JSON.parse(catText);
      rawCategories = Array.isArray(catJson.data) ? catJson.data : [];
    } catch (e) {
      rawCategories = [];
    }

    // 2. Fetch live streams
    const streamRes = await fetch('/api/iptv/xtream-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverUrl: account.serverUrl,
        username: account.username,
        password: account.password,
        action: 'get_live_streams',
      }),
    });

    const streamText = await streamRes.text();
    let rawStreams: any[] = [];
    try {
      const streamJson = JSON.parse(streamText);
      rawStreams = Array.isArray(streamJson.data) ? streamJson.data : [];
    } catch (e) {
      rawStreams = [];
    }

    // Build category map
    const catMap = new Map<string, string>();
    const categories: IptvCategory[] = [
      { id: 'all', name: 'সকল চ্যানেল (All Channels)', count: rawStreams.length },
    ];

    rawCategories.forEach((c: any) => {
      catMap.set(String(c.category_id), c.category_name);
      categories.push({
        id: String(c.category_id),
        name: c.category_name,
        count: 0,
      });
    });

    // Clean server url for direct stream playback
    const cleanUrl = account.serverUrl.replace(/\/+$/, '');
    const allowedFormats = (account.userInfo as any)?.allowed_output_formats || account.userInfo?.allowedOutputFormats || ['ts'];
    const primaryExt = allowedFormats.includes('m3u8') ? 'm3u8' : 'ts';

    // Map channels
    const channels: IptvChannel[] = rawStreams.map((s: any, idx: number) => {
      const streamId = s.stream_id || s.num;
      const catId = String(s.category_id || 'general');
      const catName = catMap.get(catId) || 'General';

      // Standard Xtream live stream URL format
      const streamUrl = `${cleanUrl}/live/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password)}/${streamId}.${primaryExt}`;

      // Update category count
      const foundCat = categories.find((c) => c.id === catId);
      if (foundCat) {
        foundCat.count = (foundCat.count || 0) + 1;
      }

      let res = '1080p FHD';
      if (/4k|uhd/i.test(s.name || '')) res = '4K UHD';
      else if (/720|hd/i.test(s.name || '')) res = '720p HD';

      return {
        id: `xt_${streamId}`,
        num: s.num || idx + 1,
        name: s.name || `Channel ${idx + 1}`,
        streamId,
        streamIcon: s.stream_icon || '',
        categoryId: catId,
        categoryName: catName,
        streamUrl,
        resolution: res,
        currentProgram: s.epg_channel_id ? 'ইলেকট্রনিক প্রোগ্রাম' : 'লাইভ ব্রডকাস্ট',
        nextProgram: 'পরবর্তী অনুষ্ঠানমালা',
      };
    });

    // Sort categories so that Bengali, Sports, Islamic, News come first
    categories.sort((a, b) => {
      if (a.id === 'all') return -1;
      if (b.id === 'all') return 1;
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const isBanglaA = aName.includes('bengali') || aName.includes('bangla');
      const isBanglaB = bName.includes('bengali') || bName.includes('bangla');
      if (isBanglaA && !isBanglaB) return -1;
      if (!isBanglaA && isBanglaB) return 1;
      const isSportsA = aName.includes('sport');
      const isSportsB = bName.includes('sport');
      if (isSportsA && !isSportsB) return -1;
      if (!isSportsA && isSportsB) return 1;
      const isIslamicA = aName.includes('islam');
      const isIslamicB = bName.includes('islam');
      if (isIslamicA && !isIslamicB) return -1;
      if (!isIslamicA && isIslamicB) return 1;
      return (b.count || 0) - (a.count || 0);
    });

    // Store in memory & IndexedDB
    inMemoryChannels = channels;
    inMemoryCategories = categories;
    await saveChannelsToIndexedDB(channels, categories);

    // Save lightweight summary to localStorage safely
    try {
      localStorage.setItem('shop_iptv_active_source', account.id);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CHANNELS, JSON.stringify(channels.slice(0, 150)));
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories.slice(0, 50)));
    } catch (e) {
      console.warn('Local storage quota reached, channels stored in IndexedDB & Memory');
    }

    return {
      success: true,
      categories,
      channels,
    };
  } catch (err: any) {
    console.error('Xtream Content Sync Error:', err);
    return {
      success: false,
      categories: DEFAULT_IPTV_CATEGORIES,
      channels: DEFAULT_IPTV_CHANNELS,
      error: err?.message || 'চ্যানেল ও ক্যাটাগরি লোড করতে সমস্যা হয়েছে',
    };
  }
}

// 7. Auto Fetch Live Bundle from Backend Server
export async function fetchAndCacheLiveBundle(force = false): Promise<{
  success: boolean;
  categories: IptvCategory[];
  channels: IptvChannel[];
}> {
  try {
    const res = await fetch(`/api/iptv/live-bundle${force ? '?force=true' : ''}`);
    if (!res.ok) {
      return {
        success: false,
        categories: inMemoryCategories.length > 0 ? inMemoryCategories : DEFAULT_IPTV_CATEGORIES,
        channels: inMemoryChannels.length > 0 ? inMemoryChannels : DEFAULT_IPTV_CHANNELS,
      };
    }
    const json = await res.json();
    if (json.success && Array.isArray(json.channels) && json.channels.length > 0) {
      inMemoryChannels = json.channels;
      inMemoryCategories = json.categories || [];
      await saveChannelsToIndexedDB(json.channels, json.categories);
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_CHANNELS, JSON.stringify(json.channels.slice(0, 150)));
        localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify((json.categories || []).slice(0, 50)));
      } catch (e) {}

      return {
        success: true,
        categories: inMemoryCategories,
        channels: inMemoryChannels,
      };
    }
  } catch (e) {
    console.warn('Could not load live bundle from server:', e);
  }

  return {
    success: false,
    categories: inMemoryCategories.length > 0 ? inMemoryCategories : DEFAULT_IPTV_CATEGORIES,
    channels: inMemoryChannels.length > 0 ? inMemoryChannels : DEFAULT_IPTV_CHANNELS,
  };
}

// Helper to load channels from IndexedDB on startup
export function loadChannelsFromIndexedDB(): Promise<{
  categories: IptvCategory[];
  channels: IptvChannel[];
} | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open('UltraXC_IPTV_DB', 2);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          if (!db.objectStoreNames.contains('channels') || !db.objectStoreNames.contains('categories')) {
            resolve(null);
            return;
          }
          const tx = db.transaction(['channels', 'categories'], 'readonly');
          const chanStore = tx.objectStore('channels');
          const catStore = tx.objectStore('categories');

          const chanReq = chanStore.getAll();
          const catReq = catStore.getAll();

          let chanResult: IptvChannel[] = [];
          let catResult: IptvCategory[] = [];

          chanReq.onsuccess = () => {
            chanResult = chanReq.result || [];
          };
          catReq.onsuccess = () => {
            catResult = catReq.result || [];
          };

          tx.oncomplete = () => {
            if (chanResult.length > 0) {
              inMemoryChannels = chanResult;
              inMemoryCategories = catResult;
              resolve({ channels: chanResult, categories: catResult });
            } else {
              resolve(null);
            }
          };
          tx.onerror = () => resolve(null);
        } catch (txErr) {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

// 8. Get All Available Channels (Merges Default with Xtream/M3U + Favorites)
export function getAllAvailableChannels(activeSource = 'default'): {
  categories: IptvCategory[];
  channels: IptvChannel[];
} {
  const favIds = getFavoriteChannelIds();

  // 1. If memory has synced channels, return them
  if (inMemoryChannels.length > 0) {
    const enriched = inMemoryChannels.map((c) => ({
      ...c,
      isFavorite: favIds.includes(c.id),
    }));
    return { categories: inMemoryCategories, channels: enriched };
  }

  // 2. Try custom cached channels from localStorage
  try {
    const customChanRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CHANNELS);
    const customCatRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);

    if (customChanRaw && customCatRaw) {
      const parsedChans: IptvChannel[] = JSON.parse(customChanRaw);
      const parsedCats: IptvCategory[] = JSON.parse(customCatRaw);

      if (parsedChans.length > 0) {
        const enriched = parsedChans.map((c) => ({
          ...c,
          isFavorite: favIds.includes(c.id),
        }));
        return { categories: parsedCats, channels: enriched };
      }
    }
  } catch (e) {
    // fallback
  }

  // 3. Default rich channels
  const channels = DEFAULT_IPTV_CHANNELS.map((c) => ({
    ...c,
    isFavorite: favIds.includes(c.id),
  }));

  return {
    categories: DEFAULT_IPTV_CATEGORIES,
    channels,
  };
}
