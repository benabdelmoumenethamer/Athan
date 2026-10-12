import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';
import { Language } from '../types/prayer';

interface Props {
  language: Language;
}

export const PWAInstallButton: React.FC<Props> = ({ language }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isArabic = language === 'ar';

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
        title={isArabic ? 'تثبيت التطبيق على الهاتف' : 'Installer l\'application'}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isArabic ? 'تثبيت التطبيق' : 'Installer App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/80 text-amber-200 border border-amber-400/30 font-medium text-xs transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>{isArabic ? 'تثبيت على iPhone' : 'Installer sur iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-emerald-950 border border-amber-500/30 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-800/60">
                <h3 className="text-base font-bold text-amber-300">
                  {isArabic ? 'التثبيت على هواتف iPhone / iPad' : 'Installation sur iPhone / iPad'}
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-emerald-800/60 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-200">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center font-bold text-[11px]">
                    1
                  </span>
                  <p>
                    {isArabic
                      ? 'اضغط على زر المشاركة (Partager) في متصفح Safari أسفل الشاشة.'
                      : 'Appuyez sur le bouton Partager dans la barre Safari.'}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center font-bold text-[11px]">
                    2
                  </span>
                  <p>
                    {isArabic
                      ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Sur l’écran d’accueil).'
                      : 'Faites défiler vers le bas et appuyez sur "Sur l’écran d’accueil".'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-amber-500 py-2 text-xs font-bold text-emerald-950 hover:bg-amber-400 transition"
              >
                {isArabic ? 'تم، فهمت' : 'Compris'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
