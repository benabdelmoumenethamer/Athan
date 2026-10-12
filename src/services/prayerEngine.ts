import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  Qibla,
} from 'adhan';
import {
  CalculationMethodKey,
  HijriDateInfo,
  LocationConfig,
  NextPrayerStatus,
  PrayerKey,
  PrayerSettings,
  PrayerTimeInfo,
} from '../types/prayer';

const PRAYER_NAMES: Record<PrayerKey, { ar: string; fr: string }> = {
  fajr: { ar: 'الفجر', fr: 'Fajr' },
  sunrise: { ar: 'الشروق', fr: 'Chourouk' },
  dhuhr: { ar: 'الظهر', fr: 'Dhuhr' },
  asr: { ar: 'العصر', fr: 'Asr' },
  maghrib: { ar: 'المغرب', fr: 'Maghrib' },
  isha: { ar: 'العشاء', fr: 'Isha' },
};

export function getCalculationParameters(methodKey: CalculationMethodKey): CalculationParameters {
  switch (methodKey) {
    case 'MWL':
      // Muslim World League (18° Fajr, 17° Isha) - Standard officiel en Algérie
      return CalculationMethod.MuslimWorldLeague();
    case 'Egyptian':
      // Egyptian General Authority of Survey (19.5° Fajr, 17.5° Isha)
      return CalculationMethod.Egyptian();
    case 'UmmAlQura':
      return CalculationMethod.UmmAlQura();
    case 'Dubai':
      return CalculationMethod.Dubai();
    case 'NorthAmerica':
      return CalculationMethod.NorthAmerica();
    default:
      return CalculationMethod.MuslimWorldLeague();
  }
}

export function formatTime24(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function calculatePrayerTimes(
  date: Date,
  location: LocationConfig,
  settings: PrayerSettings
): PrayerTimeInfo[] {
  const coords = new Coordinates(location.latitude, location.longitude);
  const params = getCalculationParameters(settings.calculationMethod);

  // Madhab: Maliki / Shafi (standard shadow ratio 1) vs Hanafi (shadow ratio 2)
  params.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.TwilightAngle;

  const prayerTimes = new PrayerTimes(coords, date, params);

  // Apply minute offsets if specified by user
  const applyOffset = (d: Date, key: PrayerKey): Date => {
    const offset = settings.minuteOffsets?.[key] || 0;
    return new Date(d.getTime() + offset * 60 * 1000);
  };

  const rawList: { key: PrayerKey; time: Date }[] = [
    { key: 'fajr', time: applyOffset(prayerTimes.fajr, 'fajr') },
    { key: 'sunrise', time: applyOffset(prayerTimes.sunrise, 'sunrise') },
    { key: 'dhuhr', time: applyOffset(prayerTimes.dhuhr, 'dhuhr') },
    { key: 'asr', time: applyOffset(prayerTimes.asr, 'asr') },
    { key: 'maghrib', time: applyOffset(prayerTimes.maghrib, 'maghrib') },
    { key: 'isha', time: applyOffset(prayerTimes.isha, 'isha') },
  ];

  const now = new Date();

  // Find currently active prayer window
  let currentKey: PrayerKey | null = null;
  for (let i = 0; i < rawList.length; i++) {
    if (now >= rawList[i].time) {
      currentKey = rawList[i].key;
    }
  }

  // Find next upcoming prayer
  let nextKey: PrayerKey | null = null;
  for (let i = 0; i < rawList.length; i++) {
    if (rawList[i].time > now) {
      nextKey = rawList[i].key;
      break;
    }
  }

  // If all prayers today have passed, next is tomorrow Fajr
  if (!nextKey) {
    nextKey = 'fajr';
  }

  return rawList.map((item) => ({
    key: item.key,
    titleAr: PRAYER_NAMES[item.key].ar,
    titleFr: PRAYER_NAMES[item.key].fr,
    time: item.time,
    formatted: formatTime24(item.time),
    isNext: item.key === nextKey,
    isCurrent: item.key === currentKey,
    isPassed: item.time < now,
  }));
}

export function getTomorrowFajrTime(
  location: LocationConfig,
  settings: PrayerSettings,
  currentDate = new Date()
): Date {
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const coords = new Coordinates(location.latitude, location.longitude);
  const params = getCalculationParameters(settings.calculationMethod);
  params.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.TwilightAngle;

  const prayerTimesTomorrow = new PrayerTimes(coords, tomorrow, params);
  const offset = settings.minuteOffsets?.fajr || 0;
  return new Date(prayerTimesTomorrow.fajr.getTime() + offset * 60 * 1000);
}

export function getNextPrayerStatus(
  todayPrayers: PrayerTimeInfo[],
  location: LocationConfig,
  settings: PrayerSettings,
  now = new Date()
): NextPrayerStatus {
  // Check upcoming today
  const upcomingToday = todayPrayers.find((p) => p.time.getTime() > now.getTime());

  if (upcomingToday) {
    const diffMs = upcomingToday.time.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));

    // Calculate progress between previous prayer and this upcoming prayer
    const prevPrayer = [...todayPrayers].reverse().find((p) => p.time.getTime() <= now.getTime());
    let progressPercent = 0;
    if (prevPrayer) {
      const totalSpan = upcomingToday.time.getTime() - prevPrayer.time.getTime();
      const elapsed = now.getTime() - prevPrayer.time.getTime();
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalSpan) * 100)));
    }

    return {
      key: upcomingToday.key,
      titleAr: upcomingToday.titleAr,
      titleFr: upcomingToday.titleFr,
      time: upcomingToday.time,
      remainingSeconds,
      remainingFormatted: formatRemainingTime(remainingSeconds),
      progressPercent,
      isTomorrow: false,
    };
  }

  // Next prayer is tomorrow's Fajr
  const tomorrowFajr = getTomorrowFajrTime(location, settings, now);
  const diffMs = tomorrowFajr.getTime() - now.getTime();
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const ishaToday = todayPrayers.find((p) => p.key === 'isha');
  let progressPercent = 0;
  if (ishaToday) {
    const totalSpan = tomorrowFajr.getTime() - ishaToday.time.getTime();
    const elapsed = now.getTime() - ishaToday.time.getTime();
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalSpan) * 100)));
  }

  return {
    key: 'fajr',
    titleAr: PRAYER_NAMES.fajr.ar,
    titleFr: PRAYER_NAMES.fajr.fr,
    time: tomorrowFajr,
    remainingSeconds,
    remainingFormatted: formatRemainingTime(remainingSeconds),
    progressPercent,
    isTomorrow: true,
  };
}

