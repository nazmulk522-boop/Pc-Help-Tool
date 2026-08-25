import React from 'react';
import { 
  Home,
  Tv,
  CreditCard, 
  Palette, 
  Users, 
  Grid, 
  FileCheck, 
  Receipt, 
  Printer, 
  Search,
  ShieldCheck,
  Store,
  Sparkles,
  Upload,
  Play
} from 'lucide-react';
import { ActiveTool } from '../types';
import { useShopAuth } from '../context/ShopAuthContext';

interface SidebarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  onOpenLoginModal?: (tab?: 'shop_login' | 'admin_login' | 'profile' | 'register' | 'login') => void;
  onOpenVoterDbModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTool, 
  setActiveTool,
  onOpenLoginModal,
  onOpenVoterDbModal 
}) => {
  const { currentProfile, isLoggedIn, isSuperAdmin } = useShopAuth();

  const tvTools: Array<{
    id: ActiveTool;
    nameBn: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
  }> = [
    {
      id: 'live_tv',
      nameBn: 'লাইভ টিভি (Live TV)',
      icon: Tv,
      badge: 'Ultra XC',
      badgeColor: 'bg-rose-600 text-white font-bold animate-pulse',
    },
  ];

  const voterTools: Array<{
    id: ActiveTool;
    nameBn: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: 'voter_search',
      nameBn: 'Advance NID Finder',
      icon: Search,
      badge: 'Advance',
    },
  ];

  const imageTools: Array<{
    id: ActiveTool;
    nameBn: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: 'nid',
      nameBn: 'এনআইডি ক্রপ ও জয়েন',
      icon: CreditCard,
      badge: 'জনপ্রিয়',
    },
    {
      id: 'bg_remover',
      nameBn: 'পাসপোর্ট ছবি ও ব্যাকগ্রাউন্ড',
      icon: Palette,
      badge: 'কালার',
    },
    {
      id: 'joint_photo',
      nameBn: 'যৌথ পাসপোর্ট ছবি মেকার',
      icon: Users,
      badge: 'কাবিননামা',
    },
    {
      id: 'print_sheet',
      nameBn: '৪R ও A4 মাল্টি-প্রিন্ট শিট',
      icon: Grid,
      badge: '৪R প্যাকেজ',
    },
  ];

  const serviceTools: Array<{
    id: ActiveTool;
    nameBn: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: 'job_resizer',
      nameBn: 'চাকরি আবেদন রিসাইজার',
      icon: FileCheck,
      badge: '৩০০×৩০০ px',
    },
    {
      id: 'quick_doc',
      nameBn: 'ক্যাশ মেমো ও সরকারি ফরম',
      icon: Receipt,
      badge: 'রিসিট',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 select-none h-screen sticky top-0">
      {/* Brand Header with Dynamic Shop Name */}
      <div 
        onClick={() => onOpenLoginModal && onOpenLoginModal(isLoggedIn ? 'profile' : 'shop_login')}
        className="p-3.5 border-b border-slate-800 bg-gradient-to-r from-blue-700 to-blue-600 font-bold text-base flex items-center justify-between text-white shadow-xs cursor-pointer hover:brightness-105 transition"
        title="দোকানের নাম পরিবর্তন করতে ক্লিক করুন"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 bg-white text-blue-600 rounded-md font-black flex items-center justify-center text-xs shadow-xs shrink-0">
            {isSuperAdmin ? '👑' : '🏪'}
          </span>
          <div className="leading-tight truncate">
            <span className="text-xs font-black tracking-tight block truncate text-white">
              {currentProfile.shopName}
            </span>
            <span className="text-[10px] text-blue-100 font-normal block opacity-90 truncate">
              {isLoggedIn ? currentProfile.ownerName : 'ডিজিটাল স্টুডিও টুলকিট'}
            </span>
          </div>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-800/80 border border-blue-400/30 text-white font-mono shrink-0">
          v2.5
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-2.5 text-xs overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
        {/* Primary Home / Dashboard Link */}
        <div className="px-2 space-y-1">
          <button
            onClick={() => setActiveTool('home')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors text-xs font-bold ${
              activeTool === 'home'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-200 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Home className={`w-4 h-4 shrink-0 ${activeTool === 'home' ? 'text-white' : 'text-blue-400'}`} />
              <span>হোমপেজ (টুলস গ্যালারি)</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              activeTool === 'home' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              মেনু
            </span>
          </button>

          {/* LIVE TV Button with Vibrant Accent */}
          <button
            onClick={() => setActiveTool('live_tv')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-xs font-bold ${
              activeTool === 'live_tv'
                ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-lg shadow-rose-950/60 ring-1 ring-white/30'
                : 'bg-slate-800/60 text-slate-200 hover:bg-gradient-to-r hover:from-rose-900/40 hover:to-indigo-900/40 hover:text-white border border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Tv className={`w-4 h-4 shrink-0 ${activeTool === 'live_tv' ? 'text-white' : 'text-rose-400'}`} />
              <span className="tracking-wide">লাইভ টিভি (Live TV)</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-black uppercase tracking-wider animate-pulse">
              LIVE
            </span>
          </button>
        </div>

        {/* Section 0: Voter Hub */}
        <div>
          <div className="px-4 py-1 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
            Voter & NID Verification
          </div>
          <div className="mt-1 space-y-0.5">
            {voterTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors text-xs ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border-r-4 border-blue-500 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{tool.nameBn}</span>
                  </div>
                  {tool.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-normal shrink-0 ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700/40'
                      }`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Super Admin Direct Database Upload Link */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => onOpenVoterDbModal && onOpenVoterDbModal()}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors text-xs text-emerald-300 hover:bg-emerald-950/60 bg-emerald-950/30 border-l-2 border-emerald-500 font-medium"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Upload className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="truncate">ডাটাবেইজ ও আসন আপলোড</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ADMIN
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Image & Studio Tools */}
        <div>
          <div className="px-4 py-1 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
            Image & Studio Tools
          </div>
          <div className="mt-1 space-y-0.5">
            {imageTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors text-xs ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border-r-4 border-blue-500 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{tool.nameBn}</span>
                  </div>
                  {tool.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-normal shrink-0 ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Services & Cash Memo */}
        <div>
          <div className="px-4 py-1 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
            Services & Documents
          </div>
          <div className="mt-1 space-y-0.5">
            {serviceTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors text-xs ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border-r-4 border-blue-500 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{tool.nameBn}</span>
                  </div>
                  {tool.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-normal shrink-0 ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Profile & Shop Settings Link */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-xs">
        <button
          onClick={() => onOpenLoginModal && onOpenLoginModal(isLoggedIn ? 'profile' : 'shop_login')}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            {isSuperAdmin ? (
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Store className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="truncate font-semibold">
              {isLoggedIn ? 'দোকানের তথ্য পরিবর্তন' : 'দোকানদার লগইন'}
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 font-bold">
            {isLoggedIn ? 'এডিট' : 'লগইন'}
          </span>
        </button>
      </div>
    </aside>
  );
};
