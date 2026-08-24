import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
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
  Cast
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

  // Load and play HLS or native video
  const loadStream = useCallback((streamUrl: string) => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);
    setStreamHealth('Buffering');

    // Clean previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Determine effective URL (check if proxy needed)
    let urlToPlay = streamUrl;
    if (streamUrl.startsWith('http://') && window.location.protocol === 'https:') {
      // Mixed content issue fallback to stream proxy
      urlToPlay = `/api/iptv/proxy-stream?url=${encodeURIComponent(streamUrl)}`;
    }

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
            // Autoplay with sound might be blocked, retry muted
            video.muted = true;
            setIsMuted(true);
            video.play().catch((e) => console.warn('Autoplay failed:', e));
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network Error, attempting recovery...', data);
              setStreamHealth('Buffering');
              if (retryCount < 2) {
                hls.startLoad();
                setRetryCount((prev) => prev + 1);
              } else {
                // Fallback to proxy endpoint if direct fails
                if (!urlToPlay.includes('/api/iptv/proxy-stream')) {
                  const proxyUrl = `/api/iptv/proxy-stream?url=${encodeURIComponent(streamUrl)}`;
                  hls.loadSource(proxyUrl);
                } else {
                  setError('লাইভ স্ট্রিম সংযোগ করা সম্ভব হয়নি। স্ট্রিমটি অফলাইন অথবা সার্ভার ব্লক করেছে।');
                  setIsLoading(false);
                }
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media Error, recovering media...', data);
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError('প্লেয়ার এরর: স্ট্রিম লোড করা যায়নি।');
              setIsLoading(false);
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
            video.play().catch(() => {});
          });
        }
      });
      video.addEventListener('error', () => {
        setError('স্ট্রিম প্লে করা যায়নি।');
        setIsLoading(false);
      });
    } else {
      // Direct mp4 / standard stream
      video.src = urlToPlay;
    }
  }, [autoPlay, retryCount]);

  // Load stream when channel changes
  useEffect(() => {
    if (channel && channel.streamUrl) {
      setRetryCount(0);
      loadStream(channel.streamUrl);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, loadStream]);

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
    }, 4000);
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
      // Ignore if user is typing in input
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
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
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
      {/* Video Element */}
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

      {/* Loading Spinner */}
      {isLoading && !error && (
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
              কানেক্ট হচ্ছে... (Live Stream Buffer)
            </span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-white">লাইভ স্ট্রিম চালু হতে পারেনি</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null);
                loadStream(channel.streamUrl);
              }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-950"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>
            {onNextChannel && (
              <button
                onClick={onNextChannel}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
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
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-10 space-y-2 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Next program indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>স্ট্রিম স্ট্যাটাস: <strong className="text-emerald-300 font-normal">{streamHealth}</strong></span>
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
              className="p-2.5 sm:p-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20 transition active:scale-95"
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
                className="p-2 rounded-xl text-slate-300 hover:text-white transition"
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

          {/* Right Controls: Reload, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => loadStream(channel.streamUrl)}
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
              className="p-2 sm:p-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/40 transition active:scale-95"
              title="ফুলস্ক্রিন (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