export function formatRemainingTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function calculateQibla(latitude: number, longitude: number): number {
  const coords = new Coordinates(latitude, longitude);
  const qiblaAngle = Qibla(coords);
  return Math.round(qiblaAngle * 10) / 10;
}

export function getHijriDate(date = new Date(), adjustmentDays = 0): HijriDateInfo {
  const targetDate = new Date(date);
  if (adjustmentDays !== 0) {
    targetDate.setDate(targetDate.getDate() + adjustmentDays);
  }

  const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayNamesFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const dayNameAr = dayNamesAr[targetDate.getDay()];
  const dayNameFr = dayNamesFr[targetDate.getDay()];

  const hijriMonthsAr = [
    'المحرّم',
    'صفر',
    'ربيع الأول',
    'ربيع الآخر',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان المبارك',
    'شوّال',
    'ذو القعدة',
    'ذو الحجة',
  ];

  const hijriMonthsFr = [
    'Mouharram',
    'Safar',
    'Rabi\' al-Awwal',
    'Rabi\' al-Thani',
    'Joumada al-Oula',
    'Joumada al-Akhira',
    'Rajab',
    'Cha\'bane',
    'Ramadan',
    'Chawwal',
    'Dhou al-Qi\'da',
    'Dhou al-Hijja',
  ];

  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = fmt.formatToParts(targetDate);
    let day = 1;
    let month = 1;
    let year = 1448;

    for (const part of parts) {
      if (part.type === 'day') day = parseInt(part.value, 10) || 1;
      if (part.type === 'month') month = parseInt(part.value, 10) || 1;
      if (part.type === 'year') year = parseInt(part.value, 10) || 1448;
    }

    const monthIndex = Math.max(0, Math.min(11, month - 1));
    const monthNameAr = hijriMonthsAr[monthIndex];
    const monthNameFr = hijriMonthsFr[monthIndex];

    return {
      day,
      month,
      year,
      dayNameAr,
      dayNameFr,
      monthNameAr,
      monthNameFr,
      formattedAr: `${day} ${monthNameAr} ${year} هـ`,
      formattedFr: `${day} ${monthNameFr} ${year} AH`,
    };
  } catch {
    // Repli : calendrier hégirien arithmétique (algorithme "tabulaire")
    const jd = Math.floor(targetDate.getTime() / 86400000 + 2440587.5 + 0.5);
    const l0 = jd - 1948440 + 10632;
    const n = Math.floor((l0 - 1) / 10631);
    const l1 = l0 - 10631 * n + 354;
    const j =
      Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) +
      Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
    const l2 =
      l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l2) / 709);
    const day = l2 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    const mi = Math.max(0, Math.min(11, month - 1));
    return {
      day,
      month,
      year,
      dayNameAr,
      dayNameFr,
      monthNameAr: hijriMonthsAr[mi],
      monthNameFr: hijriMonthsFr[mi],
      formattedAr: `${day} ${hijriMonthsAr[mi]} ${year} هـ`,
      formattedFr: `${day} ${hijriMonthsFr[mi]} ${year} AH`,
    };
  }
}

export function generateMonthlyCalendar(
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  location: LocationConfig,
  settings: PrayerSettings
): {
  date: Date;
  dayNumber: number;
  hijriDate: HijriDateInfo;
  prayers: Record<PrayerKey, string>;
}[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarRows = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d, 12, 0, 0);
    const prayers = calculatePrayerTimes(date, location, settings);
    const prayerMap: Record<PrayerKey, string> = {
      fajr: '',
      sunrise: '',
      dhuhr: '',
      asr: '',
      maghrib: '',
      isha: '',
    };
    prayers.forEach((p) => {
      prayerMap[p.key] = p.formatted;
    });

    const hijri = getHijriDate(date, settings.hijriAdjustmentDays);

    calendarRows.push({
      date,
      dayNumber: d,
      hijriDate: hijri,
      prayers: prayerMap,
    });
  }

  return calendarRows;
}
