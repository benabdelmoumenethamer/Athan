import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { MUEZZIN_OPTIONS } from '../data/muezzins';
import { calculatePrayerTimes } from './prayerEngine';
import { LocationConfig, MuezzinOption, PrayerKey, PrayerSettings } from '../types/prayer';

const FALLBACK_CDN_URLS: Record<string, string> = {
  makkah: 'https://cdn.aladhan.com/audio/adhans/a2.mp3',
  madinah: 'https://cdn.aladhan.com/audio/adhans/a3.mp3',
  algeria: 'https://cdn.aladhan.com/audio/adhans/a1.mp3',
  alaqsa: 'https://cdn.aladhan.com/audio/adhans/a4.mp3',
};

export interface ActiveAlertData {
  key: PrayerKey;
  titleAr: string;
  titleFr: string;
  time: Date;
  isTest?: boolean;
}

export type AlertCallback = (data: ActiveAlertData) => void;

export interface PhoneRingerStatus {
  mode: 'normal' | 'vibrate' | 'silent';
  canPlaySound: boolean;
  shouldVibrate: boolean;
  ringVolume: number;
  mediaVolume: number;
}

export interface AdhanAudioPluginInterface {
  getRingerMode(): Promise<PhoneRingerStatus & { ringerModeInt: number }>;
  playAdhan(options: { soundName: string }): Promise<{
    status: 'playing' | 'vibrate' | 'silent' | 'error';
    mode: 'normal' | 'vibrate' | 'silent';
    soundName?: string;
    playedSound?: boolean;
    vibrated?: boolean;
    message?: string;
  }>;
  stopAdhan(): Promise<{ status: string }>;
  isPlaying(): Promise<{ isPlaying: boolean }>;
  isIgnoringBatteryOptimizations(): Promise<{ ignoring: boolean }>;
  openBatterySettings(): Promise<void>;
}

const SCHEDULE_DAYS_AHEAD = 10;
const PRE_CHANNEL_ID = 'adhan_pre_v1';
const OLD_CHANNEL_IDS = ['adhan_prayers_channel', 'adhan_prayers_channel_v2', 'adhan_prayers_channel_v3', 'adhan_prayers_channel_v4'];

/** Un canal par muezzin : sur Android 8+, le son est défini par le canal, pas par la notification. */
export function channelIdForMuezzin(muezzinId: string): string {
  const known = MUEZZIN_OPTIONS.some((m) => m.id === muezzinId);
  return `adhan_${known ? muezzinId : 'algeria'}_v5`;
}

function soundFileForMuezzin(muezzinId: string): string {
  const known = MUEZZIN_OPTIONS.some((m) => m.id === muezzinId);
  return `adhan_${known ? muezzinId : 'algeria'}.mp3`;
}

const AdhanAudio = registerPlugin<AdhanAudioPluginInterface>('AdhanAudio');

