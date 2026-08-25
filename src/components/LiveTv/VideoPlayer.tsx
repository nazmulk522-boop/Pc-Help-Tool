import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Star, 
  Tv, 
  Radio, 
  Layers, 
  ExternalLink,
  Loader2,
  AlertCircle,
  SkipBack,
  SkipForward,
  Ratio,
  Shield,
  Sparkles,
  Cast,
  RefreshCw,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { IptvChannel } from '../../types';
import { toggleFavoriteChannel } from '../../utils/iptvStorage';

interface VideoPlayerProps {
  channel: IptvChannel;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onToggleFavorite?: (channelId: string) => void;
  isFavorite?: boolean;
  autoPlay?: boolean;
  onClosePlayer?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  onNextChannel,
  onPrevChannel,
  onToggleFavorite,
  isFavorite = false,
  autoPlay = true,
  onClosePlayer,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | 'fill' | 'original'>('16:9');
  const [favState, setFavState] = useState<boolean>(isFavorite);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isPiPSupported, setIsPiPSupported] = useState<boolean>(false);
  const [streamHealth, setStreamHealth] = useState<'Excellent' | 'Good' | 'Buffering'>('Good');
  const [autoplayMutedNotice, setAutoplayMutedNotice] = useState<boolean>(false);

  // Playback Mode: 'hls' | 'proxy' | 'backup' | 'embed'
  const [playbackMode, setPlaybackMode] = useState<'hls' | 'proxy' | 'backup' | 'embed'>('hls');
  const [activeBackupIndex, setActiveBackupIndex] = useState<number>(0);

  // Check PiP support
  useEffect(() => {
    if (typeof document !== 'undefined' && 'pictureInPictureEnabled' in document) {
      setIsPiPSupported(true);
    }
  }, []);

  // Update favorite state when prop changes
  useEffect(() => {
    setFavState(isFavorite);
  }, [isFavorite]);

  const destroyPlayers = () => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      try {
        mpegtsRef.current.pause();
        mpegtsRef.current.unload();
        mpegtsRef.current.detachMediaElement();
        mpegtsRef.current.destroy();
      } catch (e) {}
      mpegtsRef.current = null;
    }
  };

  // Determine current active stream URL
  const getActiveStreamUrl = useCallback((): string => {
    if (playbackMode === 'backup' && channel.backupUrls && channel.backupUrls.length > 0) {
      return channel.backupUrls[activeBackupIndex] || channel.backupUrls[0];
    }
    return channel.streamUrl;
  }, [channel, playbackMode, activeBackupIndex]);

  // Load and play HLS, MPEG-TS or native video
  const loadStream = useCallback((mode: 'hls' | 'proxy' | 'backup' | 'embed' = 'hls') => {
    if (mode === 'embed') {
      setPlaybackMode('embed');
      setIsLoading(false);
      setError(null);
      destroyPlayers();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);
    setStreamHealth('Buffering');
    destroyPlayers();

    let rawUrl = channel.streamUrl;
    if (mode === 'backup' && channel.backupUrls && channel.backupUrls.length > 0) {
      rawUrl = channel.backupUrls[activeBackupIndex] || channel.backupUrls[0];
    }

    // Determine effective URL
    let urlToPlay = rawUrl;
    const isMixedContent = rawUrl.startsWith('http://') && window.location.protocol === 'https:';

    if (mode === 'proxy' || isMixedContent) {
      urlToPlay = `/api/iptv/proxy-stream?url=${encodeURIComponent(rawUrl)}`;
    }

    const isTsStream = rawUrl.endsWith('.ts') || (!rawUrl.endsWith('.m3u8') && !rawUrl.includes('.m3u8') && !rawUrl.includes('manifest'));

    // 1. If TS stream, use mpegts.js
    if (isTsStream && mpegts.isSupported()) {
      try {
        const player = mpegts.createPlayer(
          {
            type: 'mse',
            isLive: true,
            url: urlToPlay,
          },
          {
            enableWorker: true,
            lazyLoad: false,
            liveBufferLatencyChasing: true,
          }
        );

        mpegtsRef.current = player;
        player.attachMediaElement(video);
        player.load();

        if (autoPlay) {
          const playPromise = player.play();
          if (playPromise && typeof (playPromise as any).catch === 'function') {
            (playPromise as Promise<void>).catch(() => {
              video.muted = true;
              setIsMuted(true);
              setAutoplayMutedNotice(true);
              const retryPromise = player.play();
              if (retryPromise && typeof (retryPromise as any).catch === 'function') {
                (retryPromise as Promise<void>).catch(() => {});
              }
            });
          }
        }
        setIsLoading(false);
        setStreamHealth('Good');
        return;
      } catch (e) {
        console.warn('mpegts error, falling back to HLS:', e);
      }
    }

    // 2. HLS.js for .m3u8
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        xhrSetup: (xhr, url) => {
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;
      hls.loadSource(urlToPlay);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setStreamHealth('Excellent');
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            setAutoplayMutedNotice(true);
            video.play().catch((e) => console.warn('Autoplay muted failed:', e));
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network Error, switching playback strategy...', data);
              setStreamHealth('Buffering');

              if (mode === 'hls' && !urlToPlay.includes('/api/iptv/proxy-stream')) {
                // Try through Proxy
                console.log('Switching to Proxy stream...');
                setPlaybackMode('proxy');
                loadStream('proxy');
              } else if (channel.backupUrls && channel.backupUrls.length > 0 && mode !== 'backup') {
                // Try Backup URL
                console.log('Switching to Backup stream...');
                setPlaybackMode('backup');
                loadStream('backup');
              } else if (channel.embedUrl) {
                // Try Embed Mode
                console.log('Switching to Embed feed...');
                setPlaybackMode('embed');
                setIsLoading(false);
              } else {
                setError('লাইভ স্ট্রিম সংযোগ করা সম্ভব হয়নি। স্ট্রিমটি অফলাইন অথবা সার্ভার ব্লক করেছে।');
                setIsLoading(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media Error, recovering media...', data);
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (channel.embedUrl) {
                setPlaybackMode('embed');
                setIsLoading(false);
              } else {
                setError('প্লেয়ার এরর: স্ট্রিম লোড করা যায়নি।');
                setIsLoading(false);
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = urlToPlay;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setStreamHealth('Excellent');
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            setAutoplayMutedNotice(true);
            video.play().catch(() => {});
          });
        }
      });
      video.addEventListener('error', () => {
        if (mode === 'hls') {
          setPlaybackMode('proxy');
          loadStream('proxy');
        } else if (channel.embedUrl) {
          setPlaybackMode('embed');
        } else {
          setError('স্ট্রিম প্লে করা যায়নি।');
          setIsLoading(false);
        }
      });
    } else {
      video.src = urlToPlay;
    }
  }, [channel, autoPlay, activeBackupIndex]);

  // Load stream when channel changes
  useEffect(() => {
    if (channel) {
      setRetryCount(0);
      setAutoplayMutedNotice(false);
      if (channel.streamType === 'embed' && channel.embedUrl) {
        setPlaybackMode('embed');
        setIsLoading(false);
      } else {
        setPlaybackMode('hls');
        loadStream('hls');
      }
    }

    return () => {
      destroyPlayers();
    };
  }, [channel]);

  // Auto-hide controls timer
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 4500);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (onNextChannel) onNextChannel();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (onPrevChannel) onPrevChannel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, isFullscreen, onNextChannel, onPrevChannel]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted) {
      setAutoplayMutedNotice(false);
    }
  };

  const handleUnmuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = 1;
      setIsMuted(false);
      setVolume(1);
    }
    setAutoplayMutedNotice(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
      if (val > 0) {
        setAutoplayMutedNotice(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP failed:', e);
    }
  };

  const cycleAspectRatio = () => {
    const ratios: Array<'16:9' | '4:3' | 'fill' | 'original'> = ['16:9', '4:3', 'fill', 'original'];
    const currentIdx = ratios.indexOf(aspectRatio);
    const nextIdx = (currentIdx + 1) % ratios.length;
    setAspectRatio(ratios[nextIdx]);
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFav = toggleFavoriteChannel(channel.id);
    setFavState(newFav);
    if (onToggleFavorite) {
      onToggleFavorite(channel.id);
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '4:3':
        return 'aspect-4/3 object-contain';
      case 'fill':
        return 'w-full h-full object-fill';
      case 'original':
        return 'w-full h-full object-none';
      case '16:9':
      default:
        return 'aspect-video object-contain';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={handleUserActivity}
      className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 select-none group flex items-center justify-center ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'w-full aspect-video min-h-[260px] sm:min-h-[420px]'
      }`}
    >
      {/* 1. Embed Iframe Mode (YouTube Live / Web Feed) */}
      {playbackMode === 'embed' && channel.embedUrl ? (
        <div className="w-full h-full bg-black flex items-center justify-center relative">
          <iframe
            src={channel.embedUrl}
            title={channel.name}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        /* 2. Native / HLS / TS HTML5 Video Player */
        <video
          ref={videoRef}
          playsInline
          className={`w-full h-full bg-black transition-all ${getAspectClass()}`}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setStreamHealth('Excellent');
          }}
        />
      )}

      {/* Autoplay Muted Notice Overlay Banner */}
      {autoplayMutedNotice && !error && (
        <div className="absolute top-20 z-30 animate-bounce">
          <button
            onClick={handleUnmuteClick}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-full font-bold text-xs shadow-xl flex items-center gap-2 border border-white/20 cursor-pointer"
          >
            <VolumeX className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>সাউন্ড শুনতে এখানে ক্লিক করুন (Unmute)</span>
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !error && playbackMode !== 'embed' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs space-y-3 pointer-events-none animate-in fade-in">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Tv className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto" />
          </div>
          <div className="text-center space-y-1">
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {channel.name}
            </span>
            <span className="text-[11px] text-cyan-300 block font-mono">
              {playbackMode === 'proxy' ? 'প্রক্সি সার্ভার দিয়ে কানেক্ট হচ্ছে...' : 'কানেক্ট হচ্ছে... (Live Stream Buffer)'}
            </span>
          </div>
        </div>
      )}

      {/* Error Overlay with Multi-Option Recovery */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-white">লাইভ স্ট্রিম চালু হতে পারেনি</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                setError(null);
                setPlaybackMode('proxy');
                loadStream('proxy');
              }}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-950"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>প্রক্সি দিয়ে চালান</span>
            </button>

            {channel.backupUrls && channel.backupUrls.length > 0 && (
              <button
                onClick={() => {
                  setError(null);
                  setPlaybackMode('backup');
                  loadStream('backup');
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>ব্যাকআপ সার্ভার</span>
              </button>
            )}

            {channel.embedUrl && (
              <button
                onClick={() => {
                  setError(null);
                  setPlaybackMode('embed');
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>অফিশিয়াল লাইভ ফিড</span>
              </button>
            )}

            {onNextChannel && (
              <button
                onClick={onNextChannel}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                পরবর্তী চ্যানেল
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top TV Channel Info Header Overlay */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 z-10 flex items-center justify-between pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {channel.streamIcon ? (
            <img
              src={channel.streamIcon}
              alt={channel.name}
              className="w-10 h-10 object-contain rounded-lg bg-black/50 p-1 border border-slate-700/60 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
              {channel.num || 'TV'}
            </div>
          )}

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
              <h3 className="text-sm sm:text-base font-black text-white truncate drop-shadow-md">
                {channel.name}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono font-bold shrink-0">
                {channel.resolution || '1080p FHD'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-2">
              <span className="text-cyan-400">▶ {channel.currentProgram || 'লাইভ ব্রডকাস্ট'}</span>
              {channel.categoryName && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{channel.categoryName}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Stream Mode Switcher */}
          {channel.embedUrl && (
            <button
              onClick={() => {
                if (playbackMode === 'embed') {
                  setPlaybackMode('hls');
                  loadStream('hls');
                } else {
                  setPlaybackMode('embed');
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold backdrop-blur-md transition flex items-center gap-1 ${
                playbackMode === 'embed'
                  ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                  : 'bg-black/40 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="অফিশিয়াল লাইভ ফিড ও HLS মোড পরিবর্তন করুন"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{playbackMode === 'embed' ? 'HLS মোড' : 'লাইভ ফিড'}</span>
            </button>
          )}

          <button
            onClick={handleFavClick}
            className={`p-2 rounded-xl border backdrop-blur-md transition ${
              favState
                ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                : 'bg-black/40 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={favState ? 'ফেভারিট থেকে সরান' : 'ফেভারিটে যুক্ত করুন'}
          >
            <Star className={`w-4 h-4 ${favState ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={cycleAspectRatio}
            className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold backdrop-blur-md transition flex items-center gap-1"
            title="Aspect Ratio পরিবর্তন করুন"
          >
            <Ratio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{aspectRatio}</span>
          </button>
        </div>
      </div>

      {/* Bottom Ultra XC Player Controls Bar Overlay */}
      {playbackMode !== 'embed' && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-10 space-y-2 pointer-events-auto ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Status and Source Info */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>স্ট্যাটাস: <strong className="text-emerald-300 font-normal">{streamHealth}</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-normal">
                {playbackMode === 'proxy' ? 'Proxy Mode' : playbackMode === 'backup' ? 'Backup Mirror' : 'Direct HLS'}
              </span>
            </div>
            {channel.nextProgram && (
              <div className="hidden sm:block text-slate-400 truncate">
                পরবর্তী: <span className="text-slate-300">{channel.nextProgram}</span>
              </div>
            )}
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Controls: Prev, Play/Pause, Next, Volume */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {onPrevChannel && (
                <button
                  onClick={onPrevChannel}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition"
                  title="পূর্ববর্তী চ্যানেল (Down Arrow)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={togglePlay}
                className="p-2.5 sm:p-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
                title={isPlaying ? 'পজ (Space)' : 'প্লে (Space)'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
              </button>

              {onNextChannel && (
                <button
                  onClick={onNextChannel}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition"
                  title="পরবর্তী চ্যানেল (Up Arrow)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              {/* Volume Control */}
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
                  title="মিউট / আনমিউট (M)"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            {/* Right Controls: Proxy Switch, Reload, PiP, Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => {
                  const nextMode = playbackMode === 'hls' ? 'proxy' : 'hls';
                  setPlaybackMode(nextMode);
                  loadStream(nextMode);
                }}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                  playbackMode === 'proxy'
                    ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
                title="প্রক্সি মোড অন/অফ করুন"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">{playbackMode === 'proxy' ? 'Proxy ON' : 'Proxy'}</span>
              </button>

              <button
                onClick={() => loadStream(playbackMode)}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
                title="স্ট্রিম রিলোড / রিকানেক্ট"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {isPiPSupported && (
                <button
                  onClick={togglePictureInPicture}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
                  title="Picture-in-Picture (ফ্লোটিং উইন্ডো)"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-2 sm:p-2.5 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/40 transition active:scale-95 cursor-pointer"
                title="ফুলস্ক্রিন (F)"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
