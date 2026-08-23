import React from 'react';
import { ActiveTool } from '../types';
import { useShopAuth } from '../context/ShopAuthContext';
import { 
  Home, 
  Store, 
  ShieldCheck, 
  User, 
  Plus, 
  Menu, 
  ChevronDown,
  Sparkles,
  Key
} from 'lucide-react';

interface HeaderProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  onResetTask?: () => void;
  onToggleMobileSidebar?: () => void;
  onOpenLoginModal: (tab?: 'shop_login' | 'admin_login' | 'profile') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  setActiveTool,
  onResetTask,
  onToggleMobileSidebar,
  onOpenLoginModal,
}) => {
  const { currentProfile, isLoggedIn, isSuperAdmin } = useShopAuth();

  const toolTitles: Record<ActiveTool, { title: string; subtitle: string; tag: string }> = {
    home: {
      title: 'হোমপেজ ও টুলস ড্যাশবোর্ড',
      subtitle: 'দোকানের সকল সার্ভিস ও ফটো স্টুডিও টুলকিট',
      tag: 'ALL TOOLS READY',
    },
    voter_search: {
      title: 'Advance NID Data Finder (ভোটার ও NID সার্চ)',
      subtitle: 'জেলা ও সংসদীয় আসন অনুযায়ী নাম, পিতা, মাতা, জন্ম তারিখ বা ভোটার নং দিয়ে যাচাই',
      tag: 'FAST SEARCH ON',
    },
    nid: {
      title: 'এনআইডি সার্ভিস (NID Crop & Join)',
      subtitle: 'স্মার্ট কার্ড ও সাধারণ এনআইডি ক্রপ, ফিল্টার ও জয়েনিং',
      tag: 'AUTO-MODE ON',
    },
    bg_remover: {
      title: 'পাসপোর্ট ছবি ও ব্যাকগ্রাউন্ড স্টুডিও (Passport Studio)',
      subtitle: 'এক-ক্লিকে ব্যাকগ্রাউন্ড পরিবর্তন ও ৩০০ DPI পাসপোর্ট সাইজ',
      tag: 'STUDIO READY',
    },
    joint_photo: {
      title: 'যৌথ পাসপোর্ট ফটো মেকার (Joint Couple Photo)',
      subtitle: 'কাবিননামা ও ব্যাংকের জন্য বর-কনের যৌথ ছবি',
      tag: 'ALIGN GUIDES ON',
    },
    print_sheet: {
      title: 'মাল্টি-ফটো প্রিন্ট শিট জেনারেটর (4R & A4 Sheet)',
      subtitle: '৪ পাসপোর্ট + ৪ স্ট্যাম্প কম্বো প্রিন্ট লেআউট',
      tag: '4R & A4 READY',
    },
    job_resizer: {
      title: 'চাকরি আবেদন ফটো ও স্বাক্ষর রিসাইজার (Job Application)',
      subtitle: '৩০০×৩০০ px ছবি ও ৩০০×৮০ px স্বাক্ষর (Teletalk/Govt)',
      tag: 'GOVT FORMAT',
    },
    quick_doc: {
      title: 'কম্পিউটার দোকান ক্যাশ মেমো ও সরকারি আবেদন (Receipt & Docs)',
      subtitle: 'মানি রিসিট ও NID সংশোধন আবেদন ফরম প্রিন্টার',
      tag: 'INSTANT PRINT',
    },
  };

  const current = toolTitles[activeTool] || toolTitles.home;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-xs">
      {/* Left side: Navigation / Tool Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Quick Home Button */}
        {activeTool !== 'home' && (
          <button
            onClick={() => setActiveTool('home')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shrink-0 transition"
            title="হোমপেজে ফিরে যান"
          >
            <Home className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">হোমপেজ</span>
          </button>
        )}

        <div className="flex items-center gap-2 truncate">
          <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
            {current.title}
          </span>
          <span className="hidden lg:inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold tracking-wide font-mono shrink-0">
            {current.tag}
          </span>
        </div>
      </div>

      {/* Right side: Shop Login & Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* User / Shop Login Badge */}
        {isLoggedIn ? (
          <button
            onClick={() => onOpenLoginModal('profile')}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs max-w-[200px] sm:max-w-xs"
            title="দোকানের নাম ও তথ্য পরিবর্তন করুন"
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 ${
              isSuperAdmin ? 'bg-amber-600' : 'bg-blue-600'
            }`}>
              {isSuperAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
            </div>
            <div className="text-left truncate hidden sm:block">
              <span className="block text-xs font-bold text-slate-900 truncate leading-tight">
                {currentProfile.shopName}
              </span>
              <span className="block text-[10px] text-slate-500 font-normal truncate">
                {isSuperAdmin ? '👑 সুপার এডমিন' : currentProfile.ownerName}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenLoginModal('shop_login')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95"
            >
              <Store className="w-3.5 h-3.5" />
              <span>দোকান লগইন</span>
            </button>

            <button
              onClick={() => onOpenLoginModal('admin_login')}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition"
              title="এডমিন লগইন"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>এডমিন</span>
            </button>
          </div>
        )}

        {/* New Task / Reset */}
        {activeTool !== 'home' && (
          <button
            onClick={onResetTask || (() => setActiveTool('home'))}
            className="inline-flex items-center gap-1 bg-slate-800 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-900 shadow-xs transition active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">নতুন কাজ</span>
          </button>
        )}
      </div>
    </header>
  );
};
