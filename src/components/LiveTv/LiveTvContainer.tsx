import React, { useState, useEffect, useCallback } from 'react';
import { IptvCategory, IptvChannel, IptvContentType } from '../../types';
import { getAllAvailableChannels, addRecentChannel, fetchAndCacheLiveBundle, loadChannelsFromIndexedDB } from '../../utils/iptvStorage';
import { UltraXcDashboard } from './UltraXcDashboard';
import { LiveTvExplorer } from './LiveTvExplorer';
import { MultiScreenPlayer } from './MultiScreenPlayer';
import { MoviesVodExplorer } from './MoviesVodExplorer';
import { SpeedTestWidget } from './SpeedTestWidget';
import { XtreamAdminModal } from './XtreamAdminModal';
import { useShopAuth } from '../../context/ShopAuthContext';

export const LiveTvContainer: React.FC = () => {
  const { isSuperAdmin } = useShopAuth();
  const [currentView, setCurrentView] = useState<IptvContentType | 'dashboard'>('dashboard');
  const [categories, setCategories] = useState<IptvCategory[]>([]);
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IptvChannel | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);

  // Load channels on mount and auto-sync default Xtream bundle
  const refreshChannels = useCallback(async () => {
    // 1. Instant load from memory / IndexedDB
    const initialData = getAllAvailableChannels();
    setCategories(initialData.categories);
    setChannels(initialData.channels);
    if (!activeChannel && initialData.channels.length > 0) {
      setActiveChannel(initialData.channels[0]);
    }

    // 2. Try fast IndexedDB load if memory only had default sample
    if (initialData.channels.length < 50) {
      const idbData = await loadChannelsFromIndexedDB();
      if (idbData && idbData.channels.length > 0) {
        setCategories(idbData.categories);
        setChannels(idbData.channels);
        if (!activeChannel) setActiveChannel(idbData.channels[0]);
      }
    }

    // 3. Auto sync full Xtream live bundle in background if not already loaded with 1000+ channels
    if (initialData.channels.length < 1000) {
      setIsInitialLoading(true);
      try {
        const bundle = await fetchAndCacheLiveBundle();
        if (bundle.success && bundle.channels.length > 0) {
          setCategories(bundle.categories);
          setChannels(bundle.channels);
          if (!activeChannel) {
            setActiveChannel(bundle.channels[0]);
          }
        }
      } catch (err) {
        console.warn('Auto bundle sync fallback:', err);
      } finally {
        setIsInitialLoading(false);
      }
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
          onOpenAdminModal={() => {
            if (isSuperAdmin) setIsAdminModalOpen(true);
          }}
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
          onOpenAdminModal={() => {
            if (isSuperAdmin) setIsAdminModalOpen(true);
          }}
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
              সার্ভার: <span className="text-slate-200 font-mono">http://rgkkw.live:80</span> • অ্যাকাউন্ট স্ট্যাটাস: <span className="text-emerald-400 font-bold">সক্রিয় (Active)</span>
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                হোমপেজে ফিরুন
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Xtream API কনফিগার করুন (Super Admin)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Xtream / M3U Modal - only rendered/accessible for Super Admin */}
      {isSuperAdmin && (
        <XtreamAdminModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onPlaylistUpdated={() => {
            refreshChannels();
            setIsAdminModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
