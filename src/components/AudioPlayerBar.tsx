import React from 'react';
import { Volume2, VolumeX, Square, X, Music } from 'lucide-react';
import { Language, MuezzinOption } from '../types/prayer';

interface Props {
  isPlaying: boolean;
  muezzin: MuezzinOption | null;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onStop: () => void;
  language: Language;
}

export const AudioPlayerBar: React.FC<Props> = ({
  isPlaying,
  muezzin,
  volume,
  onVolumeChange,
  onStop,
  language,
}) => {
  const isArabic = language === 'ar';

  if (!isPlaying) return null;

  return (
    <div
      className="fixed inset-x-3 sm:inset-x-4 max-w-xl mx-auto z-40 bg-emerald-950/98 border border-amber-400/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 sm:p-3.5 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200 sm:bottom-4"
      style={{
        bottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-bottom, 12px)) + 4.25rem)',
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center flex-shrink-0 animate-pulse">
          <Music className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <div className="text-xs sm:text-sm font-bold text-white truncate">
            {isArabic ? muezzin?.nameAr || 'صوت الأذان' : muezzin?.nameFr || 'Adhan en cours'}
          </div>
          <div className="text-[11px] text-amber-300/80 truncate">
            {isArabic ? muezzin?.placeAr || 'نداء الصلاة' : muezzin?.placeFr || 'Appel à la prière'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Volume slider */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-900/60 border border-emerald-800">
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Stop button */}
        <button
          onClick={onStop}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>{isArabic ? 'إيقاف' : 'Arrêter'}</span>
        </button>

        <button
          onClick={onStop}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
