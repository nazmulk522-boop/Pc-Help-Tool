import React from 'react';
import { 
  CreditCard, 
  Palette, 
  Users, 
  Grid, 
  FileCheck, 
  Receipt, 
  Printer, 
  Laptop,
  Layers,
  Settings,
  History,
  Sparkles,
  Scissors,
  Search,
  ShieldCheck
} from 'lucide-react';
import { ActiveTool } from '../types';

interface SidebarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTool, setActiveTool }) => {
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
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-800 bg-blue-600 font-bold text-base flex items-center justify-between text-white shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 bg-white text-blue-600 rounded-md font-black flex items-center justify-center text-xs shadow-xs">
            QC
          </span>
          <div className="leading-tight">
            <span className="text-sm font-black tracking-tight block">QuickShop Dokan</span>
            <span className="text-[10px] text-blue-100 font-normal block opacity-90">ডিজিটাল স্টুডিও টুলকিট</span>
          </div>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-700/80 border border-blue-400/30 text-white font-mono">
          v2.5
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-3 text-xs overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
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

      {/* System Status Footer */}
      <div className="p-3.5 bg-slate-950 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
        <div className="flex items-center justify-between">
          <span>Server Status:</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Printer: L805/L3110</span>
          <span className="text-emerald-400 font-medium">Connected</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-850 text-[10px] text-slate-500">
          <span>Resolution:</span>
          <span className="text-slate-300 font-mono">300 DPI High-Res</span>
        </div>
      </div>
    </aside>
  );
};
