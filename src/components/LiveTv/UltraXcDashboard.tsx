import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Film, 
  Clapperboard, 
  Grid, 
  Calendar, 
  History, 
  Zap, 
  User, 
  Settings, 
  Star, 
  Play, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Wifi, 
  Radio, 
  ChevronRight, 
  Flame, 
  Eye,
  Search,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { IptvCategory, IptvChannel, IptvContentType, XtreamAccount } from '../../types';
import { getSavedXtreamAccounts, getSavedM3uPlaylists, getFavoriteChannelIds, getRecentChannels } from '../../utils/iptvStorage';
import { useShopAuth } from '../../context/ShopAuthContext';

interface UltraXcDashboardProps {
  onNavigate: (view: IptvContentType) => void;
  onPlayChannel: (channel: IptvChannel) => void;
  onOpenAdminModal: () => void;
  channels: IptvChannel[];
  categories: IptvCategory[];
}

export const UltraXcDashboard: React.FC<UltraXcDashboardProps> = ({
  onNavigate,
  onPlayChannel,
  onOpenAdminModal,
  channels,
  categories,
}) => {
  const { isSuperAdmin, currentProfile } = useShopAuth();

  // Clock State
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [activeAccount, setActiveAccount] = useState<XtreamAccount | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('bn-BD', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const accounts = getSavedXtreamAccounts();
    if (accounts.length > 0) {
      setActiveAccount(accounts[0]);
    }
  }, []);

  const favoriteIds = getFavoriteChannelIds();
  const favoriteChannels = channels.filter((c) => favoriteIds.includes(c.id));
  const recentChannels = getRecentChannels();

  // Top Tile Cards definition matching Ultra XC Player Archetype
  const mainTiles = [
    {
      id: 'live' as IptvContentType,
      title: 'LIVE TV',
      titleBn: 'লাইভ টিভি',
      subtitle: `${channels.length} টি চ্যানেল সক্রিয়`,
      icon: Tv,
      bgGradient: 'from-blue-600 via-indigo-600 to-cyan-500',
      shadowColor: 'shadow-cyan-900/40',
      badge: 'LIVE ON',
      badgeColor: 'bg-rose-500 text-white',
      accentColor: 'text-cyan-300',
    },
    {
      id: 'vod' as IptvContentType,
      title: 'MOVIES (VOD)',
      titleBn: 'মুভিজ ও সিনেমা',
      subtitle: 'HD ও 4K সিনেমা কালেকশন',
      icon: Film,
      bgGradient: 'from-purple-700 via-pink-700 to-rose-600',
      shadowColor: 'shadow-pink-900/40',
      badge: 'CINEMA',
      badgeColor: 'bg-pink-500 text-white',
      accentColor: 'text-pink-300',
    },
    {
      id: 'series' as IptvContentType,
      title: 'SERIES',
      titleBn: 'টিভি সিরিজ',
      subtitle: 'সকল সিজন ও এপিসোড',
      icon: Clapperboard,
      bgGradient: 'from-amber-600 via-orange-600 to-rose-600',
      shadowColor: 'shadow-orange-900/40',
      badge: 'SEASONS',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      accentColor: 'text-amber-300',
    },
    {
      id: 'multiscreen' as IptvContentType,
      title: 'MULTI-SCREEN',
      titleBn: 'মাল্টি-স্ক্রিন মোড',
      subtitle: 'একসাথে ২ বা ৪টি চ্যানেল দেখুন',
      icon: Grid,
      bgGradient: 'from-emerald-700 via-teal-700 to-cyan-600',
      shadowColor: 'shadow-emerald-900/40',
      badge: '2x & 4x',
      badgeColor: 'bg-emerald-400 text-slate-950 font-bold',
      accentColor: 'text-emerald-300',
    },
  ];

  const secondaryTiles = [
    {
      id: 'epg' as IptvContentType,
      title: 'TV GUIDE (EPG)',
      titleBn: 'টিভি গাইড ও সময়সূচি',
      icon: Calendar,
      bg: 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50',
      iconColor: 'text-cyan-400',
    },
    {
      id: 'catchup' as IptvContentType,
      title: 'CATCH UP / REPLAY',
      titleBn: 'পূর্বের সম্প্রচার রিপ্লে',
      icon: History,
      bg: 'bg-slate-900/80 border-slate-800 hover:border-purple-500/50',
      iconColor: 'text-purple-400',
    },
    {
      id: 'speedtest' as IptvContentType,
      title: 'SPEED TEST & HEALTH',
      titleBn: 'স্ট্রিম স্পিড ও বাফার টেস্ট',
      icon: Zap,
      bg: 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50',
      iconColor: 'text-amber-400',
    },
    {
      id: 'account' as IptvContentType,
      title: 'ACCOUNT INFO',
      titleBn: 'সার্ভার ও সাবস্ক্রিপশন তথ্য',
      icon: User,
      bg: 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50',
      iconColor: 'text-emerald-400',
    },
  ];

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-slate-950 text-white rounded-3xl p-4 sm:p-7 border border-slate-800/80 shadow-2xl space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Ultra XC Brand & Live Clock Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md">
        {/* Left: App Brand & Active Server */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Tv className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                <span>ULTRA</span>
                <span className="text-cyan-400">XC</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono font-bold">
                  PRO IPTV
                </span>
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>সার্ভার:</span>
              <strong className="text-slate-200 font-medium">
                {activeAccount ? activeAccount.serverUrl : 'বিল্ট-ইন ফ্রি লাইভ স্ট্রিমস'}
              </strong>
              {activeAccount?.expDate && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                  মেয়াদ: {activeAccount.expDate}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Live Digital Clock & Admin Settings Button */}
        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4">
          <div className="text-right">
            <div className="text-lg sm:text-2xl font-black font-mono tracking-wider text-cyan-300 drop-shadow-sm flex items-center gap-1.5 justify-end">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{timeStr || '--:--:--'}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {dateStr || 'আজকের দিন'}
            </div>
          </div>

          <button
            onClick={onOpenAdminModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95 shrink-0"
            title="Xtream Codes API ও M3U প্লেলিস্ট কনফিগার করুন"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Xtream / M3U API</span>
            <span className="sm:hidden">সেটিংস</span>
          </button>
        </div>
      </div>

      {/* Main 4 Hero Tiles Grid (LIVE TV, MOVIES, SERIES, MULTI-SCREEN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {mainTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.id}
              onClick={() => onNavigate(tile.id)}
              className={`group relative rounded-3xl p-6 bg-gradient-to-br ${tile.bgGradient} ${tile.shadowColor} shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[190px] border border-white/10 hover:scale-[1.02] active:scale-[0.98]`}
            >
              {/* Background Glass Overlay & Radial Glow */}
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-500" />

              {/* Card Header: Icon & Live Badge */}
              <div className="flex items-start justify-between relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:rotate-3 transition-transform">
                  <Icon className="w-8 h-8 drop-shadow-md" />
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm ${tile.badgeColor}`}
                >
                  {tile.badge}
                </span>
              </div>

              {/* Card Title & Subtitle */}
              <div className="space-y-1 relative z-10 mt-4">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm flex items-center justify-between">
                  <span>{tile.title}</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-slate-950 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </h2>
                <p className="text-xs text-white/90 font-bold">{tile.titleBn}</p>
                <p className="text-[11px] text-white/70 font-medium">{tile.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Quick Action Bar (EPG, Catch Up, Speed Test, Account) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {secondaryTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => onNavigate(tile.id)}
              className={`p-4 rounded-2xl ${tile.bg} border transition flex items-center gap-3 text-left group active:scale-95`}
            >
              <div className={`p-2.5 rounded-xl bg-slate-950 ${tile.iconColor} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block group-hover:text-cyan-300 transition-colors truncate">
                  {tile.title}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {tile.titleBn}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Launch: Top Featured / Favorite Channels Carousel */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>জনপ্রিয় ও লাইভ চ্যানেলসমূহ (Quick Launch)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {channels.slice(0, 12).length} টি
            </span>
          </h3>

          <button
            onClick={() => onNavigate('live')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
          >
            <span>সবগুলো দেখুন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {channels.slice(0, 12).map((ch) => (
            <div
              key={ch.id}
              onClick={() => {
                onPlayChannel(ch);
                onNavigate('live');
              }}
              className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/60 p-3 rounded-2xl transition cursor-pointer flex flex-col justify-between space-y-2 hover:-translate-y-0.5 shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  CH {ch.num || '01'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-black">
                  LIVE
                </span>
              </div>

              <div className="h-12 flex items-center justify-center">
                {ch.streamIcon ? (
                  <img
                    src={ch.streamIcon}
                    alt={ch.name}
                    className="max-h-11 max-w-full object-contain filter group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Tv className="w-7 h-7 text-cyan-400" />
                )}
              </div>

              <div className="pt-1 border-t border-slate-800/60">
                <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                  {ch.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {ch.currentProgram || 'লাইভ ব্রডকাস্ট'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">
              সুপার এডমিন টিপস:
            </span>
            <span className="text-slate-300 text-[11px]">
              আপনার পেইড Xtream Codes API বা M3U লিঙ্ক যোগ করে হাই-স্পিড চ্যানেল ও VOD মুভিজ উপভোগ করুন।
            </span>
          </div>
        </div>

        <button
          onClick={onOpenAdminModal}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition border border-slate-700 shrink-0 flex items-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span>প্লেলিস্ট ম্যানেজার</span>
        </button>
      </div>
    </div>
  );
};
