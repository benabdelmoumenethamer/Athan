import React from 'react';
import {
  Bell,
  BellOff,
  Compass,
  CalendarDays,
  Settings,
  Sparkles,
  VolumeX,
} from 'lucide-react';
import { HijriDateInfo, Language } from '../types/prayer';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  hijriDate: HijriDateInfo;
  currentTime: Date;
  silentMode: boolean;
  onToggleSilentMode: () => void;
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
  onOpenQibla: () => void;
  onOpenTasbih: () => void;
  isPlayingAdhan: boolean;
  onStopAdhan: () => void;
}

export const Header: React.FC<Props> = ({
  language,
  onLanguageChange,
  hijriDate,
  currentTime,
  silentMode,
  onToggleSilentMode,
  onOpenSettings,
  onOpenCalendar,
  onOpenQibla,
  onOpenTasbih,
  isPlayingAdhan,
  onStopAdhan,
}) => {
  const isArabic = language === 'ar';

  const timeString = currentTime.toLocaleTimeString(isArabic ? 'ar-DZ' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const gregorianDateString = currentTime.toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header
      className="sticky top-0 z-40 w-full bg-emerald-950/98 backdrop-blur-md border-b border-emerald-800/60 transition-all shadow-md"
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), var(--safe-top, 0px)) + 0.45rem)',
      }}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand & App Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-300/40 flex-shrink-0">
            <span className="text-emerald-950 font-black text-sm sm:text-xl font-quran select-none">
              أذان
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-lg font-black tracking-tight text-white truncate">
                <span>{isArabic ? 'آذان – أوقات الصلاة' : 'Adhan – Prières'}</span>
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex-shrink-0">
                {isArabic ? 'الجزائر والعالم' : 'Algérie & Monde'}
              </span>
            </div>
            {/* Hijri & Gregorian Dates */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-emerald-200/80 truncate">
              <span className="font-semibold text-amber-300/90 font-quran text-xs sm:text-sm truncate">
                {isArabic ? hijriDate.formattedAr : hijriDate.formattedFr}
              </span>
              <span className="text-emerald-500 hidden xs:inline">·</span>
              <span className="hidden lg:inline">{gregorianDateString}</span>
              <span className="hidden lg:inline text-emerald-500">·</span>
              <span className="font-mono font-medium text-emerald-100 hidden xs:inline">{timeString}</span>
            </div>
          </div>
        </div>

        {/* Action Controls - Guaranteed responsive layout with NO overflow on mobile portrait */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Adhan active indicator / stop button */}
          {isPlayingAdhan && (
            <button
              onClick={onStopAdhan}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs animate-pulse cursor-pointer shadow-md shadow-amber-500/30 flex-shrink-0"
              title={isArabic ? 'إيقاف الأذان' : "Arrêter l'Adhan"}
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">{isArabic ? 'إيقاف' : 'Stop'}</span>
            </button>
          )}

          {/* Desktop/Tablet Quick Buttons (Hidden on mobile portrait to avoid crowding) */}
          <button
            onClick={onOpenQibla}
            className="hidden md:flex p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            title={isArabic ? 'بوصلة القبلة' : 'Boussole Qibla'}
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenTasbih}
            className="hidden md:flex p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            title={isArabic ? 'المسبحة الإلكترونية والأذكار' : 'Tasbih & Évocations'}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCalendar}
            className="hidden md:flex p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            title={isArabic ? 'جدول مواقيت الصلاة الشهري' : 'Calendrier mensuel'}
          >
            <CalendarDays className="w-4 h-4" />
          </button>

          {/* Settings button - PRIORITY #1: PROMINENT & ALWAYS VISIBLE */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/60 hover:border-amber-300 transition cursor-pointer flex-shrink-0 shadow-md shadow-amber-500/10 flex items-center justify-center group active:scale-95"
            title={isArabic ? 'الإعدادات' : 'Paramètres'}
            aria-label="Paramètres"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform text-amber-300" />
          </button>

          {/* Silent mode toggle - Always visible */}
          <button
            onClick={onToggleSilentMode}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex-shrink-0 active:scale-95 ${
              silentMode
                ? 'bg-rose-950/70 border-rose-600/60 text-rose-300 hover:bg-rose-900/80'
                : 'bg-emerald-900/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-800'
            }`}
            title={
              silentMode
                ? isArabic
                  ? 'الوضع الصامت مفعل'
                  : 'Mode silencieux activé'
                : isArabic
                  ? 'التنبيهات مفعلة'
                  : 'Sonneries activées'
            }
          >
            {silentMode ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4" />}
          </button>

          {/* Language Switcher - Always visible */}
          <button
            onClick={() => onLanguageChange(isArabic ? 'fr' : 'ar')}
            className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 text-[11px] sm:text-xs font-bold transition cursor-pointer flex-shrink-0 active:scale-95"
            title={isArabic ? 'Changer en Français' : 'التحويل إلى العربية'}
          >
            {isArabic ? 'FR' : 'عربي'}
          </button>

          {/* PWA Install - Desktop only in header to keep mobile clean */}
          <div className="hidden sm:block">
            <PWAInstallButton language={language} />
          </div>
        </div>
      </div>
    </header>
  );
};
