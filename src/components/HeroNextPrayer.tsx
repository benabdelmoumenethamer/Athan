import React from 'react';
import mosqueImage from '../assets/images/mosque_dusk_islamic_1791747655722.jpg';
import {
  MapPin,
  Volume2,
  Clock,
  VolumeX,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  Language,
  LocationConfig,
  NextPrayerStatus,
} from '../types/prayer';

interface Props {
  language: Language;
  location: LocationConfig;
  nextPrayer: NextPrayerStatus;
  onOpenLocationModal: () => void;
  isPlayingAdhan: boolean;
  onPlayTestAdhan: () => void;
  onStopAdhan: () => void;
  onOpenQibla: () => void;
  qiblaAngle: number;
  selectedMuezzinName: string;
  onOpenAdhanSelector: () => void;
}

export const HeroNextPrayer: React.FC<Props> = ({
  language,
  location,
  nextPrayer,
  onOpenLocationModal,
  isPlayingAdhan,
  onPlayTestAdhan,
  onStopAdhan,
  onOpenQibla,
  qiblaAngle,
  selectedMuezzinName,
  onOpenAdhanSelector,
}) => {
  const isArabic = language === 'ar';

  const locationLabel = isArabic
    ? `${location.wilayaNameAr}${location.communeNameAr ? ` - ${location.communeNameAr}` : ''}`
    : `${location.wilayaName}${location.communeName ? ` - ${location.communeName}` : ''}`;

  const nextPrayerName = isArabic ? nextPrayer.titleAr : nextPrayer.titleFr;

  const nextPrayerTimeStr = nextPrayer.time.toLocaleTimeString(isArabic ? 'ar-DZ' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-emerald-900/90 to-emerald-950/95 p-5 sm:p-7 shadow-2xl shadow-emerald-950/80">
      {/* Background mosque twilight image with gradient mask */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity pointer-events-none"
        style={{
          backgroundImage: `url('${mosqueImage}')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/80 to-transparent pointer-events-none" />

      {/* Decorative Golden Islamic Arch Pattern */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top bar inside hero: Location & Qibla pill */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Location button */}
          <button
            onClick={onOpenLocationModal}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 text-slate-200 hover:text-white transition cursor-pointer shadow-sm"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="text-start">
              <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200">
                {locationLabel}
              </span>
              <span className="text-[10px] text-emerald-400/80 block">
                {isArabic ? 'اضغط لتغيير الولاية / البلدية' : 'Changer de wilaya / commune'}
              </span>
            </div>
          </button>

          {/* Qibla angle pill */}
          <button
            onClick={onOpenQibla}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 text-xs text-amber-300 font-semibold transition cursor-pointer"
            title={isArabic ? 'عرض اتجاه القبلة' : 'Voir direction de la Qibla'}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isArabic ? `القبلة: ${qiblaAngle}°` : `Qibla : ${qiblaAngle}°`}
            </span>
          </button>
        </div>

        {/* Center: Next Prayer Title & Big Animated Countdown */}
        <div className="flex flex-col items-center justify-center text-center py-2 sm:py-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3 tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>
              {isArabic ? 'الصلاة القادمة' : 'Prochaine Prière'}
              {nextPrayer.isTomorrow && (isArabic ? ' (غداً)' : ' (Demain)')}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-3 font-quran">
            <span className="text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]">
              {nextPrayerName}
            </span>
          </h2>

          <div className="mt-1 flex items-center gap-2 text-sm text-emerald-200/90 font-medium">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              {isArabic ? 'عند الساعة' : 'À'} <strong className="text-white font-mono text-base">{nextPrayerTimeStr}</strong>
            </span>
          </div>

          {/* Countdown timer */}
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-emerald-950/85 border border-amber-500/25 shadow-inner backdrop-blur-sm max-w-sm w-full">
            <div className="text-[11px] font-semibold text-emerald-300/80 mb-1">
              {isArabic ? 'الوقت المتبقي حتى الأذان' : 'Temps restant avant l\'Adhan'}
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              {nextPrayer.remainingFormatted}
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-emerald-900/80 rounded-full h-2 overflow-hidden border border-emerald-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${nextPrayer.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom hero actions: Listen to Adhan, Test audio, Model badge */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 border-t border-emerald-800/40">
          <button
            onClick={isPlayingAdhan ? onStopAdhan : onPlayTestAdhan}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer active:scale-95 ${
              isPlayingAdhan
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-800/90 hover:bg-emerald-700/90 text-amber-300 border border-amber-500/40 hover:border-amber-400'
            }`}
          >
            {isPlayingAdhan ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>{isArabic ? 'إيقاف صوت الأذان' : 'Arrêter l\'Adhan'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>{isArabic ? 'الاستماع للأذان الآن' : 'Écouter l\'Adhan'}</span>
              </>
            )}
          </button>

          {/* 4 Models Selector Trigger */}
          <button
            onClick={onOpenAdhanSelector}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-amber-200 border border-emerald-700 text-xs font-semibold transition cursor-pointer"
            title={isArabic ? 'تغيير صيغة ونموذج الأذان (4 نماذج)' : 'Changer le modèle d\'Adhan (4 modèles)'}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="truncate max-w-[200px]">
              {isArabic ? `الصيغة: ${selectedMuezzinName}` : `Modèle : ${selectedMuezzinName}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
