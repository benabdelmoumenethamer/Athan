import React, { useEffect, useState } from 'react';
import { X, Compass, Navigation, Info } from 'lucide-react';
import { Language, LocationConfig } from '../types/prayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  location: LocationConfig;
  qiblaAngle: number;
  language: Language;
}

export const QiblaCompassModal: React.FC<Props> = ({
  isOpen,
  onClose,
  location,
  qiblaAngle,
  language,
}) => {
  const isArabic = language === 'ar';
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [hasCompassSensor, setHasCompassSensor] = useState(false);
  const [manualHeading, setManualHeading] = useState(0);

  // Calculate distance to Makkah in km via Haversine formula
  const makkahLat = 21.4225;
  const makkahLng = 39.8262;

  const R = 6371; // Earth's radius in km
  const dLat = ((makkahLat - location.latitude) * Math.PI) / 180;
  const dLng = ((makkahLng - location.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((location.latitude * Math.PI) / 180) *
      Math.cos((makkahLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c);

  useEffect(() => {
    if (!isOpen) return;

    let absoluteSeen = false;

    const apply = (heading: number | null) => {
      if (heading === null || Number.isNaN(heading)) return;
      setDeviceHeading(Math.round((heading + 360) % 360));
      setHasCompassSensor(true);
    };

    // Capteur absolu (nord magnétique) : Android Chrome / WebView
    const handleAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha === null) return;
      absoluteSeen = true;
      apply(360 - e.alpha);
    };

    // iOS (webkitCompassHeading) ou repli relatif si aucun capteur absolu n'est disponible
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const wk = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof wk === 'number') {
        apply(wk);
      } else if (!absoluteSeen && e.alpha !== null && (e as unknown as { absolute?: boolean }).absolute) {
        apply(360 - e.alpha);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
      if ('DeviceOrientationEvent' in window) {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentAngle = deviceHeading !== null ? deviceHeading : manualHeading;
  // Needle points towards Qibla relative to device heading
  const needleRotation = qiblaAngle - currentAngle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 0.5rem)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 0.5rem)',
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-emerald-950 border border-amber-500/40 shadow-2xl text-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isArabic ? 'بوصلة القبلة المشرفة' : 'Boussole de la Qibla'}
              </h3>
              <p className="text-xs text-emerald-300/80">
                {isArabic ? `${location.wilayaNameAr} ← مكة المكرمة` : `${location.wilayaName} → Makkah`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-emerald-800/60 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compass Dial & Body */}
        <div className="p-6 flex flex-col items-center justify-center">
          {/* Compass Container */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-amber-500/40 bg-gradient-to-b from-emerald-900 to-emerald-950 flex items-center justify-center shadow-2xl shadow-emerald-950 p-4">
            {/* Cardinal points */}
            <span className="absolute top-2.5 font-bold text-xs text-rose-400 font-mono">N</span>
            <span className="absolute bottom-2.5 font-bold text-xs text-slate-400 font-mono">S</span>
            <span className="absolute right-2.5 font-bold text-xs text-slate-400 font-mono">E</span>
            <span className="absolute left-2.5 font-bold text-xs text-slate-400 font-mono">W</span>

            {/* Subtle inner concentric rings */}
            <div className="absolute inset-4 rounded-full border border-dashed border-emerald-700/60 pointer-events-none" />
            <div className="absolute inset-10 rounded-full border border-emerald-800/80 pointer-events-none" />

            {/* Rotating dial needle */}
            <div
              className="relative w-full h-full transition-transform duration-300 ease-out flex items-center justify-center"
              style={{ transform: `rotate(${needleRotation}deg)` }}
            >
              {/* Gold needle pointing to Kaaba */}
              <div className="absolute -top-1 flex flex-col items-center">
                {/* Kaaba Golden Badge */}
                <div className="w-9 h-9 rounded-xl bg-amber-500 border-2 border-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/50 text-emerald-950 font-black text-xs font-quran">
                  كعبة
                </div>
                <div className="w-0 h-0 border-x-8 border-x-transparent border-b-14 border-b-amber-400" />
              </div>

              {/* Center Pivot Point */}
              <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-emerald-950 shadow-md z-10" />

              {/* South pointer opposite */}
              <div className="absolute bottom-2 w-0 h-0 border-x-6 border-x-transparent border-t-10 border-t-slate-500" />
            </div>
          </div>

          {/* Compass Metrics */}
          <div className="mt-5 text-center space-y-1">
            <div className="text-2xl font-black text-amber-300 font-mono">
              {qiblaAngle}°
            </div>
            <p className="text-xs text-emerald-300/90 font-medium">
              {isArabic
                ? `زاوية القبلة: ${qiblaAngle} درجة من الشمال الحقيقي`
                : `Angle de la Qibla : ${qiblaAngle}° depuis le Nord`}
            </p>
            <p className="text-[11px] text-emerald-400/80">
              {isArabic
                ? `المسافة إلى الكعبة المشرفة: ${distanceKm.toLocaleString('ar-DZ')} كم`
                : `Distance vers la Kaaba : ${distanceKm.toLocaleString('fr-FR')} km`}
            </p>
          </div>

          {/* Guidance note */}
          <div className="mt-4 p-3 rounded-2xl bg-emerald-900/40 border border-emerald-800/60 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {hasCompassSensor
                ? isArabic
                  ? 'تم استشعار بوصلة هاتفك تلقائياً. وجّه الهاتف حتى يشير الرمز الذهبي إلى الأعلى.'
                  : 'Capteur de boussole actif. Orientez le téléphone vers le symbole doré.'
                : isArabic
                ? 'ضع الهاتف بشكل مستوٍ. القبلة تقع عند زاوية ' + qiblaAngle + '° بالنسبة للشمال.'
                : 'Posez votre téléphone à plat. La Kaaba se trouve à ' + qiblaAngle + '° du Nord.'}
            </p>
          </div>

          {/* Manual slider if no sensor */}
          {!hasCompassSensor && (
            <div className="mt-3 w-full px-2">
              <label className="text-[11px] text-emerald-300/80 block mb-1">
                {isArabic ? 'تدوير يدوي للبوصلة' : 'Rotation manuelle du cadran'}
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={manualHeading}
                onChange={(e) => setManualHeading(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
