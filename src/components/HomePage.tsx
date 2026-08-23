import React, { useState } from 'react';
import { ActiveTool } from '../types';
import { useShopAuth } from '../context/ShopAuthContext';
import {
  Search,
  CreditCard,
  Palette,
  Users,
  Grid,
  FileCheck,
  Receipt,
  Store,
  Sparkles,
  Printer,
  ChevronRight,
  ShieldCheck,
  Edit3,
  Phone,
  MapPin,
  CheckCircle2,
  Zap,
  ArrowRight,
  Cpu,
  Layers,
  FileText
} from 'lucide-react';

interface HomePageProps {
  onSelectTool: (tool: ActiveTool) => void;
  onOpenLoginModal: (tab?: 'shop_login' | 'admin_login' | 'profile') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectTool,
  onOpenLoginModal,
}) => {
  const { currentProfile, isLoggedIn, isSuperAdmin } = useShopAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Tools Catalog Definition
  const toolsList: Array<{
    id: ActiveTool;
    titleBn: string;
    titleEn: string;
    descBn: string;
    category: 'voter' | 'studio' | 'print' | 'docs';
    categoryLabel: string;
    categoryColor: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    badge: string;
    features: string[];
  }> = [
    {
      id: 'voter_search',
      titleBn: 'Advance NID Finder (ভোটার তথ্য সার্চ)',
      titleEn: 'Smart NID & Voter Database Finder',
      descBn:
        'সংসদীয় আসন ও জেলা অনুযায়ী নাম, পিতা, মাতা, জন্ম তারিখ বা ভোটার নং দিয়ে ভোটার তথ্য যাচাই ও ভোটার স্লিপ প্রিন্ট করুন।',
      category: 'voter',
      categoryLabel: 'ভোটার ও NID',
      categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Search,
      iconBg: 'bg-blue-600',
      iconColor: 'text-white',
      badge: 'Advance Search',
      features: ['ভোটার নং ও NID সার্চ', 'আসনভিত্তিক ZIP ডাটাবেজ', 'ইনস্ট্যান্ট ভোটার স্লিপ'],
    },
    {
      id: 'nid',
      titleBn: 'এনআইডি ক্রপ ও জয়েন (NID 2-in-1)',
      titleEn: 'Dual Side NID Auto Crop & Join',
      descBn:
        'স্মার্ট কার্ড ও জাতীয় পরিচয়পত্রের সামনে ও পেছনের অংশ ১-ক্লিকে অটো ক্রপ, ফটোকপি ফিল্টার এবং এক পাতায় পাশাপাশি জয়েন করুন।',
      category: 'studio',
      categoryLabel: 'এনআইডি স্টুডিও',
      categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CreditCard,
      iconBg: 'bg-emerald-600',
      iconColor: 'text-white',
      badge: 'জনপ্রিয় টুল',
      features: ['অটো ক্রপ ও বর্ডার', 'ফটোকপি / হাই-কনট্রাস্ট', '৪R ও A4 কম্বো শিট'],
    },
    {
      id: 'bg_remover',
      titleBn: 'পাসপোর্ট ছবি ও ব্যাকগ্রাউন্ড স্টুডিও',
      titleEn: 'AI Studio Passport & BG Color',
      descBn:
        'এক ক্লিকে ছবির ব্যাকগ্রাউন্ড পরিবর্তন (বিডি স্কাই ব্লু, সাদা, রয়্যাল ব্লু), ফেস স্মুথিং এবং প্রফেশনাল পাসপোর্ট সাইজ তৈরি।',
      category: 'studio',
      categoryLabel: 'ফটো স্টুডিও',
      categoryColor: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Palette,
      iconBg: 'bg-sky-600',
      iconColor: 'text-white',
      badge: 'AI কালার স্টুডিও',
      features: ['স্কাই ব্লু / সাদা ব্যাকগ্রাউন্ড', '৩০০ DPI আল্ট্রা শার্প', 'ফেস স্কিন প্রোটেকশন'],
    },
    {
      id: 'joint_photo',
      titleBn: 'যৌথ পাসপোর্ট ফটো মেকার (Couple Photo)',
      titleEn: 'Joint Couple Passport Maker',
      descBn:
        'কাবিননামা, হজ্ব ও যৌথ ব্যাংক অ্যাকাউন্টের জন্য বর ও কনের দুটি আলাদা ছবি সহজে পাশাপাশি পারফেক্ট সাইজে যুক্ত করুন।',
      category: 'studio',
      categoryLabel: 'ফটো স্টুডিও',
      categoryColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Users,
      iconBg: 'bg-purple-600',
      iconColor: 'text-white',
      badge: 'কাবিননামা স্পেশাল',
      features: ['৫০×৪০ মিমি সাইজ', 'শোল্ডার ব্যালেন্সিং', '১-ক্লিকে ব্যাকগ্রাউন্ড ম্যাচ'],
    },
    {
      id: 'print_sheet',
      titleBn: '৪R ও A4 মাল্টি-প্রিন্ট শিট জেনারেটর',
      titleEn: '4R Multi-Print Package Grid',
      descBn:
        '৪R ফটো পেপারে ৪ পাসপোর্ট + ৪ স্ট্যাম্প সাইজ কম্বো প্যাকেজ অটো সাজিয়ে কোনো কাগজ নষ্ট না করে এক ক্লিকে প্রিন্ট দিন।',
      category: 'print',
      categoryLabel: 'প্রিন্ট প্যাকেজ',
      categoryColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Grid,
      iconBg: 'bg-indigo-600',
      iconColor: 'text-white',
      badge: '৪R ও A4 রেডি',
      features: ['৪ পাসপোর্ট + ৪ স্ট্যাম্প কম্বো', 'কাটিং মার্কার লাইন', 'এপসন ও ক্যানন রেডি'],
    },
    {
      id: 'job_resizer',
      titleBn: 'সরকারি চাকরি আবেদন ফটো ও স্বাক্ষর রিসাইজার',
      titleEn: 'Govt Job Photo & Signature Resizer',
      descBn:
        'Teletalk, BPSC ও সরকারি চাকরির অনলাইন আবেদনের জন্য ৩০০×৩০০ পিক্সেল ছবি (Max 100KB) ও ৩০০×৮০ পিক্সেল স্বাক্ষর (Max 60KB)।',
      category: 'docs',
      categoryLabel: 'অনলাইন আবেদন',
      categoryColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: FileCheck,
      iconBg: 'bg-amber-600',
      iconColor: 'text-white',
      badge: 'Teletalk ফরম্যাট',
      features: ['৩০০×৩০০ px ছবি (১০০KB)', '৩০০×৮০ px স্বাক্ষর (৬০KB)', '১-ক্লিকে ক্রপ ও সাইজ'],
    },
    {
      id: 'quick_doc',
      titleBn: 'দোকান ক্যাশ মেমো ও সরকারি আবেদন ফরম',
      titleEn: 'Cash Memo & Official Forms Printer',
      descBn:
        'কম্পিউটার দোকানের কাস্টমার বিল রিসিট, এনআইডি সংশোধন আবেদন ফরম, ভোটার তথ্য ফরম ও বায়োডাটা নিমেষেই প্রিন্ট করুন।',
      category: 'docs',
      categoryLabel: 'মেমো ও ফরম',
      categoryColor: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: Receipt,
      iconBg: 'bg-teal-600',
      iconColor: 'text-white',
      badge: 'মানি রিসিট',
      features: ['দোকানের নামে ক্যাশ মেমো', 'NID সংশোধন ফরম', 'কাস্টমার প্রিন্ট রিসিট'],
    },
  ];

  const filteredTools = toolsList.filter(
    (t) =>
      t.titleBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.descBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-10">
      {/* Clean & Elegant Shop Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left Side: Shop Name, Address & Phone */}
          <div className="space-y-3 max-w-2xl">
            {/* Big Shop Name */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              {currentProfile.shopName}
            </h1>

            {/* Address & Phone */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300 font-medium">
              {currentProfile.address && (
                <div className="flex items-center gap-1.5 text-slate-200">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{currentProfile.address}</span>
                </div>
              )}
              {currentProfile.phone && (
                <div className="flex items-center gap-1.5 font-mono text-slate-200">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{currentProfile.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Login / Shop Name Edit Button */}
          <div className="shrink-0">
            {isLoggedIn ? (
              <button
                onClick={() => onOpenLoginModal('profile')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg transition active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-amber-300" />
                <span>দোকানের নাম ও তথ্য পরিবর্তন</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenLoginModal('shop_login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg transition active:scale-95"
              >
                <Store className="w-4 h-4 text-white" />
                <span>দোকান লগইন / নাম পরিবর্তন</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tools Section Title & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span>সকল স্টুডিও ও শপ টুলকিট</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold font-mono">
              {toolsList.length}টি টুলস
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            যেকোনো টুলের উপর ক্লিক করলেই সাথে সাথে সংশ্লিষ্ট টুলটি ওপেন হবে।
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="টুলের নাম লিখে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-5 shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
            >
              <div className="space-y-3.5">
                {/* Card Top: Icon and Category Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tool.categoryColor}`}
                  >
                    {tool.badge}
                  </span>
                </div>

                {/* Title and Bangla Description */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                    {tool.titleBn}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {tool.titleEn}
                  </p>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {tool.descBn}
                  </p>
                </div>

                {/* Feature Tags List */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  {tool.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                <span className="flex items-center gap-1">
                  <span>টুল ওপেন করুন</span>
                </span>
                <div className="w-7 h-7 rounded-full bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <p className="text-slate-500 text-sm font-bold">"{searchQuery}" দিয়ে কোনো টুল পাওয়া যায়নি।</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            সবগুলো টুল দেখুন
          </button>
        </div>
      )}

      {/* Operator Workflow & Shortcut Helper Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-white">
              দোকানদার ভাইদের জন্য দ্রুত কাজের টিপস:
            </h4>
            <p className="text-[11px] text-slate-300">
              পাসপোর্ট ব্যাকগ্রাউন্ড বা NID ক্রপ করার পর সরাসরি <strong>"৪R শিটে পাঠান"</strong> বাটনে ক্লিক করলে নিমেষেই প্রিন্ট লেআউটে চলে যাবে।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
            Ctrl + P (প্রিন্ট)
          </span>
          <button
            onClick={() => onSelectTool('print_sheet')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
          >
            প্রিন্ট শিট ওপেন করুন
          </button>
        </div>
      </div>
    </div>
  );
};
