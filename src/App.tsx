import React, { useEffect, useState, useMemo } from 'react';
import {
  Compass,
  CalendarDays,
  Sparkles,
  Share2,
  Heart,
  Volume2,
  Clock,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { DEFAULT_LOCATION } from './data/algeriaWilayas';
import { MUEZZIN_OPTIONS, DEFAULT_MUEZZIN_ID } from './data/muezzins';
import {
  calculatePrayerTimes,
  getNextPrayerStatus,
  calculateQibla,
  getHijriDate,
} from './services/prayerEngine';
import {
  Language,
  LocationConfig,
  PrayerKey,
  PrayerSettings,
} from './types/prayer';

import { Capacitor } from '@capacitor/core';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HeroNextPrayer } from './components/HeroNextPrayer';
import { PrayerTimesList } from './components/PrayerTimesList';
import { LocationSelectorModal } from './components/LocationSelectorModal';
import { SettingsModal } from './components/SettingsModal';
import { MonthlyCalendarModal } from './components/MonthlyCalendarModal';
import { QiblaCompassModal } from './components/QiblaCompassModal';
import { TasbihCounterModal } from './components/TasbihCounterModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AdhanModelSelectorModal } from './components/AdhanModelSelectorModal';
import { ActivePrayerAlertModal } from './components/ActivePrayerAlertModal';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { ActiveAlertData, notificationService } from './services/notificationService';

const INITIAL_SETTINGS: PrayerSettings = {
  language: 'ar',
  calculationMethod: 'MWL',
  madhab: 'shafi',
  preNotificationMinutes: 10,
  fullAdhanEnabled: true,
  selectedMuezzinId: DEFAULT_MUEZZIN_ID,
  silentMode: false,
  notificationsAllowed: true,
  hijriAdjustmentDays: 0,
  prayerSoundConfig: {
    fajr: { enabled: true, playAdhan: true },
    sunrise: { enabled: false, playAdhan: false },
    dhuhr: { enabled: true, playAdhan: true },
    asr: { enabled: true, playAdhan: true },
    maghrib: { enabled: true, playAdhan: true },
    isha: { enabled: true, playAdhan: true },
  },
  minuteOffsets: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
};

