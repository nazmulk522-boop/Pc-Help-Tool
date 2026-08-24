import React, { useState, useMemo } from 'react';
import { 
  Tv, 
  Search, 
  Star, 
  Flame, 
  Sparkles, 
  Globe, 
  Trophy, 
  Film, 
  Moon, 
  Smile, 
  Music, 
  ChevronLeft, 
  Settings, 
  Grid, 
  RotateCcw, 
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { IptvCategory, IptvChannel } from '../../types';
import { VideoPlayer } from './VideoPlayer';
import { getFavoriteChannelIds, toggleFavoriteChannel } from '../../utils/iptvStorage';

interface LiveTvExplorerProps {
  categories: IptvCategory[];
  channels: IptvChannel[];
  activeChannel: IptvChannel | null;
  onSelectChannel: (channel: IptvChannel) => void;
  onBackToDashboard: () => void;
  onOpenAdminModal: () => void;
  onToggleMultiscreen: () => void;
}

export const LiveTvExplorer: React.FC<LiveTvExplorerProps> = ({
  categories,
  channels,
  activeChannel,
  onSelectChannel,
  onBackToDashboard,
  onOpenAdminModal,
  onToggleMultiscreen,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [favoritesList, setFavoritesList] = useState<string[]>(getFavoriteChannelIds());

  // Category Icon Resolver
  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'bangla_news':
        return Flame;
      case 'bangla_ent':
        return Film;
      case 'sports':
        return Trophy;
      case 'intl_news':
        return Globe;
      case 'islamic':
        return Moon;
      case 'kids':
        return Smile;
      case 'nature_4k':
        return Sparkles;
      case 'music':
        return Music;
      default:
        return Tv;
    }
  };

  // Filter channels
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      // Favorites filter
      if (onlyFavorites && !favoritesList.includes(channel.id)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && channel.categoryId !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = channel.name.toLowerCase().includes(q);
        const matchCat = channel.categoryName?.toLowerCase().includes(q);
        const matchNum = channel.num?.toString().includes(q);
        return matchName || matchCat || matchNum;
      }

      return true;
    });
  }, [channels, selectedCategory, searchQuery, onlyFavorites, favoritesList]);

  // Current playing channel fallback
  const currentChannel = activeChannel || (filteredChannels.length > 0 ? filteredChannels[0] : channels[0]);

  const handleNextChannel = () => {
    if (!currentChannel) return;
    const idx = filteredChannels.findIndex((c) => c.id === currentChannel.id);
    if (idx >= 0 && idx < filteredChannels.length - 1) {
      onSelectChannel(filteredChannels[idx + 1]);
    } else if (filteredChannels.length > 0) {
      onSelectChannel(filteredChannels[0]);
    }
  };

  const handlePrevChannel = () => {
    if (!currentChannel) return;
    const idx = filteredChannels.findIndex((c) => c.id === currentChannel.id);
    if (idx > 0) {
      onSelectChannel(filteredChannels[idx - 1]);
    } else if (filteredChannels.length > 0) {
      onSelectChannel(filteredChannels[filteredChannels.length - 1]);
    }
  };

  const handleToggleFav = (channelId: string) => {
    toggleFavoriteChannel(channelId);
    setFavoritesList(getFavoriteChannelIds());
  };

  return (
    <div className="min-h-[85vh] bg-slate-950 text-white rounded-3xl p-3 sm:p-5 border border-slate-800 shadow-2xl space-y-4 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs font-bold shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">হোমে ফিরুন</span>
          </button>

          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-cyan-400" />
              <span>লাইভ টিভি চ্যানেল এক্সপ্লোরার</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              মোট {channels.length} টি চ্যানেল • {categories.length} টি ক্যাটাগরি
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMultiscreen}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
            title="মাল্টি-স্ক্রিন মোড"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span>মাল্টি-স্ক্রিন</span>
          </button>

          <button
            onClick={onOpenAdminModal}
            className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5"
            title="Xtream Codes API ও M3U কনফিগারেশন"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>API সেটিংস</span>
          </button>
        </div>
      </div>

      {/* Main Layout: 3 Columns on Large Screens (Categories, Channels, Player) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Categories List (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-800 text-xs font-bold text-slate-400">
              <span>ক্যাটাগরি সমূহ</span>
              <span>{categories.length}</span>
            </div>

            {/* Favorite Filter Toggle */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                onlyFavorites
                  ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : 'text-amber-400'}`} />
                <span>আমার ফেভারিট চ্যানেল</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-mono">
                {favoritesList.length}
              </span>
            </button>

            {/* Categories Scrollable */}
            <div className="max-h-[460px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.id);
                const isActive = !onlyFavorites && selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setOnlyFavorites(false);
                      setSelectedCategory(cat.id);
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between text-left ${
                      isActive
                        ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-950'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {cat.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column: Channels List & Search (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="চ্যানেলের নাম বা নম্বর খুঁজুন..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2"
              >
                ✕
              </button>
            )}
          </div>

          {/* Channels Scrollable List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 max-h-[500px] overflow-y-auto space-y-1.5 custom-scrollbar">
            {filteredChannels.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                <Tv className="w-8 h-8 text-slate-600 mx-auto" />
                <p>কোনো চ্যানেল পাওয়া যায়নি।</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setOnlyFavorites(false);
                  }}
                  className="px-3 py-1 bg-slate-800 text-cyan-400 rounded-lg text-[11px] font-bold"
                >
                  ফিল্টার রিসেট করুন
                </button>
              </div>
            ) : (
              filteredChannels.map((ch) => {
                const isCurrent = currentChannel?.id === ch.id;
                const isFav = favoritesList.includes(ch.id);

                return (
                  <div
                    key={ch.id}
                    onClick={() => onSelectChannel(ch)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 group select-none ${
                      isCurrent
                        ? 'bg-cyan-950/80 border-cyan-500 shadow-md shadow-cyan-950'
                        : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Logo & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-1 shrink-0">
                        {ch.streamIcon ? (
                          <img
                            src={ch.streamIcon}
                            alt={ch.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-cyan-400">
                            {ch.num || 'TV'}
                          </span>
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isCurrent ? 'text-cyan-300' : 'text-slate-200 group-hover:text-white'
                            }`}
                          >
                            {ch.name}
                          </h4>
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {ch.currentProgram || ch.categoryName || 'Live'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Fav Star & Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                        {ch.resolution || 'HD'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFav(ch.id);
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          isFav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Video Player (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {currentChannel ? (
            <div className="sticky top-4 space-y-3">
              <VideoPlayer
                channel={currentChannel}
                onNextChannel={handleNextChannel}
                onPrevChannel={handlePrevChannel}
                onToggleFavorite={handleToggleFav}
                isFavorite={favoritesList.includes(currentChannel.id)}
              />

              {/* Current Channel Meta Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono font-bold text-xs">
                      {currentChannel.num ? `CH ${currentChannel.num}` : 'LIVE'}
                    </span>
                    <h3 className="text-sm font-bold text-white truncate">
                      {currentChannel.name}
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                    HLS Streaming
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentChannel.currentProgram}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                  <span>ক্যাটাগরি: <strong className="text-slate-300 font-normal">{currentChannel.categoryName || 'General'}</strong></span>
                  <span>রেজোলিউশন: <strong className="text-cyan-400 font-normal">{currentChannel.resolution || '1080p FHD'}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 space-y-2">
              <Tv className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-xs">প্লে করার জন্য বাম পাশের তালিকা থেকে একটি চ্যানেল নির্বাচন করুন।</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
