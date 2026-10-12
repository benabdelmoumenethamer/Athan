import React from 'react';
import {
  Clock,
  Compass,
  Sparkles,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { Language } from '../types/prayer';

interface Props {
  language: Language;
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
  onOpenQibla: () => void;
  onOpenTasbih: () => void;
}

export const BottomNav: React.FC<Props> = ({
  language,
  onOpenSettings,
  onOpenCalendar,
  onOpenQibla,
  onOpenTasbih,
}) => {
  const isArabic = language === 'ar';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-emerald-950/98 backdrop-blur-xl border-t border-emerald-800/80 px-3 pt-2.5 shadow-2xl transition-all"
      style={{
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-bottom, 0px)) + 0.5rem)',
      }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {/* 1. Home / Prayer Times */}
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-emerald-300 hover:text-amber-300 active:scale-95 transition cursor-pointer"
        >
          <Clock className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] font-semibold mt-0.5">
            {isArabic ? 'الصلوات' : 'Prières'}
          </span>
        </button>

        {/* 2. Qibla */}
        <button
          onClick={onOpenQibla}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-emerald-300 hover:text-amber-300 active:scale-95 transition cursor-pointer"
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {isArabic ? 'القبلة' : 'Qibla'}
          </span>
        </button>

        {/* 3. Tasbih */}
        <button
          onClick={onOpenTasbih}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-emerald-300 hover:text-amber-300 active:scale-95 transition cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {isArabic ? 'المسبحة' : 'Tasbih'}
          </span>
        </button>

        {/* 4. Calendar */}
        <button
          onClick={onOpenCalendar}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-emerald-300 hover:text-amber-300 active:scale-95 transition cursor-pointer"
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {isArabic ? 'الشهري' : 'Calendrier'}
          </span>
        </button>

        {/* 5. Settings - Always accessible in portrait mode */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-amber-300 hover:text-amber-200 active:scale-95 transition cursor-pointer"
        >
          <div className="relative">
            <Settings className="w-5 h-5 text-amber-400 animate-[spin_10s_linear_infinite]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 text-amber-300">
            {isArabic ? 'الإعدادات' : 'Paramètres'}
          </span>
        </button>
      </div>
    </nav>
  );
};
