import { MuezzinOption } from '../types/prayer';

export const MUEZZIN_OPTIONS: MuezzinOption[] = [
  {
    id: 'makkah',
    nameAr: 'النموذج 1: أذان مكة المكرمة (الشيخ علي ملا)',
    nameFr: 'Modèle 1 : Adhan La Mecque (Sheikh Ali Mulla)',
    placeAr: 'المسجد الحرام، مكة المكرمة - صوت بشري ندي أصيل',
    placeFr: 'Al-Masjid Al-Haram, La Mecque (Récitation vocale pure)',
    audioUrl: '/audio/adhan_makkah.mp3',
    durationSeconds: 215,
  },
  {
    id: 'madinah',
    nameAr: 'النموذج 2: أذان المدينة المنورة (الشيخ عصام بخاري)',
    nameFr: 'Modèle 2 : Adhan Médine (Sheikh Essam Bukhari)',
    placeAr: 'المسجد النبوي الشريف، المدينة المنورة',
    placeFr: 'Al-Masjid An-Nabawi, Médine (Voix humaine pure)',
    audioUrl: '/audio/adhan_madinah.mp3',
    durationSeconds: 198,
  },
  {
    id: 'algeria',
    nameAr: 'النموذج 3: أذان الجزائر والجامع الأعظم (مغاربي أصيل)',
    nameFr: 'Modèle 3 : Adhan Algérie & Grande Mosquée (Maghrébin)',
    placeAr: 'جامع الجزائر الأعظم / التراث الجزائري الأصيل',
    placeFr: 'Grande Mosquée d\'Alger / Tradition Maghrébine',
    audioUrl: '/audio/adhan_algeria.mp3',
    durationSeconds: 220,
  },
  {
    id: 'alaqsa',
    nameAr: 'النموذج 4: أذان المسجد الأقصى المبارك (القدس الشريف)',
    nameFr: 'Modèle 4 : Adhan Al-Aqsa (Al-Quds Ash-Sharif)',
    placeAr: 'المسجد الأقصى المبارك، القدس الشريف',
    placeFr: 'Al-Masjid Al-Aqsa, Jérusalem (Voix pure sans instrument)',
    audioUrl: '/audio/adhan_alaqsa.mp3',
    durationSeconds: 205,
  },
];

export const DEFAULT_MUEZZIN_ID = 'algeria';
