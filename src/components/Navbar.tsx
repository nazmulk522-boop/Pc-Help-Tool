import React from 'react';
import { 
  CreditCard, 
  Palette, 
  Users, 
  Grid, 
  FileCheck, 
  Receipt, 
  Printer, 
  MonitorCheck,
  Sparkles,
  Laptop
} from 'lucide-react';
import { ActiveTool } from '../types';

interface NavbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTool, setActiveTool }) => {
  const tools: Array<{
    id: ActiveTool;
    nameBn: string;
    icon: React.ElementType;
    badge?: string;
    accentColor: string;
  }> = [
    {
      id: 'nid',
      nameBn: 'এনআইডি ক্রপ ও জয়েন',
      icon: CreditCard,
      badge: 'জনপ্রিয়',
      accentColor: 'text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'bg_remover',
      nameBn: 'ব্যাকগ্রাউন্ড রিমুভার',
      icon: Palette,
      badge: 'স্টুডিও কালার',
      accentColor: 'text-sky-400 border-sky-500/30',
    },
    {
      id: 'joint_photo',
      nameBn: 'যৌথ পাসপোর্ট ছবি',
      icon: Users,
      badge: 'কাবিননামা',
      accentColor: 'text-pink-400 border-pink-500/30',
    },
    {
      id: 'print_sheet',
      nameBn: '৪R ও A4 প্রিন্ট শিট',
      icon: Grid,
      badge: 'মাল্টি-ফটো',
      accentColor: 'text-indigo-400 border-indigo-500/30',
    },
    {
      id: 'job_resizer',
      nameBn: 'চাকরি আবেদন রিসাইজার',
      icon: FileCheck,
      badge: '৩০০×৩০০ px',
      accentColor: 'text-teal-400 border-teal-500/30',
    },
    {
      id: 'quick_doc',
      nameBn: 'মানি রিসিট ও আবেদন',
      icon: Receipt,
      badge: 'ক্যাশ মেমো',
      accentColor: 'text-amber-400 border-amber-500/30',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-900/20">
              <Laptop className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ডিজিটাল কম্পিউটার শপ টুলকিট
                </h1>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Studio v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                কম্পিউটার দোকান ও স্টুডিওর কাজের গতি বাড়াতে অল-ইন-ওয়ান সমাধান
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-850 border border-slate-800 text-[11px] text-slate-300">
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>অটো প্রিন্ট প্রিভিউ সাপোর্ট সংযুক্ত</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none pt-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tool.nameBn}</span>
                {tool.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
