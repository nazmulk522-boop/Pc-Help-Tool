import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Tv, 
  Key, 
  Globe, 
  User, 
  Lock, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Server, 
  Database, 
  RefreshCw, 
  Layers,
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { XtreamAccount, M3uPlaylist } from '../../types';
import { 
  authenticateXtreamCodes, 
  syncXtreamContent, 
  parseM3uContent, 
  saveM3uPlaylist, 
  getSavedXtreamAccounts, 
  getSavedM3uPlaylists, 
  deleteXtreamAccount, 
  deleteM3uPlaylist 
} from '../../utils/iptvStorage';
import { useShopAuth } from '../../context/ShopAuthContext';

interface XtreamAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistUpdated: () => void;
}

export const XtreamAdminModal: React.FC<XtreamAdminModalProps> = ({
  isOpen,
  onClose,
  onPlaylistUpdated,
}) => {
  const { isSuperAdmin, verifyAdminPassword } = useShopAuth();

  const [activeTab, setActiveTab] = useState<'xtream' | 'm3u_url' | 'm3u_file' | 'accounts'>('xtream');

  // Xtream Form State
  const [serverUrl, setServerUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  
  // M3U URL Form State
  const [m3uUrl, setM3uUrl] = useState<string>('');
  const [m3uName, setM3uName] = useState<string>('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Verification Gate (if user is not superadmin logged in yet)
  const [adminPass, setAdminPass] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(isSuperAdmin);

  if (!isOpen) return null;

  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(adminPass)) {
      setIsUnlocked(true);
      setFeedback(null);
    } else {
      setFeedback({
        type: 'error',
        message: 'ভুল এডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে আনলক করুন।',
      });
    }
  };

  // 1. Xtream Codes Login & Sync
  const handleXtreamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      if (!serverUrl || !username || !password) {
        setFeedback({ type: 'error', message: 'সার্ভার ইউআরএল, ইউজারনেম ও পাসওয়ার্ড পূরণ করুন।' });
        setIsLoading(false);
        return;
      }

      // Authenticate
      const authRes = await authenticateXtreamCodes(serverUrl, username, password);
      if (!authRes.success || !authRes.account) {
        setFeedback({ type: 'error', message: authRes.error || 'লগইন ব্যর্থ হয়েছে।' });
        setIsLoading(false);
        return;
      }

      // Sync Channels & Categories
      const syncRes = await syncXtreamContent(authRes.account);
      if (!syncRes.success) {
        setFeedback({
          type: 'error',
          message: `সার্ভার কানেক্ট হয়েছে কিন্তু চ্যানেল লোড করা যায়নি: ${syncRes.error}`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `সফলভাবে Xtream সার্ভার সংযুক্ত হয়েছে! (${syncRes.channels.length} টি লাইভ চ্যানেল লোড হয়েছে)`,
        });
        onPlaylistUpdated();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'কানেকশন ত্রুটি' });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. M3U URL Fetch & Parse
  const handleM3uUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      if (!m3uUrl) {
        setFeedback({ type: 'error', message: 'M3U প্লেলিস্ট URL প্রদান করুন।' });
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/iptv/fetch-m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: m3uUrl }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', message: json.error || 'প্লেলিস্ট ডাউনলোড করা যায়নি।' });
        setIsLoading(false);
        return;
      }

      const { categories, channels } = parseM3uContent(json.content, m3uName || 'M3U Playlist');
      
      const playlistObj: M3uPlaylist = {
        id: `m3u_${Date.now()}`,
        name: m3uName || 'Custom M3U Playlist',
        url: m3uUrl,
        channelCount: channels.length,
        lastUpdated: new Date().toISOString(),
        isDefault: true,
      };

      saveM3uPlaylist(playlistObj);
      localStorage.setItem('shop_iptv_custom_channels', JSON.stringify(channels.slice(0, 500)));
      localStorage.setItem('shop_iptv_custom_categories', JSON.stringify(categories));

      setFeedback({
        type: 'success',
        message: `প্লেলিস্ট সফলভাবে সংরক্ষিত হয়েছে! মোট ${channels.length} টি চ্যানেল যুক্ত হয়েছে।`,
      });
      onPlaylistUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'প্লেলিস্ট প্রসেসিং এরর' });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. File Upload (.m3u / .m3u8 / .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setFeedback({ type: 'error', message: 'ফাইলটি খালি।' });
          setIsLoading(false);
          return;
        }

        const { categories, channels } = parseM3uContent(text, file.name);

        const playlistObj: M3uPlaylist = {
          id: `m3u_file_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          channelCount: channels.length,
          lastUpdated: new Date().toISOString(),
          isDefault: true,
        };

        saveM3uPlaylist(playlistObj);
        localStorage.setItem('shop_iptv_custom_channels', JSON.stringify(channels.slice(0, 500)));
        localStorage.setItem('shop_iptv_custom_categories', JSON.stringify(categories));

        setFeedback({
          type: 'success',
          message: `ফাইল থেকে সফলভাবে ${channels.length} টি চ্যানেল লোড হয়েছে!`,
        });
        onPlaylistUpdated();
      } catch (err: any) {
        setFeedback({ type: 'error', message: 'ফাইল পার্স করতে সমস্যা হয়েছে।' });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const savedAccounts = getSavedXtreamAccounts();
  const savedPlaylists = getSavedM3uPlaylists();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl text-white shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Xtream Codes API & M3U প্লেলিস্ট ম্যানেজার
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Xtream API বা M3U লিঙ্ক কনফিগার করলে সাধারণ ইউজাররা সরাসরি টিভি দেখতে পারবে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Gate Check */}
        {!isUnlocked ? (
          <form onSubmit={handleAdminUnlock} className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">সুপার এডমিন ভেরিফিকেশন</h4>
              <p className="text-xs text-slate-300 mt-1">
                IPTV / Xtream API এবং M3U সার্ভার কনফিগারেশন পরিবর্তন করতে এডমিন পাসওয়ার্ড প্রদান করুন।
              </p>
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <input
                type="password"
                required
                autoFocus
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="এডমিন পাসওয়ার্ড (যেমন: admin123)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 text-center"
              />
              <button
                type="submit"
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-950"
              >
                আনলক ও কনফিগার করুন
              </button>
            </div>
            {feedback && (
              <p className="text-xs text-rose-400 font-medium">{feedback.message}</p>
            )}
          </form>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('xtream');
                  setFeedback(null);
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'xtream'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Xtream Codes API
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('m3u_url');
                  setFeedback(null);
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'm3u_url'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                M3U URL লিঙ্ক
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('m3u_file');
                  setFeedback(null);
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'm3u_file'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                M3U ফাইল আপলোড
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('accounts');
                  setFeedback(null);
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                  activeTab === 'accounts'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>অ্যাকাউন্টস</span>
                <span className="text-[10px] px-1 bg-slate-800 rounded">
                  {savedAccounts.length + savedPlaylists.length}
                </span>
              </button>
            </div>

            {/* Tab 1: Xtream Codes API Login */}
            {activeTab === 'xtream' && (
              <form onSubmit={handleXtreamSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>সার্ভার হোস্ট / পোর্ট URL (Server URL / Host:Port)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://example-iptv.com:8080 বা https://..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ইউজারনেম (Username)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Xtream Username"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>পাসওয়ার্ড (Password)</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Xtream Password"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setServerUrl('http://rgkkw.live:80');
                      setUsername('1Aoen7elp5');
                      setPassword('IgMJ60tmAa');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>টেস্ট ক্রেডেনশিয়ালস পূরণ করুন (rgkkw.live)</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Xtream সার্ভারে কানেক্ট ও সিঙ্ক হচ্ছে (১১,৪০০+ চ্যানেল)...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xtream API লগইন ও চ্যানেল লোড করুন</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Tab 2: M3U URL */}
            {activeTab === 'm3u_url' && (
              <form onSubmit={handleM3uUrlSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    প্লেলিস্টের নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={m3uName}
                    onChange={(e) => setM3uName(e.target.value)}
                    placeholder="যেমন: My BD IPTV / Global Sports"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>M3U / M3U8 প্লেলিস্ট URL লিঙ্ক</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="https://example.com/playlist.m3u বা http://..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>প্লেলিস্ট ডাউনলোড হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>M3U প্লেলিস্ট লোড ও সেভ করুন</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Tab 3: M3U File Upload */}
            {activeTab === 'm3u_file' && (
              <div className="space-y-3 text-center">
                <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition block">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      .m3u বা .m3u8 প্লেলিস্ট ফাইল নির্বাচন করুন
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ফাইলটি ড্রপ করুন অথবা ক্লিক করে আপলোড করুন
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".m3u,.m3u8,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Tab 4: Saved Accounts & Reset */}
            {activeTab === 'accounts' && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {savedAccounts.length === 0 && savedPlaylists.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                    <p>কোনো কাস্টম Xtream অ্যাকাউন্ট বা M3U লিঙ্ক যুক্ত নেই।</p>
                    <p className="text-[11px] text-cyan-400">
                      বর্তমানে ডিফল্ট ফ্রি প্রি-বিল্ট চ্যানেলগুলো চালু রয়েছে।
                    </p>
                  </div>
                ) : (
                  <>
                    {savedAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{acc.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                              Xtream
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                            {acc.serverUrl} • ইউজার: {acc.username} • মেয়াদ: {acc.expDate || 'Active'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              deleteXtreamAccount(acc.id);
                              onPlaylistUpdated();
                            }}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {savedPlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{pl.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-700/60">
                              M3U ({pl.channelCount} চ্যানেল)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            আপডেট: {new Date(pl.lastUpdated).toLocaleDateString('bn-BD')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            deleteM3uPlaylist(pl.id);
                            onPlaylistUpdated();
                          }}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition shrink-0"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {/* Reset to default button */}
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('shop_iptv_custom_channels');
                    localStorage.removeItem('shop_iptv_custom_categories');
                    onPlaylistUpdated();
                    setFeedback({
                      type: 'success',
                      message: 'ডিফল্ট ফ্রি চ্যানেলে সফলভাবে রিসেট করা হয়েছে।',
                    });
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ডিফল্ট ফ্রি চ্যানেল তালিকায় রিসেট করুন</span>
                </button>
              </div>
            )}

            {/* Feedback message banner */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-700 text-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium">{feedback.message}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
