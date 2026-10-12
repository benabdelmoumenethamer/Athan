export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type Language = 'ar' | 'fr';

export interface LocationConfig {
  country: string;
  countryAr: string;
  wilayaCode?: string;
  wilayaName: string;
  wilayaNameAr: string;
  communeName: string;
  communeNameAr: string;
  latitude: number;
  longitude: number;
  isGPS: boolean;
  timezone?: string;
}

export type CalculationMethodKey = 'MWL' | 'Egyptian' | 'UmmAlQura' | 'Dubai' | 'NorthAmerica';

export interface PrayerSettings {
  language: Language;
  calculationMethod: CalculationMethodKey;
  madhab: 'shafi' | 'hanafi'; // Shafi/Maliki/Hanbali (shadow ratio 1) vs Hanafi (ratio 2)
  preNotificationMinutes: number; // 0, 5, 10, 15
  fullAdhanEnabled: boolean;
  selectedMuezzinId: string;
  silentMode: boolean;
  notificationsAllowed: boolean;
  hijriAdjustmentDays: number; // -2, -1, 0, 1, 2
  prayerSoundConfig: Record<PrayerKey, {
    enabled: boolean;
    playAdhan: boolean;
  }>;
  minuteOffsets: Record<PrayerKey, number>; // manual +/- minutes
}

export interface MuezzinOption {
  id: string;
  nameAr: string;
  nameFr: string;
  placeAr: string;
  placeFr: string;
  audioUrl: string;
  durationSeconds: number;
}

export interface PrayerTimeInfo {
  key: PrayerKey;
  titleAr: string;
  titleFr: string;
  time: Date;
  formatted: string;
  isNext: boolean;
  isCurrent: boolean;
  isPassed: boolean;
}

export interface NextPrayerStatus {
  key: PrayerKey;
  titleAr: string;
  titleFr: string;
  time: Date;
  remainingSeconds: number;
  remainingFormatted: string;
  progressPercent: number;
  isTomorrow: boolean;
}

export interface HijriDateInfo {
  day: number;
  month: number;
  year: number;
  dayNameAr: string;
  dayNameFr: string;
  monthNameAr: string;
  monthNameFr: string;
  formattedAr: string;
  formattedFr: string;
}

export interface AlgeriaWilaya {
  code: string;
  nameFr: string;
  nameAr: string;
  latitude: number;
  longitude: number;
  communes: { nameFr: string; nameAr: string; latitude: number; longitude: number }[];
}
