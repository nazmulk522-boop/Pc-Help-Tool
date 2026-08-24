import React, { useState, useEffect, useCallback } from 'react';
import { IptvCategory, IptvChannel, IptvContentType } from '../../types';
import { getAllAvailableChannels, addRecentChannel } from '../../utils/iptvStorage';
import { UltraXcDashboard } from './UltraXcDashboard';
import { LiveTvExplorer } from './LiveTvExplorer';
import { MultiScreenPlayer } from './MultiScreenPlayer';
import { MoviesVodExplorer } from './MoviesVodExplorer';
import { SpeedTestWidget } from './SpeedTestWidget';
import { XtreamAdminModal } from './XtreamAdminModal';

export const LiveTvContainer: React.FC = () => {
  const [currentView, setCurrentView] = useState<IptvContentType | 'dashboard'>('dashboard');
  const [categories, setCategories] = useState<IptvCategory[]>([]);
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IptvChannel | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Load channels on mount
  const refreshChannels = useCallback(() => {
    const data = getAllAvailableChannels();
    setCategories(data.categories);
    setChannels(data.channels);
    if (!activeChannel && data.channels.length > 0) {
      setActiveChannel(data.channels[0]);
    }
  }, [activeChannel]);

  useEffect(() => {
    refreshChannels();
  }, [refreshChannels]);

  const handleSelectChannel = (channel: IptvChannel) => {
    setActiveChannel(channel);
    addRecentChannel(channel);
  };

  const handlePlayFromDashboard = (channel: IptvChannel) => {
    setActiveChannel(channel);
    addRecentChannel(channel);
    setCurrentView('live');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* View Switcher */}
      {currentView === 'dashboard' && (
        <UltraXcDashboard
          onNavigate={(view) => setCurrentView(view)}
          onPlayChannel={handlePlayFromDashboard}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          channels={channels}
          categories={categories}
        />
      )}

      {currentView === 'live' && (
        <LiveTvExplorer
          categories={categories}
          channels={channels}
          activeChannel={activeChannel}
          onSelectChannel={handleSelectChannel}
          onBackToDashboard={() => setCurrentView('dashboard')}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          onToggleMultiscreen={() => setCurrentView('multiscreen')}
        />
      )}

      {currentView === 'multiscreen' && (
        <MultiScreenPlayer
          channels={channels}
          onBack={() => setCurrentView('dashboard')}
        />
      )}

      {(currentView === 'vod' || currentView === 'series') && (
        <MoviesVodExplorer
          type={currentView === 'vod' ? 'vod' : 'series'}
          onBack={() => setCurrentView('dashboard')}
        />
      )}

      {currentView === 'speedtest' && (
        <SpeedTestWidget onBack={() => setCurrentView('dashboard')} />
      )}

      {(currentView === 'epg' || currentView === 'catchup' || currentView === 'account') && (
        <div className="min-h-[80vh] bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-6 text-center flex flex-col items-center justify-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-bold text-white">
              {currentView === 'epg'
                ? '📅 টিভি গাইড ও ইলেকট্রনিক প্রোগ্রাম (EPG)'
                : currentView === 'catchup'
                ? '⏪ পূর্বের সম্প্রচার রিপ্লে (Catch Up)'
                : '👤 Xtream অ্যাকাউন্ট ও সার্ভার ইনফো'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              সুপার এডমিন Xtream Codes API অথবা M3U প্লেলিস্ট সংযুক্ত থাকলে সার্ভার অনুযায়ী অটো সিঙ্ক হবে।
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
              >
                হোমপেজে ফিরুন
              </button>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl"
              >
                Xtream API কনফিগার করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Xtream / M3U Modal */}
      <XtreamAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onPlaylistUpdated={() => {
          refreshChannels();
          setIsAdminModalOpen(false);
        }}
      />
    </div>
  );
};
