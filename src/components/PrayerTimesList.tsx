import React from 'react';
import {
  Sunrise,
  Sun,
  Sunset,
  Moon,
  CloudSun,
  Bell,
  BellOff,
  Volume2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Language, PrayerKey, PrayerSettings, PrayerTimeInfo } from '../types/prayer';

interface Props {
  language: Language;
  prayers: PrayerTimeInfo[];
  settings: PrayerSettings;
  onTogglePrayerSound: (key: PrayerKey) => void;
  onToggleAdhanPlayback: (key: PrayerKey) => void;
  nextPrayerKey: PrayerKey;
}

const PRAYER_ICONS: Record<PrayerKey, React.ComponentType<{ className?: string }>> = {
  fajr: Moon,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: Moon,
};

export const PrayerTimesList: React.FC<Props> = ({
  language,
  prayers,
  settings,
  onTogglePrayerSound,
  onToggleAdhanPlayback,
  nextPrayerKey,
}) => {
  const isArabic = language === 'ar';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>{isArabic ? 'مواقيت الصلوات الخمس اليوم' : 'Horaires des Cinq Prières du Jour'}</span>
        </h3>
        <span className="text-xs text-emerald-400 font-medium">
          {isArabic ? 'اضغط على الجرس لتخصيص التنبيه' : 'Sonneries personnalisables'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prayers.map((prayer) => {
          const Icon = PRAYER_ICONS[prayer.key] || Sun;
          const isNext = prayer.key === nextPrayerKey;
          const isCurrent = prayer.isCurrent;
          const soundConfig = settings.prayerSoundConfig[prayer.key] || {
            enabled: true,
            playAdhan: true,
          };
          const isMuted = settings.silentMode || !soundConfig.enabled;
          const isSunrise = prayer.key === 'sunrise';

          return (
            <div
              key={prayer.key}
              className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 border ${
                isNext
                  ? 'bg-gradient-to-br from-emerald-900/95 to-emerald-950 border-amber-400/80 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/20'
                  : isCurrent
                  ? 'bg-emerald-950/90 border-emerald-600/70 shadow-md'
                  : prayer.isPassed
                  ? 'bg-emerald-950/50 border-emerald-900/40 opacity-75'
                  : 'bg-emerald-950/70 border-emerald-800/50 hover:border-emerald-700'
              }`}
            >
              {/* Gold ribbon on top for next prayer */}
              {isNext && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
              )}

              <div className="flex items-center justify-between gap-3">
                {/* Left: Icon & Titles */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                      isNext
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : isCurrent
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isSunrise
                        ? 'bg-amber-500/10 text-amber-200/80'
                        : 'bg-emerald-900/50 text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-base font-bold font-quran ${
                          isNext ? 'text-amber-300 text-lg' : 'text-slate-100'
                        }`}
                      >
                        {isArabic ? prayer.titleAr : prayer.titleFr}
                      </h4>

                      {/* Status indicator */}
                      {isNext && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-emerald-950 shadow-sm animate-pulse">
                          {isArabic ? 'القادمة' : 'Suivante'}
                        </span>
                      )}
                      {isCurrent && !isNext && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {isArabic ? 'الحالية' : 'En cours'}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-emerald-300/70">
                      {isArabic ? prayer.titleFr : prayer.titleAr}
                    </div>
                  </div>
                </div>

                {/* Right: Time and Sound action */}
                <div className="flex items-center gap-2">
                  <div className="text-end">
                    <span
                      className={`text-xl sm:text-2xl font-black font-mono tracking-tight block ${
                        isNext
                          ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'text-white'
                      }`}
                    >
                      {prayer.formatted}
                    </span>
                    {prayer.isPassed && !isNext && (
                      <span className="text-[10px] text-emerald-500/70 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
                        {isArabic ? 'تمت' : 'Passée'}
                      </span>
                    )}
                  </div>

                  {/* Sound / Mute toggle button for this prayer (except Sunrise which isn't a fard prayer) */}
                  {!isSunrise && (
                    <div className="flex flex-col gap-1 items-center">
                      <button
                        onClick={() => onTogglePrayerSound(prayer.key)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isMuted
                            ? 'bg-emerald-900/30 border-emerald-800 text-slate-500 hover:text-slate-300'
                            : 'bg-emerald-800/60 border-emerald-600/60 text-amber-300 hover:bg-emerald-700/70'
                        }`}
                        title={
                          isMuted
                            ? isArabic
                              ? 'تفعيل التنبيه لهذه الصلاة'
                              : 'Activer le rappel pour cette prière'
                            : isArabic
                              ? 'كتم صوت هذه الصلاة'
                              : 'Mettre en sourdine cette prière'
                        }
                      >
                        {isMuted ? (
                          <BellOff className="w-3.5 h-3.5" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Small Adhan toggle button */}
                      <button
                        onClick={() => onToggleAdhanPlayback(prayer.key)}
                        className={`p-1 rounded-md text-[10px] transition cursor-pointer ${
                          soundConfig.playAdhan && !isMuted
                            ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={
                          soundConfig.playAdhan
                            ? isArabic
                              ? 'الأذان الكامل مفعل'
                              : 'Adhan complet activé'
                            : isArabic
                              ? 'نغمة قصيرة فقط'
                              : 'Notification simple'
                        }
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
