import React from 'react';
import { ActiveTool } from '../types';
import { Printer, Plus, Sparkles, Menu } from 'lucide-react';

interface HeaderProps {
  activeTool: ActiveTool;
  onResetTask?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  onResetTask,
  onToggleMobileSidebar,
}) => {
  const toolTitles: Record<ActiveTool, { title: string; subtitle: string; tag: string }> = {
    voter_search: {
      title: 'Advance Nid Data Finder (ভোটার ও NID সার্চ)',
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
      subtitle: 'এক-ক্লিকে ব্যাকগ্রাউন্ড পরিবর্তন ও ৩oo DPI পাসপোর্ট সাইজ',
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

  const current = toolTitles[activeTool] || toolTitles.nid;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            {current.title}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold tracking-wide font-mono">
            {current.tag}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden sm:block text-right">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Today's Prints
          </div>
          <div className="text-xs font-bold text-slate-800 font-mono">
            ৳ ১,৪৫০.০০ <span className="text-slate-500 font-normal">(৪৫টি)</span>
          </div>
        </div>

        <button
          onClick={onResetTask || (() => window.location.reload())}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-xs transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>নতুন কাজ শুরু করুন</span>
        </button>
      </div>
    </header>
  );
};
