import React, { useEffect } from 'react';
import { BellRing, VolumeX, X } from 'lucide-react';
import { ActiveAlertData, notificationService } from '../services/notificationService';
import { Language, PrayerSettings } from '../types/prayer';

interface Props {
  alertData: ActiveAlertData | null;
  onClose: () => void;
  language: Language;
  settings: PrayerSettings;
}

export const ActivePrayerAlertModal: React.FC<Props> = ({ alertData, onClose, language }) => {
  const isArabic = language === 'ar';

  // Fermeture automatique après 3 minutes
  useEffect(() => {
    if (!alertData) return;
    const t = setTimeout(onClose, 180000);
    return () => clearTimeout(t);
  }, [alertData, onClose]);

  if (!alertData) return null;

  const title = isArabic ? alertData.titleAr : alertData.titleFr;
  const heading = alertData.isTest
    ? isArabic ? 'اختبار التنبيه' : "Test d'alerte"
    : isArabic ? 'حان الآن موعد الصلاة' : "C'est l'heure de la prière";
  const timeStr = alertData.time.toLocaleTimeString(isArabic ? 'ar-DZ' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleStop = () => {
    notificationService.stopAudio();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/40 bg-gradient-to-b from-emerald-900 to-emerald-950 p-6 text-center shadow-2xl">
        <button
          onClick={handleStop}
          className="absolute top-3 end-3 p-2 rounded-full text-emerald-200/80 hover:bg-white/10"
          aria-label={isArabic ? 'إغلاق' : 'Fermer'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          <BellRing className="h-8 w-8 animate-pulse" />
        </div>

        <p className="text-sm text-emerald-200/80">{heading}</p>
        <h2 className="mt-1 text-3xl font-black text-amber-300">{title}</h2>
        <p className="mt-1 text-lg font-bold tabular-nums text-white">{timeStr}</p>

        <button
          onClick={handleStop}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-black text-emerald-950 active:scale-95"
        >
          <VolumeX className="h-5 w-5" />
          {isArabic ? 'إيقاف الأذان' : "Arrêter l'Adhan"}
        </button>
      </div>
    </div>
  );
};
