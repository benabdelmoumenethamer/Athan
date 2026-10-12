import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Bell,
  Clock,
  Sliders,
  Play,
  Square,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Vibrate,
  RotateCw,
} from 'lucide-react';
import { MUEZZIN_OPTIONS } from '../data/muezzins';
import { notificationService } from '../services/notificationService';
import { CalculationMethodKey, Language, PrayerKey, PrayerSettings } from '../types/prayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: PrayerSettings;
  onUpdateSettings: (updater: (prev: PrayerSettings) => PrayerSettings) => void;
  language: Language;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  language,
}) => {
  const isArabic = language === 'ar';
  const [testingMuezzinId, setTestingMuezzinId] = useState<string | null>(null);
  const [hasNotifPermission, setHasNotifPermission] = useState(
    notificationService.hasNotificationPermission()
  );
  const [ringerMode, setRingerMode] = useState<'normal' | 'vibrate' | 'silent'>(() =>
    notificationService.getPhoneRingerMode()
  );
  const [isRefreshingRinger, setIsRefreshingRinger] = useState(false);
  const [isTestingAlert, setIsTestingAlert] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      notificationService.fetchPhoneRingerStatus().then((s) => setRingerMode(s.mode));
    }
  }, [isOpen]);

  const handleRefreshRinger = async () => {
    setIsRefreshingRinger(true);
    const s = await notificationService.fetchPhoneRingerStatus();
    setRingerMode(s.mode);
    setTimeout(() => setIsRefreshingRinger(false), 400);
  };

  const handleTestPhoneStateAlert = async () => {
    setIsTestingAlert(true);
    await notificationService.triggerTestAlert(settings);
    setTimeout(() => setIsTestingAlert(false), 1500);
  };

  if (!isOpen) return null;

  const handleTestAudio = async (muezzinId: string) => {
    if (testingMuezzinId === muezzinId) {
      notificationService.stopAudio();
      setTestingMuezzinId(null);
    } else {
      setTestingMuezzinId(muezzinId);
      await notificationService.playMuezzin(muezzinId);
    }
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await notificationService.requestNotificationPermission();
    setHasNotifPermission(granted);
    if (granted) {
      notificationService.sendNotification(
        isArabic ? 'تم تفعيل التنبيهات بنجاح!' : 'Notifications activées avec succès !',
        {
          body: isArabic
            ? 'ستصلك تذكيرات أوقات الصلاة في موعدها المحدد بإذن الله.'
            : 'Vous recevrez les rappels d\'adhan à l\'heure exacte.',
        }
      );
    }
  };

  const PRAYER_KEYS: { key: PrayerKey; nameAr: string; nameFr: string }[] = [
    { key: 'fajr', nameAr: 'الفجر', nameFr: 'Fajr' },
    { key: 'sunrise', nameAr: 'الشروق', nameFr: 'Chourouk' },
    { key: 'dhuhr', nameAr: 'الظهر', nameFr: 'Dhuhr' },
    { key: 'asr', nameAr: 'العصر', nameFr: 'Asr' },
    { key: 'maghrib', nameAr: 'المغرب', nameFr: 'Maghrib' },
    { key: 'isha', nameAr: 'العشاء', nameFr: 'Isha' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 0.5rem)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 0.5rem)',
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-emerald-950 border border-amber-500/40 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isArabic ? 'إعدادات التطبيق والأذان' : 'Paramètres & Personnalisation'}
              </h3>
              <p className="text-xs text-emerald-300/80">
                {isArabic
                  ? 'طريقة الحساب، التنبيهات، أصوات الأذان والتقويم'
                  : 'Méthode de calcul, notifications, muezzin et ajustements'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              notificationService.stopAudio();
              setTestingMuezzinId(null);
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-emerald-800/60 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Notification Permission Card */}
          <div className="p-4 rounded-2xl bg-emerald-900/40 border border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  hasNotifPermission
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {hasNotifPermission ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {hasNotifPermission
                    ? isArabic
                      ? 'إذن الإشعارات مفعل'
                      : 'Autorisation des notifications active'
                    : isArabic
                    ? 'تفعيل إشعارات وتنبيهات الأذان'
                    : 'Autoriser les notifications d\'Adhan'}
                </h4>
                <p className="text-xs text-emerald-300/80">
                  {isArabic
                    ? 'ضروري لتنبيهك عند وقت الصلاة وقبلها حتى عند قفل الهاتف'
                    : 'Nécessaire pour recevoir les rappels avant et à l\'heure de la prière'}
                </p>
              </div>
            </div>

            {hasNotifPermission ? (
              <button
                onClick={() => notificationService.triggerTestAlert(settings)}
                className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-amber-300 font-bold text-xs border border-emerald-600 transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تجربة التنبيه الآن' : 'Tester l\'alerte'}</span>
              </button>
            ) : (
              <button
                onClick={handleRequestNotificationPermission}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs shadow-md transition cursor-pointer flex-shrink-0"
              >
                {isArabic ? 'منح الإذن الآن' : 'Autoriser'}
              </button>
            )}
          </div>

          {/* Phone State Integration Card (Suivi de l'état du téléphone) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/60 to-emerald-950 border-2 border-amber-400/50 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {isArabic ? 'مزامنة حالة الهاتف الفعلي (صوت الأذان)' : 'Synchronisation de l\'état réel du téléphone'}
                  </h4>
                  <p className="text-[11px] text-emerald-300/80">
                    {isArabic
                      ? 'يتبع صوت الأذان تلقائياً وضع هاتفك: رنين، اهتزاز، أو صامت'
                      : 'L\'Adhan respecte automatiquement le mode réel : sonnerie, vibreur ou silence'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleRefreshRinger}
                disabled={isRefreshingRinger}
                title={isArabic ? 'تحديث فحص حالة الهاتف' : 'Actualiser l\'état'}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-amber-300 transition cursor-pointer flex items-center gap-1 text-xs border border-emerald-700/60"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshingRinger ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">{isArabic ? 'فحص الحالة' : 'Actualiser'}</span>
              </button>
            </div>

            {/* Current State Indicator */}
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center gap-3">
              {ringerMode === 'vibrate' ? (
                <>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Vibrate className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-amber-300 block">
                      {isArabic ? '📳 وضع الهاتف: اهتزاز (Vibreur)' : '📳 Mode actuel : Vibreur'}
                    </span>
                    <span className="text-[11px] text-emerald-200/90 leading-tight block">
                      {isArabic
                        ? 'عند حلول الصلاة: سيهتز هاتفك فقط بدون إصدار أي صوت (احتراماً لوضع الاهتزاز).'
                        : 'À l\'heure de la prière : le téléphone vibrera sans sonnerie.'}
                    </span>
                  </div>
                </>
              ) : ringerMode === 'silent' ? (
                <>
                  <div className="w-9 h-9 rounded-xl bg-slate-700/50 text-slate-300 flex items-center justify-center flex-shrink-0">
                    <VolumeX className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-200 block">
                      {isArabic ? '🔕 وضع الهاتف: صامت (Silencieux)' : '🔕 Mode actuel : Silencieux'}
                    </span>
                    <span className="text-[11px] text-emerald-300/80 leading-tight block">
                      {isArabic
                        ? 'عند حلول الصلاة: الأذان صامت تماماً احتراما لوضع الهاتف الصامت.'
                        : 'À l\'heure de la prière : l\'Adhan sera totalement silencieux.'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <Volume2 className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-emerald-300 block">
                      {isArabic ? '🔔 وضع الهاتف: رنّان (Sonnerie normale)' : '🔔 Mode actuel : Sonnerie normale'}
                    </span>
                    <span className="text-[11px] text-emerald-200/90 leading-tight block">
                      {isArabic
                        ? 'صوت الأذان يتبع نغمة الهاتف ومسموع حتى لو كان صوت الوسائط (Multimedia) على 0.'
                        : 'L\'Adhan retentira au volume de sonnerie, même si le son multimédia est à 0.'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleTestPhoneStateAlert}
              disabled={isTestingAlert}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {isArabic
                  ? 'اختبار صوت الأذان بحسب الوضع الحالي للهاتف'
                  : 'Tester l\'Adhan selon l\'état actuel du téléphone'}
              </span>
            </button>
          </div>

          {/* 1. 4 Authentic Adhan Models Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <span>{isArabic ? 'نماذج الأذان الأربعة المتاحة' : 'Les 4 Modèles d\'Adhan Vocaux'}</span>
              </label>
              <span className="text-xs text-emerald-400 font-semibold">
                {isArabic ? 'صوت بشري خالص 100%' : '100% Voix humaine'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {isArabic
                ? 'أذان شرعي مسجل بأصوات كبار المؤذنين في الحرمين والجامع الأعظم والقدس، بدون أي مؤثرات أو آلات موسيقية.'
                : 'Enregistrements authentiques des grands muezzins des Lieux Saints, sans aucun instrument de musique.'}
            </p>

            <div className="space-y-2">
              {MUEZZIN_OPTIONS.map((muezzin) => {
                const isSelected = settings.selectedMuezzinId === muezzin.id;
                const isPlayingThis = testingMuezzinId === muezzin.id;

                return (
                  <div
                    key={muezzin.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isSelected
                        ? 'bg-emerald-900/90 border-amber-400'
                        : 'bg-emerald-900/30 border-emerald-800/60 hover:border-emerald-700'
                    }`}
                  >
                    <div
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          selectedMuezzinId: muezzin.id,
                        }))
                      }
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400'
                            : 'border-slate-500'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-950" />
                        )}
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-100">
                          {isArabic ? muezzin.nameAr : muezzin.nameFr}
                        </h5>
                        <p className="text-[11px] text-emerald-300/80">
                          {isArabic ? muezzin.placeAr : muezzin.placeFr}
                        </p>
                      </div>
                    </div>

                    {/* Test Audio Button */}
                    <button
                      onClick={() => handleTestAudio(muezzin.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        isPlayingThis
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-emerald-800/80 hover:bg-emerald-700 text-amber-300 border border-emerald-700'
                      }`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>{isArabic ? 'إيقاف' : 'Stop'}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isArabic ? 'تجربة' : 'Écouter'}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Pre-prayer alert delay */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{isArabic ? 'التنبيه قبل الصلاة' : 'Rappel avant l\'heure de prière'}</span>
            </label>
            <p className="text-xs text-emerald-300/80">
              {isArabic
                ? 'إشعار تذكيري للاستعداد للوضوء والتوجه إلى المسجد'
                : 'Notification pour se préparer et accomplir les ablutions'}
            </p>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {[0, 5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      preNotificationMinutes: mins,
                    }))
                  }
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                    settings.preNotificationMinutes === mins
                      ? 'bg-amber-400 text-emerald-950 shadow-md shadow-amber-400/20'
                      : 'bg-emerald-900/50 text-slate-300 hover:bg-emerald-900 border border-emerald-800'
                  }`}
                >
                  {mins === 0
                    ? isArabic
                      ? 'معطل'
                      : 'Désactivé'
                    : isArabic
                    ? `${mins} دقائق`
                    : `${mins} min`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Full Adhan Toggle & Silent Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-800/70 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  {isArabic ? 'تشغيل الأذان كاملاً' : 'Son complet de l\'Adhan'}
                </span>
                <span className="text-[11px] text-emerald-300/70">
                  {isArabic ? 'عند دخول وقت الصلاة' : 'À l\'heure exacte de la prière'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.fullAdhanEnabled}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    fullAdhanEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-800/70 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  {isArabic ? 'الوضع الصامت العام' : 'Mode silencieux'}
                </span>
                <span className="text-[11px] text-emerald-300/70">
                  {isArabic ? 'كتم جميع الأصوات مؤقتاً' : 'Couper tous les sons'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.silentMode}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    silentMode: e.target.checked,
                  }))
                }
                className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* 4. Calculation Method */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>{isArabic ? 'طريقة حساب المواقيت' : 'Méthode de calcul astronomique'}</span>
            </label>
            <p className="text-xs text-emerald-300/80">
              {isArabic
                ? 'الطريقة الرسمية المعتمدة في الجزائر هي رابطة العالم الإسلامي (فجر 18° وعشاء 17°)'
                : 'La méthode officielle en Algérie est la Ligue Islamique Mondiale (Fajr 18°, Isha 17°)'}
            </p>

            <select
              value={settings.calculationMethod}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  calculationMethod: e.target.value as CalculationMethodKey,
                }))
              }
              className="w-full bg-emerald-900/70 border border-emerald-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="MWL">
                {isArabic
                  ? 'رابطة العالم الإسلامي (معتمد في الجزائر: فجر 18° / عشاء 17°)'
                  : 'Ligue Islamique Mondiale (Officiel Algérie : Fajr 18° / Isha 17°)'}
              </option>
              <option value="Egyptian">
                {isArabic
                  ? 'الهيئة المصرية العامة للمساحة (فجر 19.5° / عشاء 17.5°)'
                  : 'Autorité Générale Égyptienne (Fajr 19.5° / Isha 17.5°)'}
              </option>
              <option value="UmmAlQura">
                {isArabic ? 'جامعة أم القرى (مكة المكرمة)' : 'Oumm Al-Qoura (Makkah)'}
              </option>
              <option value="Dubai">
                {isArabic ? 'دبي والإمارات' : 'Dubaï (EAU)'}
              </option>
              <option value="NorthAmerica">
                {isArabic ? 'أمريكا الشمالية (ISNA)' : 'Amérique du Nord (ISNA)'}
              </option>
            </select>
          </div>

          {/* 5. Madhab for Asr calculation */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-amber-300">
              {isArabic ? 'المذهب الفقهي لحساب العصر' : 'Méthode de calcul du Asr (Madhab)'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onUpdateSettings((prev) => ({ ...prev, madhab: 'shafi' }))
                }
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                  settings.madhab === 'shafi'
                    ? 'bg-amber-400 text-emerald-950'
                    : 'bg-emerald-900/50 text-slate-300 hover:bg-emerald-900 border border-emerald-800'
                }`}
              >
                {isArabic ? 'المالكي / الشافعي / الحنبلي (طول الظل 1)' : 'Malékite / Chaféite (Standard: ombre 1)'}
              </button>
              <button
                onClick={() =>
                  onUpdateSettings((prev) => ({ ...prev, madhab: 'hanafi' }))
                }
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                  settings.madhab === 'hanafi'
                    ? 'bg-amber-400 text-emerald-950'
                    : 'bg-emerald-900/50 text-slate-300 hover:bg-emerald-900 border border-emerald-800'
                }`}
              >
                {isArabic ? 'الحنفي (طول الظل 2)' : 'Hanafite (Ombre = 2)'}
              </button>
            </div>
          </div>

          {/* 6. Hijri Adjustment Days */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-amber-300">
              {isArabic ? 'تعديل التقويم الهجري (رؤية الهلال)' : 'Ajustement du calendrier hégirien (Vision lunaire)'}
            </label>
            <div className="flex items-center gap-2">
              {[-2, -1, 0, 1, 2].map((adj) => (
                <button
                  key={adj}
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      hijriAdjustmentDays: adj,
                    }))
                  }
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    settings.hijriAdjustmentDays === adj
                      ? 'bg-amber-400 text-emerald-950'
                      : 'bg-emerald-900/50 text-slate-300 hover:bg-emerald-900 border border-emerald-800'
                  }`}
                >
                  {adj > 0 ? `+${adj}` : adj === 0 ? '0' : `${adj}`}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Fine-tuning minutes per prayer */}
          <div className="space-y-2 border-t border-emerald-800/60 pt-4">
            <label className="text-sm font-bold text-amber-300">
              {isArabic ? 'تعديل الدقائق يدوياً لكل صلاة' : 'Ajustement fin en minutes par prière'}
            </label>
            <p className="text-xs text-emerald-300/80">
              {isArabic
                ? 'إذا كانت هناك فروقات طفيفة بين الحساب والمؤذن المحلي لمسجدك'
                : 'Pour accorder parfaitement l\'heure avec la mosquée de votre quartier'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {PRAYER_KEYS.map((p) => {
                const currentOffset = settings.minuteOffsets?.[p.key] || 0;
                return (
                  <div
                    key={p.key}
                    className="p-2.5 rounded-xl bg-emerald-900/30 border border-emerald-800 flex items-center justify-between"
                  >
                    <span className="text-xs font-semibold text-slate-200">
                      {isArabic ? p.nameAr : p.nameFr}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            minuteOffsets: {
                              ...prev.minuteOffsets,
                              [p.key]: (prev.minuteOffsets?.[p.key] || 0) - 1,
                            },
                          }))
                        }
                        className="w-5 h-5 rounded bg-emerald-800 text-white font-bold text-xs flex items-center justify-center hover:bg-emerald-700"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold text-amber-300 w-6 text-center">
                        {currentOffset > 0 ? `+${currentOffset}` : currentOffset}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            minuteOffsets: {
                              ...prev.minuteOffsets,
                              [p.key]: (prev.minuteOffsets?.[p.key] || 0) + 1,
                            },
                          }))
                        }
                        className="w-5 h-5 rounded bg-emerald-800 text-white font-bold text-xs flex items-center justify-center hover:bg-emerald-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-800/80 bg-emerald-950 flex justify-end">
          <button
            onClick={() => {
              notificationService.stopAudio();
              setTestingMuezzinId(null);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            {isArabic ? 'حفظ وإغلاق' : 'Enregistrer & Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};