export const App: React.FC = () => {
  // Load initial states from localStorage if available
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adhan_lang');
      if (saved === 'fr' || saved === 'ar') return saved;
    }
    return 'ar';
  });

  const [location, setLocation] = useState<LocationConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('adhan_location');
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignored
      }
    }
    return DEFAULT_LOCATION;
  });

  const [settings, setSettings] = useState<PrayerSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('adhan_settings');
        if (saved) return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
      } catch {
        // Ignored
      }
    }
    return INITIAL_SETTINGS;
  });

  // Current system clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Audio state
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [audioVolume, setAudioVolume] = useState(notificationService.getVolume());
  const [currentMuezzin, setCurrentMuezzin] = useState(notificationService.getCurrentMuezzin());

  // Modals state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isQiblaModalOpen, setIsQiblaModalOpen] = useState(false);
  const [isTasbihModalOpen, setIsTasbihModalOpen] = useState(false);
  const [isAdhanModelModalOpen, setIsAdhanModelModalOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ActiveAlertData | null>(null);

  // Active Muezzin
  const activeMuezzin = useMemo(() => {
    return MUEZZIN_OPTIONS.find((m) => m.id === settings.selectedMuezzinId) || MUEZZIN_OPTIONS[0];
  }, [settings.selectedMuezzinId]);

  // Sync RTL / LTR on html document element
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('adhan_lang', language);
  }, [language]);

  // Dynamically configure safe area insets for Android system bars (status bar & 3-button nav)
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone);

    if (isNative) {
      document.documentElement.classList.add('is-native-app');
      document.documentElement.style.setProperty('--safe-top', '0px');
      document.documentElement.style.setProperty('--safe-bottom', '0.25rem');
    } else if (isStandalone) {
      document.documentElement.classList.add('is-standalone-pwa');
      document.documentElement.style.setProperty('--safe-top', 'max(env(safe-area-inset-top, 0px), 1.25rem)');
      document.documentElement.style.setProperty('--safe-bottom', 'max(env(safe-area-inset-bottom, 0px), 2rem)');
    } else {
      document.documentElement.style.setProperty('--safe-top', 'max(env(safe-area-inset-top, 0px), 0.75rem)');
      document.documentElement.style.setProperty('--safe-bottom', 'max(env(safe-area-inset-bottom, 0px), 1.75rem)');
    }
  }, []);

  // Persist location
  useEffect(() => {
    localStorage.setItem('adhan_location', JSON.stringify(location));
  }, [location]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('adhan_settings', JSON.stringify(settings));
  }, [settings]);

  // Live timer tick & Adhan alert monitor
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check upcoming alerts
      const todaysPrayers = calculatePrayerTimes(now, location, settings);
      todaysPrayers.forEach((p) => {
        if (p.key !== 'sunrise') {
          notificationService.checkAndTriggerPrayerAlert(
            p.key,
            p.titleAr,
            p.titleFr,
            p.time,
            settings
          );
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location, settings]);

  // Subscribe to audio changes
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      setIsPlayingAdhan(notificationService.getIsPlaying());
      setIsAudioBlocked(notificationService.getIsAudioBlocked());
      setCurrentMuezzin(notificationService.getCurrentMuezzin());
      setAudioVolume(notificationService.getVolume());
    });
    return unsubscribe;
  }, []);

  // Listen for active prayer alerts (live triggers & tests)
  useEffect(() => {
    const unsubscribe = notificationService.onAlertTrigger((data) => {
      setActiveAlert(data);
    });
    return unsubscribe;
  }, []);

  // Compute prayers
  const prayers = useMemo(() => {
    return calculatePrayerTimes(currentTime, location, settings);
  }, [currentTime, location, settings]);

  // Programmation des alarmes natives (10 jours à l'avance).
  // Dépend UNIQUEMENT de la position et des réglages (pas de l'horloge) ;
  // le service ignore les appels dont rien n'a changé.
  useEffect(() => {
    notificationService.scheduleNativePrayerAlarms(location, settings);

    // Reprogrammer au retour au premier plan (nouveau jour, redémarrage, etc.)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        notificationService.scheduleNativePrayerAlarms(location, settings);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [location, settings]);

  // Next prayer status
  const nextPrayerStatus = useMemo(() => {
    return getNextPrayerStatus(prayers, location, settings, currentTime);
  }, [prayers, location, settings, currentTime]);

  // Qibla angle
  const qiblaAngle = useMemo(() => {
    return calculateQibla(location.latitude, location.longitude);
  }, [location.latitude, location.longitude]);

  // Hijri date
  const hijriDate = useMemo(() => {
    return getHijriDate(currentTime, settings.hijriAdjustmentDays);
  }, [currentTime, settings.hijriAdjustmentDays]);

  // Handlers
  const handleToggleSilentMode = () => {
    setSettings((prev) => ({
      ...prev,
      silentMode: !prev.silentMode,
    }));
    if (!settings.silentMode) {
      notificationService.stopAudio();
    }
  };

  const handleTogglePrayerSound = (key: PrayerKey) => {
    setSettings((prev) => {
      const cur = prev.prayerSoundConfig[key] || { enabled: true, playAdhan: true };
      return {
        ...prev,
        prayerSoundConfig: {
          ...prev.prayerSoundConfig,
          [key]: {
            ...cur,
            enabled: !cur.enabled,
          },
        },
      };
    });
  };

  const handleToggleAdhanPlayback = (key: PrayerKey) => {
    setSettings((prev) => {
      const cur = prev.prayerSoundConfig[key] || { enabled: true, playAdhan: true };
      return {
        ...prev,
        prayerSoundConfig: {
          ...prev.prayerSoundConfig,
          [key]: {
            ...cur,
            playAdhan: !cur.playAdhan,
          },
        },
      };
    });
  };

  const handlePlayTestAdhan = () => {
    notificationService.triggerTestAlert(settings);
  };

  const handleStopAdhan = () => {
    notificationService.stopAudio();
  };

  const handleShareApp = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'آذان – Adhan مواقيت الصلاة',
        text: 'تطبيق مواقيت الصلاة والأذان في الجزائر والعالم',
        url: window.location.href,
      }).catch(() => {});
    }
  };

  const isArabic = language === 'ar';

  return (
    <div
      className="min-h-screen bg-islamic-pattern text-slate-100 flex flex-col selection:bg-amber-500 selection:text-emerald-950"
      style={{
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--safe-bottom, 0px)) + 5.5rem)',
      }}
    >
      {/* Autoplay unblock floating prompt if audio was blocked by browser policy */}
      {isAudioBlocked && (
        <div
          className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-emerald-950 font-bold shadow-2xl flex items-center justify-between gap-3 animate-bounce border-2 border-amber-200"
          style={{
            top: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 4.25rem)',
          }}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-black">
              {isArabic
                ? 'حان موعد الصلاة! إضغط لتشغيل صوت الأذان فوراً'
                : "C'est l'heure de la prière ! Touchez pour écouter l'Adhan"}
            </span>
          </div>
          <button
            onClick={() => {
              notificationService.unlockAudio();
              notificationService.playMuezzin(settings.selectedMuezzinId);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-950 text-amber-300 text-xs font-black cursor-pointer shadow flex-shrink-0 hover:bg-emerald-900 transition"
          >
            {isArabic ? 'تشغيل' : 'Écouter'}
          </button>
        </div>
      )}

      {/* Top sticky header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        hijriDate={hijriDate}
        currentTime={currentTime}
        silentMode={settings.silentMode}
        onToggleSilentMode={handleToggleSilentMode}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
        onOpenQibla={() => setIsQiblaModalOpen(true)}
        onOpenTasbih={() => setIsTasbihModalOpen(true)}
        isPlayingAdhan={isPlayingAdhan}
        onStopAdhan={handleStopAdhan}
      />

      {/* Main container */}
      <main className="max-w-4xl mx-auto w-full px-4 pt-4 sm:pt-6 space-y-6 flex-1">
        {/* Permission & Test Notification Banner */}
        <NotificationPermissionBanner
          language={language}
          settings={settings}
          onTestAlert={handlePlayTestAdhan}
        />

        {/* Hero Section: Mosque twilight, next prayer & countdown */}
        <HeroNextPrayer
          language={language}
          location={location}
          nextPrayer={nextPrayerStatus}
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
          isPlayingAdhan={isPlayingAdhan}
          onPlayTestAdhan={handlePlayTestAdhan}
          onStopAdhan={handleStopAdhan}
          onOpenQibla={() => setIsQiblaModalOpen(true)}
          qiblaAngle={qiblaAngle}
          selectedMuezzinName={isArabic ? activeMuezzin.nameAr.replace('النموذج ', 'نـ') : activeMuezzin.nameFr}
          onOpenAdhanSelector={() => setIsAdhanModelModalOpen(true)}
        />

        {/* 5 Prayers (+ Shuruq) List with sound controls */}
        <PrayerTimesList
          language={language}
          prayers={prayers}
          settings={settings}
          onTogglePrayerSound={handleTogglePrayerSound}
          onToggleAdhanPlayback={handleToggleAdhanPlayback}
          nextPrayerKey={nextPrayerStatus.key}
        />

        {/* Quick Tools & Shortcuts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* 4 Adhan Models Selector button */}
          <button
            onClick={() => setIsAdhanModelModalOpen(true)}
            className="p-3 rounded-2xl bg-emerald-950/90 border border-amber-500/50 hover:border-amber-400 hover:bg-emerald-900 transition flex flex-col items-center justify-center text-center gap-1.5 group cursor-pointer shadow-md ring-1 ring-amber-400/20"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center group-hover:scale-110 transition-transform font-bold">
              <Volume2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                {isArabic ? 'نماذج الأذان (4)' : 'Modèles d\'Adhan (4)'}
              </span>
              <span className="text-[10px] text-emerald-300/80 truncate block max-w-[110px]">
                {isArabic ? activeMuezzin.nameAr.split(':')[1]?.trim() || 'صوت بشري' : activeMuezzin.nameFr.split(':')[1]?.trim() || 'Voix pure'}
              </span>
            </div>
          </button>

          {/* Qibla button */}
          <button
            onClick={() => setIsQiblaModalOpen(true)}
            className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800/70 hover:border-amber-400/60 hover:bg-emerald-900/80 transition flex flex-col items-center justify-center text-center gap-1.5 group cursor-pointer shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {isArabic ? 'بوصلة القبلة' : 'Boussole Qibla'}
              </span>
              <span className="text-[10px] text-emerald-400/80">
                {isArabic ? `${qiblaAngle}° نحو مكة` : `${qiblaAngle}° vers Kaaba`}
              </span>
            </div>
          </button>

          {/* Tasbih button */}
          <button
            onClick={() => setIsTasbihModalOpen(true)}
            className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800/70 hover:border-amber-400/60 hover:bg-emerald-900/80 transition flex flex-col items-center justify-center text-center gap-1.5 group cursor-pointer shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {isArabic ? 'المسبحة والأذكار' : 'Tasbih & Dhikr'}
              </span>
              <span className="text-[10px] text-emerald-400/80">
                {isArabic ? 'عداد إلكتروني واهتزاز' : 'Compteur & vibrations'}
              </span>
            </div>
          </button>

          {/* Monthly Calendar */}
          <button
            onClick={() => setIsCalendarModalOpen(true)}
            className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800/70 hover:border-amber-400/60 hover:bg-emerald-900/80 transition flex flex-col items-center justify-center text-center gap-1.5 group cursor-pointer shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {isArabic ? 'إمساكية الشهر' : 'Calendrier mensuel'}
              </span>
              <span className="text-[10px] text-emerald-400/80">
                {isArabic ? 'عرض وطباعة وتصدير' : 'Afficher & exporter'}
              </span>
            </div>
          </button>
        </div>

        {/* Hadith / Spiritual Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-950/60 border border-amber-500/20 text-center space-y-2">
          <p className="font-quran text-base sm:text-lg font-bold text-amber-300 leading-relaxed">
            {isArabic
              ? '«أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ الصَّلَاةُ عَلَى وَقْتِهَا»'
              : '« Les actions les plus aimées d\'Allah sont la prière accomplie à son heure. »'}
          </p>
          <span className="text-xs text-emerald-400/80 block">
            {isArabic ? 'صحيح البخاري ومسلم' : 'Sahih Al-Bukhari & Muslim'}
          </span>
        </div>

        {/* Informative Features Footnote */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-emerald-200/80">
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              {isArabic
                ? 'حساب فلكي دقيق وفق وزارة الشؤون الدينية الجزائرية'
                : 'Calcul conforme aux normes officielles algériennes (MWL)'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              {isArabic
                ? 'أذان كامل وأصوات نقية مع تشغيل فوري بدون إنترنت'
                : 'Adhan complet et synthèse vocale utilisable hors-ligne'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              {isArabic
                ? '58 ولاية جزائرية مع البلديات وعواصم العالم'
                : '58 wilayas d\'Algérie avec communes et villes mondiales'}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-emerald-900/60 bg-emerald-950/80 py-6 text-center text-xs text-emerald-300/70">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 font-quran text-sm">
              آذان – أوقات الصلاة
            </span>
            <span className="text-emerald-500">·</span>
            <span>Adhan Prayer Times</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleShareApp}
              className="hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'مشاركة' : 'Partager'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Audio Player when Adhan is active */}
      <AudioPlayerBar
        isPlaying={isPlayingAdhan}
        muezzin={currentMuezzin}
        volume={audioVolume}
        onVolumeChange={(v) => notificationService.setVolume(v)}
        onStop={handleStopAdhan}
        language={language}
      />

      {/* Modals */}
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={setLocation}
        language={language}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        language={language}
      />

      <MonthlyCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        location={location}
        settings={settings}
        language={language}
      />

      <QiblaCompassModal
        isOpen={isQiblaModalOpen}
        onClose={() => setIsQiblaModalOpen(false)}
        location={location}
        qiblaAngle={qiblaAngle}
        language={language}
      />

      <TasbihCounterModal
        isOpen={isTasbihModalOpen}
        onClose={() => setIsTasbihModalOpen(false)}
        language={language}
      />

      <AdhanModelSelectorModal
        isOpen={isAdhanModelModalOpen}
        onClose={() => setIsAdhanModelModalOpen(false)}
        selectedMuezzinId={settings.selectedMuezzinId}
        onSelectMuezzin={(id) => setSettings((prev) => ({ ...prev, selectedMuezzinId: id }))}
        isPlaying={isPlayingAdhan}
        currentMuezzin={currentMuezzin}
        language={language}
      />

      <ActivePrayerAlertModal
        alertData={activeAlert}
        onClose={() => setActiveAlert(null)}
        language={language}
        settings={settings}
      />

      {/* Mobile persistent Bottom Navigation Bar */}
      <BottomNav
        language={language}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
        onOpenQibla={() => setIsQiblaModalOpen(true)}
        onOpenTasbih={() => setIsTasbihModalOpen(true)}
      />
    </div>
  );
};
export default App;
