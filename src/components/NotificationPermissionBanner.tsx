import { Capacitor } from '@capacitor/core';
import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Play,
  Volume2,
  X,
  Sparkles,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { Language, PrayerSettings } from '../types/prayer';

interface Props {
  language: Language;
  settings: PrayerSettings;
  onTestAlert: () => void;
}

export const NotificationPermissionBanner: React.FC<Props> = ({
  language,
  settings,
  onTestAlert,
}) => {
  const [status, setStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testHint, setTestHint] = useState(false);
  const [reliab, setReliab] = useState({ fullScreen: true, batteryOk: true });
  const isArabic = language === 'ar';

  const checkStatus = async () => {
    const s = await notificationService.getPermissionStatus();
    setStatus(s);
  };

  const checkReliability = async () => {
    setReliab(await notificationService.getReliabilityStatus());
  };

  useEffect(() => {
    checkStatus();
    checkReliability();
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkReliability();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestNotificationPermission();
    if (granted) {
      setStatus('granted');
    } else {
      setStatus('denied');
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    await onTestAlert();
    if (Capacitor.isNativePlatform()) {
      setTestHint(true);
      setTimeout(() => setTestHint(false), 15000);
    }
    setTimeout(() => setIsTesting(false), Capacitor.isNativePlatform() ? 12000 : 2000);
  };

  if (isDismissed) return null;

  // Case 1: Already granted -> quick test bar + reliability warnings (Android)
  if (status === 'granted') {
    return (
      <div className="w-full space-y-2">
        <div className="w-full bg-emerald-950/70 border border-emerald-800/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isArabic
                ? 'التنبيهات والأذان مفعلة تلقائياً للصلوات الخمس'
                : 'Notifications et Adhan actifs pour les 5 prières'}
            </span>
          </div>
          <button
            onClick={handleRunTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold transition cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isArabic ? 'تجربة التنبيه الآن' : 'Tester l\'alerte'}</span>
          </button>
        </div>

        {testHint && (
          <div className="w-full bg-emerald-900/70 border border-amber-400/40 rounded-2xl px-4 py-2.5 text-xs text-amber-200">
            {isArabic
              ? 'سيرن التنبيه بعد 10 ثوانٍ — اقفل الشاشة الآن للتأكد من أنها تضيء.'
              : "L'alerte arrive dans 10 secondes — verrouillez l'écran maintenant pour vérifier qu'il s'allume."}
          </div>
        )}

        {(!reliab.fullScreen || !reliab.batteryOk) && (
          <div className="w-full bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3 text-xs text-amber-100 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {isArabic
                  ? 'لضمان رنين الأذان في وقته بدقة، يرجى تفعيل الإعدادات التالية:'
                  : "Pour que l'Adhan sonne exactement à l'heure, activez les réglages suivants :"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!reliab.fullScreen && (
                <button
                  onClick={() => notificationService.openFullScreenSettings()}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-emerald-950 font-bold cursor-pointer"
                >
                  {isArabic ? 'السماح بإضاءة الشاشة عند الأذان' : "Autoriser l'écran à s'allumer (plein écran)"}
                </button>
              )}
              {!reliab.batteryOk && (
                <button
                  onClick={() => notificationService.openBatterySettings()}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-emerald-950 font-bold cursor-pointer"
                >
                  {isArabic ? 'استثناء من توفير البطارية' : "Désactiver l'optimisation batterie"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Case 2: Blocked / Denied
  if (status === 'denied') {
    return (
      <div className="w-full bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3 sm:p-4 text-xs text-amber-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-300 text-sm">
              {isArabic ? 'الإشعارات محظورة في جهازك' : 'Notifications bloquées dans votre appareil'}
            </h4>
            <p className="text-amber-200/80 mt-1 leading-relaxed">
              {isArabic
                ? 'يرجى النقر على أيقونة القفل أو الإعدادات بجوار شريط العنوان في المتصفح أو إعدادات التطبيق بالسماح بالإشعارات لسماع الأذان في وقته.'
                : 'Pour entendre l\'Adhan à l\'heure de prière, autorisez les notifications dans les paramètres de votre navigateur ou téléphone.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg hover:bg-amber-900/50 text-amber-400 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Case 3: Prompt / Not requested yet
  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border border-amber-400/50 p-4 shadow-lg text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0 animate-pulse">
          <BellRing className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm sm:text-base text-white">
            {isArabic ? 'تفعيل تنبيهات الصلاة وسماع الأذان' : 'Activer les alertes de prière & l\'Adhan'}
          </h4>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            {isArabic
              ? 'اضغط للسماح بالتنبيهات حتى يرن الأذان وتصلك الإشعارات فور دخول وقت كل صلاة.'
              : 'Autorisez les alertes pour recevoir l\'Adhan sonore et ne manquer aucune prière.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          onClick={handleRequestPermission}
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isArabic ? 'تفعيل الآن' : 'Activer maintenant'}</span>
        </button>
        <button
          onClick={handleRunTest}
          disabled={isTesting}
          className="px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-950 border border-emerald-700 text-emerald-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>{isArabic ? 'تجربة' : 'Tester'}</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-2 rounded-xl hover:bg-emerald-700/50 text-slate-300 hover:text-white cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