class AudioAndNotificationManager {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private currentMuezzin: MuezzinOption | null = null;
  private isPlaying = false;
  private isVibrating = false;
  private isAudioBlocked = false;
  private phoneRingerMode: 'normal' | 'vibrate' | 'silent' = 'normal';
  private ringVolume = 1.0;
  private volume = 1.0;
  private listeners: Set<() => void> = new Set();
  private alertListeners: Set<AlertCallback> = new Set();
  private audioUnlocked = false;
  private channelCreated = false;
  private nativeListenersAttached = false;
  private channelsPromise: Promise<void> | null = null;
  private scheduleQueue: Promise<void> = Promise.resolve();
  private lastScheduleSignature = '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
      this.attachAudioUnlockListeners();
      this.initNativeChannel();
      this.initNativeListeners();
      this.fetchPhoneRingerStatus().catch(() => {});
    }
  }

  private initAudioElement() {
    if (this.audioElement) return;
    this.audioElement = new Audio();
    this.audioElement.volume = this.volume;
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.isVibrating = false;
      this.isAudioBlocked = false;
      this.notifyListeners();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyListeners();
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.isVibrating = false;
      this.notifyListeners();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Primary audio source failed, attempting CDN fallback:', e);
      if (this.currentMuezzin && this.audioElement) {
        const fallbackUrl = FALLBACK_CDN_URLS[this.currentMuezzin.id];
        if (fallbackUrl && this.audioElement.src !== fallbackUrl) {
          this.audioElement.src = fallbackUrl;
          this.audioElement.play().catch((err) => {
            console.error('Fallback Adhan playback error:', err);
            this.isPlaying = false;
            this.isAudioBlocked = true;
            this.notifyListeners();
          });
          return;
        }
      }
      this.isPlaying = false;
      this.notifyListeners();
    });
  }

  /**
   * Unlock Audio Autoplay policy on first user interaction (touch, click, pointer)
   */
  public attachAudioUnlockListeners() {
    if (typeof window === 'undefined') return;
    const unlockHandler = () => {
      this.unlockAudio();
    };
    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
    window.addEventListener('pointerdown', unlockHandler, { passive: true });
  }

  public unlockAudio(): void {
    if (this.audioUnlocked) return;
    try {
      this.initAudioElement();

      // 1. Resume Web Audio API context if suspended
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx && !this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      // 2. Play silent micro-buffer on HTMLAudioElement
      if (this.audioElement) {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        silentAudio.volume = 0.01;
        silentAudio.play().then(() => {
          this.audioUnlocked = true;
          this.isAudioBlocked = false;
          this.notifyListeners();
        }).catch(() => {
          // Will retry on next interaction
        });
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Crée (une seule fois) un canal par muezzin + un canal discret pour les rappels.
   * Les canaux existants ne sont jamais supprimés : l'utilisateur peut les personnaliser.
   */
  private initNativeChannel(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return Promise.resolve();
    if (this.channelsPromise) return this.channelsPromise;

    this.channelsPromise = (async () => {
      for (const id of OLD_CHANNEL_IDS) {
        try {
          await LocalNotifications.deleteChannel({ id });
        } catch {
          // Ignored
        }
      }
      try {
        for (const m of MUEZZIN_OPTIONS) {
          await LocalNotifications.createChannel({
            id: channelIdForMuezzin(m.id),
            name: `آذان – ${m.nameFr}`,
            description: 'تنبيهات وأصوات الأذان للصلوات الخمس المفروضة',
            importance: 5,
            visibility: 1,
            sound: soundFileForMuezzin(m.id),
            vibration: true,
            lights: true,
            lightColor: '#064E3B',
          });
        }
        await LocalNotifications.createChannel({
          id: PRE_CHANNEL_ID,
          name: 'Rappels avant la prière',
          description: 'Rappel discret quelques minutes avant l\'Adhan',
          importance: 4,
          visibility: 1,
          vibration: true,
        });
        this.channelCreated = true;
      } catch (e) {
        console.warn('Could not create Android notification channels:', e);
        this.channelsPromise = null; // permet une nouvelle tentative
      }
    })();
    return this.channelsPromise;
  }

  /**
   * Query the physical phone ringer state (Normal, Vibrate, Silent) via native AdhanAudio plugin
   */
  public async fetchPhoneRingerStatus(): Promise<PhoneRingerStatus> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await AdhanAudio.getRingerMode();
        this.phoneRingerMode = res.mode;
        this.ringVolume = res.ringVolume ?? 1.0;
        this.notifyListeners();
        return {
          mode: res.mode,
          canPlaySound: res.canPlaySound,
          shouldVibrate: res.shouldVibrate,
          ringVolume: res.ringVolume,
          mediaVolume: res.mediaVolume,
        };
      } catch (e) {
        console.warn('Could not query native ringer mode:', e);
      }
    }

    return {
      mode: this.phoneRingerMode,
      canPlaySound: true,
      shouldVibrate: false,
      ringVolume: 1.0,
      mediaVolume: 1.0,
    };
  }

  /**
   * Listen to native notification taps to start Adhan audio when user opens the app via notification
   */
  private initNativeListeners() {
    if (!Capacitor.isNativePlatform() || this.nativeListenersAttached) return;

    try {
      // Le son de l'Adhan est joué par le canal de notification (respecte le mode sonnerie du téléphone).
      // Ici on affiche seulement l'alerte visuelle pour éviter une double lecture.
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification.extra;
        if (!extra?.prayerKey) return;
        this.notifyAlertListeners({
          key: extra.prayerKey as PrayerKey,
          titleAr: extra.prayerTitleAr || 'الصلاة',
          titleFr: extra.prayerTitleFr || 'Prière',
          time: new Date(),
        });
      });

      // Poll ringer status when app resumes focus
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
          this.fetchPhoneRingerStatus().catch(() => {});
        });
      }

      this.nativeListenersAttached = true;
    } catch (e) {
      console.warn('Could not attach native notification listeners:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onAlertTrigger(callback: AlertCallback): () => void {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  public notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  public notifyAlertListeners(data: ActiveAlertData) {
    this.alertListeners.forEach((l) => l(data));
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsVibrating(): boolean {
    return this.isVibrating;
  }

  public getPhoneRingerMode(): 'normal' | 'vibrate' | 'silent' {
    return this.phoneRingerMode;
  }

  public getRingVolume(): number {
    return this.ringVolume;
  }

  public getIsAudioBlocked(): boolean {
    return this.isAudioBlocked;
  }

  public getCurrentMuezzin(): MuezzinOption | null {
    return this.currentMuezzin;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    this.notifyListeners();
  }

  /**
   * Check current permission status
   */
  public async getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
    if (typeof window === 'undefined') return 'denied';

    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'granted') return 'granted';
        if (perm.display === 'denied') return 'denied';
        return 'prompt';
      } catch {
        return 'prompt';
      }
    }

    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  /**
   * Request system notification permission (Native Android or Web)
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.unlockAudio();

    if (Capacitor.isNativePlatform()) {
      try {
        await this.initNativeChannel();
        const perm = await LocalNotifications.requestPermissions();
        return perm.display === 'granted';
      } catch (err) {
        console.warn('Native permission request error:', err);
        return false;
      }
    }

    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  public hasNotificationPermission(): boolean {
    if (typeof window === 'undefined') return false;
    if (Capacitor.isNativePlatform()) return true;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  /** Vérifie les réglages qui conditionnent la fiabilité des alarmes (Android uniquement). */
  public async getReliabilityStatus(): Promise<{ exactAlarm: boolean; batteryOk: boolean }> {
    if (!Capacitor.isNativePlatform()) return { exactAlarm: true, batteryOk: true };
    let exactAlarm = true;
    let batteryOk = true;
    try {
      const r = await LocalNotifications.checkExactNotificationSetting();
      exactAlarm = r.exact_alarm === 'granted';
    } catch {
      // Ignored
    }
    try {
      const r = await AdhanAudio.isIgnoringBatteryOptimizations();
      batteryOk = r.ignoring;
    } catch {
      // Ignored
    }
    return { exactAlarm, batteryOk };
  }

  public async openExactAlarmSettings(): Promise<void> {
    try {
      await LocalNotifications.changeExactNotificationSetting();
    } catch (e) {
      console.warn('Cannot open exact alarm settings:', e);
    }
  }

  public async openBatterySettings(): Promise<void> {
    try {
      await AdhanAudio.openBatterySettings();
    } catch (e) {
      console.warn('Cannot open battery settings:', e);
    }
  }

  /**
   * Programme les alarmes natives pour les N prochains jours.
   * - Appels sérialisés (pas de course entre annulation et programmation)
   * - Ignoré si rien n'a changé depuis la dernière programmation
   */
  public scheduleNativePrayerAlarms(location: LocationConfig, settings: PrayerSettings): Promise<void> {
    if (!Capacitor.isNativePlatform()) return Promise.resolve();
    this.scheduleQueue = this.scheduleQueue
      .then(() => this.doSchedule(location, settings))
      .catch((err) => console.warn('Native prayer scheduling error:', err));
    return this.scheduleQueue;
  }

  private async doSchedule(location: LocationConfig, settings: PrayerSettings): Promise<void> {
    const todayKey = new Date().toDateString();
    const signature = JSON.stringify({
      d: todayKey,
      lat: location.latitude,
      lng: location.longitude,
      m: settings.calculationMethod,
      h: settings.madhab,
      o: settings.minuteOffsets,
      pre: settings.preNotificationMinutes,
      mu: settings.selectedMuezzinId,
      sc: settings.prayerSoundConfig,
      lang: settings.language,
      silent: settings.silentMode,
    });
    if (signature === this.lastScheduleSignature) return;

    await this.initNativeChannel();

    // Toujours annuler l'existant (y compris en mode silencieux)
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    if (settings.silentMode) {
      this.lastScheduleSignature = signature;
      return;
    }

    const isArabic = settings.language === 'ar';
    const muezzinId = settings.selectedMuezzinId || 'algeria';
    const channelId = channelIdForMuezzin(muezzinId);
    const prayerKeys: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const now = Date.now();

    const toSchedule: {
      id: number;
      title: string;
      body: string;
      schedule: { at: Date; allowWhileIdle: boolean };
      channelId: string;
      sound?: string;
      extra?: Record<string, unknown>;
    }[] = [];

    for (let day = 0; day < SCHEDULE_DAYS_AHEAD; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(12, 0, 0, 0);
      const prayers = calculatePrayerTimes(date, location, settings);

      for (const prayer of prayers) {
        if (!prayerKeys.includes(prayer.key)) continue;
        if (!settings.prayerSoundConfig[prayer.key]?.enabled) continue;

        const idx = prayerKeys.indexOf(prayer.key);
        const prayerTitle = isArabic ? prayer.titleAr : prayer.titleFr;
        const at = new Date(prayer.time);

        if (at.getTime() > now) {
          toSchedule.push({
            id: day * 100 + idx * 10 + 1,
            title: isArabic ? `حان الآن موعد صلاة ${prayerTitle}` : `C'est l'heure de la prière de ${prayerTitle}`,
            body: isArabic ? 'حي على الصلاة، حي على الفلاح' : 'Accourez à la prière, accourez au succès',
            schedule: { at, allowWhileIdle: true },
            channelId,
            sound: soundFileForMuezzin(muezzinId),
            extra: {
              prayerKey: prayer.key,
              prayerTitleAr: prayer.titleAr,
              prayerTitleFr: prayer.titleFr,
              muezzinId,
            },
          });
        }

        if (settings.preNotificationMinutes > 0) {
          const preAt = new Date(at.getTime() - settings.preNotificationMinutes * 60000);
          if (preAt.getTime() > now) {
            toSchedule.push({
              id: day * 100 + idx * 10 + 2,
              title: isArabic ? `اقتراب صلاة ${prayerTitle}` : `Rappel : prière de ${prayerTitle} imminente`,
              body: isArabic
                ? `بقي ${settings.preNotificationMinutes} دقيقة على موعد الأذان`
                : `Plus que ${settings.preNotificationMinutes} minutes avant l'Adhan`,
              schedule: { at: preAt, allowWhileIdle: true },
              channelId: PRE_CHANNEL_ID,
            });
          }
        }
      }
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
    this.lastScheduleSignature = signature;
  }

  /**
   * Send a system notification (Web / Service Worker / Native)
   */
  public async sendNotification(
    title: string,
    options: NotificationOptions & { soundFile?: string } = {}
  ): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await this.initNativeChannel();
        const muezzinMatch = options.soundFile?.match(/^adhan_(.+)\.mp3$/);
        const useAdhanChannel = !!muezzinMatch;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 900000 + (Date.now() % 90000),
              title,
              body: (options.body as string) || '',
              schedule: { at: new Date(Date.now() + 100) },
              channelId: useAdhanChannel ? channelIdForMuezzin(muezzinMatch![1]) : PRE_CHANNEL_ID,
              ...(useAdhanChannel ? { sound: options.soundFile } : {}),
            },
          ],
        });
        return;
      } catch (e) {
        console.warn('Native immediate notification error:', e);
      }
    }

    // Web vibration fallback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 1000]);
      } catch {
        // Ignored
      }
    }

    if (!this.hasNotificationPermission()) return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          ...options,
        });
      } else {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          ...options,
        });
      }
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }

  /**
   * Plays authentic Muezzin recitation.
   * On Native Android:
   *  - Respects physical phone ringer state (Normal, Vibrate, Silent)
   *  - In Normal mode: routes through STREAM_RING / USAGE_NOTIFICATION_RINGTONE so it is audible
   *    even if multimedia volume is 0!
   *  - In Vibrate mode: vibrates phone without sound
   *  - In Silent mode: remains completely silent
   */
  public async playMuezzin(muezzinId: string): Promise<void> {
    const muezzin = MUEZZIN_OPTIONS.find((m) => m.id === muezzinId) || MUEZZIN_OPTIONS[0];
    this.currentMuezzin = muezzin;

    // 1. Try Native Android AdhanAudio Plugin first
    if (Capacitor.isNativePlatform()) {
      try {
        const soundBase = `adhan_${muezzin.id || 'algeria'}`;
        const res = await AdhanAudio.playAdhan({ soundName: soundBase });
        this.phoneRingerMode = res.mode;

        if (res.status === 'playing') {
          this.isPlaying = true;
          this.isVibrating = false;
          this.isAudioBlocked = false;
          this.notifyListeners();
          return;
        } else if (res.status === 'vibrate') {
          this.isPlaying = false;
          this.isVibrating = true;
          this.isAudioBlocked = false;
          this.notifyListeners();
          return;
        } else if (res.status === 'silent') {
          this.isPlaying = false;
          this.isVibrating = false;
          this.isAudioBlocked = false;
          this.notifyListeners();
          return;
        }
      } catch (err) {
        console.warn('Native AdhanAudio plugin error, falling back to Web Audio:', err);
      }
    }

    // 2. Web / PWA fallback
    this.stopAudio();
    this.initAudioElement();

    if (!this.audioElement) return;

    // If web browser supports vibration, also vibrate lightly
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 1000]);
      } catch {
        // Ignored
      }
    }

    const targetUrl = typeof window !== 'undefined'
      ? new URL(muezzin.audioUrl, window.location.href).href
      : muezzin.audioUrl;

    try {
      this.audioElement.src = targetUrl;
      this.audioElement.currentTime = 0;
      await this.audioElement.play();
      this.isPlaying = true;
      this.isVibrating = false;
      this.isAudioBlocked = false;
      this.notifyListeners();
    } catch (err: unknown) {
      console.warn('Primary audio playback error:', err);

      const errorMsg = String(err);
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('interact')) {
        this.isAudioBlocked = true;
        this.isPlaying = false;
        this.notifyListeners();
        return;
      }

      // Try CDN fallback
      const fallbackUrl = FALLBACK_CDN_URLS[muezzin.id];
      if (fallbackUrl && this.audioElement) {
        try {
          this.audioElement.src = fallbackUrl;
          this.audioElement.currentTime = 0;
          await this.audioElement.play();
          this.isPlaying = true;
          this.isAudioBlocked = false;
          this.notifyListeners();
        } catch (e2: unknown) {
          console.error('All audio sources blocked by browser policy:', e2);
          this.isPlaying = false;
          this.isAudioBlocked = true;
          this.notifyListeners();
        }
      }
    }
  }

  public stopAudio(): void {
    if (Capacitor.isNativePlatform()) {
      try {
        AdhanAudio.stopAdhan().catch(() => {});
      } catch {
        // Ignored
      }
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlaying = false;
    this.isVibrating = false;
    this.isAudioBlocked = false;
    this.notifyListeners();
  }

  /**
   * Get / store triggered history in localStorage to avoid duplicate alerts
   */
  private isAlreadyTriggered(key: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('adhan_triggered_cache');
      const set = raw ? JSON.parse(raw) : [];
      return set.includes(key);
    } catch {
      return false;
    }
  }

  private markTriggered(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('adhan_triggered_cache');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(key)) {
        list.push(key);
        if (list.length > 25) list.shift();
        localStorage.setItem('adhan_triggered_cache', JSON.stringify(list));
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Main prayer monitor called every second by App.tsx
   */
  public checkAndTriggerPrayerAlert(
    prayerKey: PrayerKey,
    prayerNameAr: string,
    prayerNameFr: string,
    prayerTime: Date,
    settings: PrayerSettings
  ): void {
    if (settings.silentMode) return;

    const prayerConfig = settings.prayerSoundConfig[prayerKey];
    if (!prayerConfig?.enabled) return;

    const now = new Date();
    const diffMs = prayerTime.getTime() - now.getTime();
    const dateStr = prayerTime.toISOString().slice(0, 10);

    const isArabic = settings.language === 'ar';
    const prayerTitle = isArabic ? prayerNameAr : prayerNameFr;
    const soundFile = `adhan_${settings.selectedMuezzinId || 'algeria'}.mp3`;

    // 1. Exact prayer time trigger (Window: 5 seconds before to 3 minutes after)
    const exactKey = `exact_${prayerKey}_${dateStr}`;
    const isNative = Capacitor.isNativePlatform();
    if (diffMs <= 5000 && diffMs >= -180000 && !this.isAlreadyTriggered(exactKey)) {
      this.markTriggered(exactKey);

      // Sur Android, la notification programmée (canal Adhan) fait déjà sonner : on n'affiche que l'alerte visuelle.
      if (isNative) {
        this.notifyAlertListeners({ key: prayerKey, titleAr: prayerNameAr, titleFr: prayerNameFr, time: prayerTime });
        return;
      }

      const notifTitle = isArabic
        ? `حان الآن موعد صلاة ${prayerTitle}`
        : `C'est l'heure de la prière de ${prayerTitle}`;
      const notifBody = isArabic
        ? `حي على الصلاة، حي على الفلاح (الله أكبر)`
        : `Accourez à la prière, accourez au succès`;

      // Trigger system notification
      this.sendNotification(notifTitle, {
        body: notifBody,
        tag: exactKey,
        soundFile,
      });

      // Trigger active in-app visual alert overlay
      this.notifyAlertListeners({
        key: prayerKey,
        titleAr: prayerNameAr,
        titleFr: prayerNameFr,
        time: prayerTime,
      });

      // Play vocal adhan audio (AdhanAudio will automatically obey phone ringer mode!)
      if (prayerConfig.playAdhan && settings.fullAdhanEnabled) {
        this.playMuezzin(settings.selectedMuezzinId);
      }
    }

    // 2. Pre-prayer alert (Web uniquement : sur Android c'est une alarme native)
    if (!isNative && settings.preNotificationMinutes > 0) {
      const preKey = `pre_${prayerKey}_${dateStr}_${settings.preNotificationMinutes}`;
      const targetPreMs = settings.preNotificationMinutes * 60000;
      if (
        diffMs <= targetPreMs + 10000 &&
        diffMs >= targetPreMs - 50000 &&
        !this.isAlreadyTriggered(preKey)
      ) {
        this.markTriggered(preKey);

        const notifTitle = isArabic
          ? `اقتراب صلاة ${prayerTitle}`
          : `Rappel : Prière de ${prayerTitle} imminente`;
        const notifBody = isArabic
          ? `بقي ${settings.preNotificationMinutes} دقيقة على موعد الأذان`
          : `Plus que ${settings.preNotificationMinutes} minutes avant l'Adhan`;

        this.sendNotification(notifTitle, { body: notifBody, tag: preKey });
      }
    }
  }

  /**
   * Immediate interactive test alert (Audio + Notification + Vibreur + In-app Overlay)
   */
  public async triggerTestAlert(settings: PrayerSettings): Promise<boolean> {
    this.unlockAudio();
    const hasPerm = await this.requestNotificationPermission();

    // Refresh phone ringer status
    await this.fetchPhoneRingerStatus();

    const isArabic = settings.language === 'ar';
    const notifTitle = isArabic
      ? '🔔 اختبار الأذان: التنبيهات تعمل بنجاح'
      : "🔔 Test d'alerte Adhan : Tout fonctionne parfaitement";
    const notifBody = isArabic
      ? 'تم تفعيل التنبيه الصوتي والإشعار بنجاح لجميع الصلوات'
      : 'Les notifications et la récitation audio sont bien configurées';
    const soundFile = `adhan_${settings.selectedMuezzinId || 'algeria'}.mp3`;

    await this.sendNotification(notifTitle, { body: notifBody, soundFile });

    // In-app alert
    this.notifyAlertListeners({
      key: 'fajr',
      titleAr: isArabic ? 'اختبار الأذان (تجريبي)' : "Test d'alerte Adhan",
      titleFr: "Test d'alerte Adhan",
      time: new Date(),
      isTest: true,
    });

    // Sur Android la notification (canal Adhan) joue déjà le son ; sur le web on lit l'audio.
    if (!Capacitor.isNativePlatform()) {
      await this.playMuezzin(settings.selectedMuezzinId);
    }

    return hasPerm;
  }
}

export const notificationService = new AudioAndNotificationManager();
