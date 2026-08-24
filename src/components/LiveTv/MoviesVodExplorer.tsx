import React, { useState } from 'react';
import { 
  Film, 
  Clapperboard, 
  Search, 
  Star, 
  Play, 
  ChevronLeft, 
  Clock, 
  Calendar, 
  Sparkles, 
  Info,
  Layers
} from 'lucide-react';
import { IptvVodItem } from '../../types';
import { VideoPlayer } from './VideoPlayer';

interface MoviesVodExplorerProps {
  type: 'vod' | 'series';
  onBack: () => void;
}

const SAMPLE_VOD_MOVIES: IptvVodItem[] = [
  {
    id: 'vod_1',
    streamId: '101',
    name: 'Hawa (হাওয়া)',
    title: 'Hawa (বাংলা সাসপেন্স থ্রিলার সিনেমা)',
    year: '2022',
    streamIcon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60',
    rating: '8.4',
    genre: 'Mystery, Thriller, Drama',
    duration: '2h 15m',
    plot: 'বঙ্গোপসাগরের বুকে একটি মাছ ধরার ট্রলারে এক রহস্যময়ী নারীর আগমনকে কেন্দ্র করে গড়ে ওঠা শ্বাসরুদ্ধকর গল্প।',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    categoryName: 'বাংলা সিনেমা',
  },
  {
    id: 'vod_2',
    streamId: '102',
    name: 'Priyotoma (প্রিয়তমা)',
    title: 'Priyotoma (রোমান্টিক অ্যাকশন ব্লকবাস্টার)',
    year: '2023',
    streamIcon: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60',
    rating: '8.1',
    genre: 'Action, Romance',
    duration: '2h 28m',
    plot: 'শাকিব খান অভিনীত সাড়া জাগানো রোমান্টিক অ্যাকশন মুভি।',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    categoryName: 'বাংলা সিনেমা',
  },
  {
    id: 'vod_3',
    streamId: '103',
    name: 'Tears of Steel (Sci-Fi 4K)',
    title: 'Tears of Steel Open Movie',
    year: '2021',
    streamIcon: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=60',
    rating: '8.7',
    genre: 'Sci-Fi, VFX, Action',
    duration: '1h 45m',
    plot: 'ভবিষ্যতের এক কল্পবিজ্ঞান যুদ্ধ ও রোবট নিয়ন্ত্রণের গল্প।',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    categoryName: 'Sci-Fi Cinema',
  },
  {
    id: 'vod_4',
    streamId: '104',
    name: 'Big Buck Bunny (Animation HD)',
    title: 'Big Buck Bunny 4K Animation',
    year: '2020',
    streamIcon: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60',
    rating: '8.9',
    genre: 'Animation, Family, Comedy',
    duration: '1h 30m',
    plot: 'একটি বনভূমি ও মিষ্টি খরগোশের রোমাঞ্চকর অ্যানিমেশন মুভি।',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    categoryName: 'Animation',
  },
];

export const MoviesVodExplorer: React.FC<MoviesVodExplorerProps> = ({ type, onBack }) => {
  const [search, setSearch] = useState<string>('');
  const [selectedMovie, setSelectedMovie] = useState<IptvVodItem | null>(null);

  const filteredMovies = SAMPLE_VOD_MOVIES.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.genre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[85vh] bg-slate-950 text-white rounded-3xl p-3 sm:p-5 border border-slate-800 shadow-2xl space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
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
              {type === 'vod' ? (
                <>
                  <Film className="w-5 h-5 text-pink-400" />
                  <span>মুভিজ ও VOD ভিডিও অন ডিমান্ড</span>
                </>
              ) : (
                <>
                  <Clapperboard className="w-5 h-5 text-amber-400" />
                  <span>টিভি সিরিজ ও সিজন কালেকশন</span>
                </>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              Xtream সার্ভার বা বিল্ট-ইন HD ভিডিও স্ট্রিমিং লাইব্রেরি
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="মুভি বা সিরিজের নাম খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-pink-500"
          />
        </div>
      </div>

      {/* Active Movie Player Modal / View */}
      {selectedMovie && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-pink-400">▶ মুভি প্লেয়ার:</span>
              <span>{selectedMovie.name}</span>
            </h3>
            <button
              onClick={() => setSelectedMovie(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
            >
              বন্ধ করুন
            </button>
          </div>

          <div className="max-w-4xl mx-auto">
            <VideoPlayer
              channel={{
                id: selectedMovie.id,
                name: selectedMovie.name,
                streamUrl: selectedMovie.streamUrl,
                resolution: '1080p FHD',
                currentProgram: selectedMovie.title || selectedMovie.name,
              }}
              autoPlay={true}
            />
          </div>

          <div className="max-w-4xl mx-auto space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-700/60 font-bold">
                {selectedMovie.categoryName}
              </span>
              <span className="text-slate-400 font-mono">বছর: {selectedMovie.year}</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{selectedMovie.rating}</span>
              </span>
              <span className="text-slate-400 font-mono">সময়: {selectedMovie.duration}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedMovie.plot}</p>
          </div>
        </div>
      )}

      {/* Movie Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMovies.map((movie) => (
          <div
            key={movie.id}
            onClick={() => setSelectedMovie(movie)}
            className="group bg-slate-900/90 border border-slate-800 hover:border-pink-500/60 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            {/* Poster Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-slate-950">
              <img
                src={movie.streamIcon}
                alt={movie.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-400/40">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{movie.rating}</span>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-lg shadow-pink-900">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Movie Info */}
            <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-pink-300 transition-colors line-clamp-1">
                  {movie.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">{movie.genre}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{movie.year}</span>
                <span>{movie.duration}</span>
                <span className="text-cyan-400 font-bold">1080p FHD</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
