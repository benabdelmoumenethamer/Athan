import React, { useState } from 'react';
import {
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
} from 'lucide-react';
import { generateMonthlyCalendar } from '../services/prayerEngine';
import { Language, LocationConfig, PrayerSettings } from '../types/prayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  location: LocationConfig;
  settings: PrayerSettings;
  language: Language;
}

export const MonthlyCalendarModal: React.FC<Props> = ({
  isOpen,
  onClose,
  location,
  settings,
  language,
}) => {
  const isArabic = language === 'ar';
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-11

  if (!isOpen) return null;

  const monthRows = generateMonthlyCalendar(currentYear, currentMonth, location, settings);

  const monthNamesAr = [
    'جانفي / محرم',
    'فيفري / صفر',
    'مارس / ربيع الأول',
    'أفريل / ربيع الآخر',
    'ماي / جمادى الأولى',
    'جوان / جمادى الآخرة',
    'جويلية / رجب',
    'أوت / شعبان',
    'سبتمبر / رمضان',
    'أكتوبر / شوال',
    'نوفمبر / ذو القعدة',
    'ديسمبر / ذو الحجة',
  ];

  const monthNamesFr = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  const currentMonthLabel = isArabic
    ? `${monthNamesAr[currentMonth]} ${currentYear}`
    : `${monthNamesFr[currentMonth]} ${currentYear}`;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Jour,Date Gregorienne,Date Hijri,Fajr,Chourouk,Dhuhr,Asr,Maghrib,Isha\n';

    monthRows.forEach((r) => {
      const gDate = r.date.toLocaleDateString('fr-FR');
      const hDate = r.hijriDate.formattedFr;
      csvContent += `${r.dayNumber},"${gDate}","${hDate}",${r.prayers.fajr},${r.prayers.sunrise},${r.prayers.dhuhr},${r.prayers.asr},${r.prayers.maghrib},${r.prayers.isha}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `horaires_priere_${currentMonth + 1}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const locationTitle = isArabic
    ? `${location.wilayaNameAr} - ${location.communeNameAr || location.countryAr}`
    : `${location.wilayaName} - ${location.communeName || location.country}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-5"
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 0.5rem)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 0.5rem)',
      }}
    >
      <div className="w-full max-w-4xl rounded-3xl bg-emerald-950 border border-amber-500/40 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isArabic ? 'إمساكية ومواقيت الصلاة الشهرية' : 'Calendrier Mensuel des Prières'}
              </h3>
              <p className="text-xs text-emerald-300/80">{locationTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 text-xs font-semibold transition cursor-pointer"
              title="Exporter CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 text-xs font-semibold transition cursor-pointer"
              title="Imprimer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isArabic ? 'طباعة' : 'Imprimer'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-emerald-800/60 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month Navigator */}
        <div className="px-4 py-3 bg-emerald-900/40 border-b border-emerald-800/60 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-emerald-800 text-amber-300 transition cursor-pointer flex items-center gap-1 text-xs"
          >
            <ChevronRight className="w-4 h-4 rtl:hidden" />
            <ChevronLeft className="w-4 h-4 ltr:hidden" />
            <span>{isArabic ? 'الشهر السابق' : 'Mois précédent'}</span>
          </button>

          <span className="font-bold text-sm sm:text-base text-amber-300">
            {currentMonthLabel}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-emerald-800 text-amber-300 transition cursor-pointer flex items-center gap-1 text-xs"
          >
            <span>{isArabic ? 'الشهر التالي' : 'Mois suivant'}</span>
            <ChevronLeft className="w-4 h-4 rtl:hidden" />
            <ChevronRight className="w-4 h-4 ltr:hidden" />
          </button>
        </div>

        {/* Calendar Table */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          <div className="overflow-x-auto rounded-2xl border border-emerald-800/70">
            <table className="w-full text-center text-xs">
              <thead className="bg-emerald-900/90 text-amber-300 font-bold border-b border-emerald-800">
                <tr>
                  <th className="py-2.5 px-2">{isArabic ? 'اليوم' : 'Jour'}</th>
                  <th className="py-2.5 px-2">{isArabic ? 'الهجري' : 'Hégirien'}</th>
                  <th className="py-2.5 px-2">{isArabic ? 'الفجر' : 'Fajr'}</th>
                  <th className="py-2.5 px-2">{isArabic ? 'الشروق' : 'Chourouk'}</th>
                  <th className="py-2.5 px-2">{isArabic ? 'الظهر' : 'Dhuhr'}</th>
                  <th className="py-2.5 px-2">{isArabic ? 'العصر' : 'Asr'}</th>
                  <th className="py-2.5 px-2">{isArabic ? 'المغرب' : 'Maghrib'}</th>
                  <th className="py-2.5 px-2">{isArabic ? 'العشاء' : 'Isha'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/50 font-mono">
                {monthRows.map((row) => {
                  const isToday =
                    row.date.getDate() === now.getDate() &&
                    row.date.getMonth() === now.getMonth() &&
                    row.date.getFullYear() === now.getFullYear();

                  return (
                    <tr
                      key={row.dayNumber}
                      className={`transition-colors ${
                        isToday
                          ? 'bg-amber-500/25 text-amber-200 font-bold'
                          : 'hover:bg-emerald-900/40 text-slate-200'
                      }`}
                    >
                      <td className="py-2 px-2 font-sans font-medium whitespace-nowrap">
                        <span className="inline-block w-6 h-6 rounded-full leading-6 bg-emerald-900/60 text-slate-100 text-[11px]">
                          {row.dayNumber}
                        </span>
                        <span className="ms-1.5 text-[10px] text-emerald-400 font-sans">
                          {isArabic ? row.hijriDate.dayNameAr : row.hijriDate.dayNameFr.slice(0, 3)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] font-quran text-amber-300/90 whitespace-nowrap">
                        {isArabic
                          ? `${row.hijriDate.day} ${row.hijriDate.monthNameAr.split(' ')[0]}`
                          : `${row.hijriDate.day} ${row.hijriDate.monthNameFr.split(' ')[0]}`}
                      </td>
                      <td className="py-2 px-1 text-emerald-200">{row.prayers.fajr}</td>
                      <td className="py-2 px-1 text-amber-200/70">{row.prayers.sunrise}</td>
                      <td className="py-2 px-1 text-emerald-200">{row.prayers.dhuhr}</td>
                      <td className="py-2 px-1 text-emerald-200">{row.prayers.asr}</td>
                      <td className="py-2 px-1 text-emerald-200">{row.prayers.maghrib}</td>
                      <td className="py-2 px-1 text-emerald-200">{row.prayers.isha}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
