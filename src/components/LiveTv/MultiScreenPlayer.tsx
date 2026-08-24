import React, { useState } from 'react';
import { 
  Grid, 
  ChevronLeft, 
  Plus, 
  X, 
  Tv, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Layers
} from 'lucide-react';
import { IptvChannel } from '../../types';
import { VideoPlayer } from './VideoPlayer';

interface MultiScreenPlayerProps {
  channels: IptvChannel[];
  onBack: () => void;
}

export const MultiScreenPlayer: React.FC<MultiScreenPlayerProps> = ({ channels, onBack }) => {
  const [layoutMode, setLayoutMode] = useState<'2x' | '4x'>('2x');

  // Multi-screen slots
  const [slot1, setSlot1] = useState<IptvChannel | null>(channels[0] || null);
  const [slot2, setSlot2] = useState<IptvChannel | null>(channels[1] || null);
  const [slot3, setSlot3] = useState<IptvChannel | null>(channels[2] || null);
  const [slot4, setSlot4] = useState<IptvChannel | null>(channels[3] || null);

  const [activeSlotPicker, setActiveSlotPicker] = useState<1 | 2 | 3 | 4 | null>(null);

  const handleSelectChannelForSlot = (channel: IptvChannel) => {
    if (activeSlotPicker === 1) setSlot1(channel);
    if (activeSlotPicker === 2) setSlot2(channel);
    if (activeSlotPicker === 3) setSlot3(channel);
    if (activeSlotPicker === 4) setSlot4(channel);
    setActiveSlotPicker(null);
  };

  const renderSlot = (slotNum: 1 | 2 | 3 | 4, channel: IptvChannel | null) => {
    return (
      <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between group shadow-xl">
        {channel ? (
          <div className="relative w-full h-full flex flex-col">
            <div className="flex-1 min-h-[200px]">
              <VideoPlayer channel={channel} autoPlay={true} />
            </div>
            <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate">
                {channel.name}
              </span>
              <button
                onClick={() => setActiveSlotPicker(slotNum)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold transition"
              >
                চ্যানেল বদলান
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setActiveSlotPicker(slotNum)}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-900/40 transition space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">স্ক্রিন {slotNum}: চ্যানেল যোগ করুন</p>
              <p className="text-[10px] text-slate-400">ক্লিক করে চ্যানেল পছন্দ করুন</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[85vh] bg-slate-950 text-white rounded-3xl p-3 sm:p-5 border border-slate-800 shadow-2xl space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>হোমে ফিরুন</span>
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-emerald-400" />
              <span>মাল্টি-স্ক্রিন লাইভ টিভি মনিটরিং</span>
            </h2>
            <p className="text-[11px] text-slate-400">একসাথে একাধিক চ্যানেল লাইভ দেখুন</p>
          </div>
        </div>

        {/* Layout Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs font-bold">
          <button
            onClick={() => setLayoutMode('2x')}
            className={`px-3 py-1.5 rounded-lg transition ${
              layoutMode === '2x' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            ২-স্ক্রিন (Dual View)
          </button>
          <button
            onClick={() => setLayoutMode('4x')}
            className={`px-3 py-1.5 rounded-lg transition ${
              layoutMode === '4x' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            ৪-স্ক্রিন (Quad 4x4)
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div
        className={`grid gap-4 ${
          layoutMode === '2x' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {renderSlot(1, slot1)}
        {renderSlot(2, slot2)}
        {layoutMode === '4x' && (
          <>
            {renderSlot(3, slot3)}
            {renderSlot(4, slot4)}
          </>
        )}
      </div>

      {/* Channel Picker Modal */}
      {activeSlotPicker !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                স্ক্রিন {activeSlotPicker} এর জন্য চ্যানেল নির্বাচন করুন
              </h3>
              <button
                onClick={() => setActiveSlotPicker(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => handleSelectChannelForSlot(ch)}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{ch.name}</h4>
                      <p className="text-[10px] text-slate-400">{ch.categoryName || 'General'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono">
                    CH {ch.num || '01'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
