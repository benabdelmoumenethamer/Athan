import React, { useState } from 'react';
import {
  X,
  Search,
  MapPin,
  Navigation,
  Globe2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { ALGERIA_WILAYAS, INTERNATIONAL_CITIES, findNearestAlgerianCommune } from '../data/algeriaWilayas';
import { AlgeriaWilaya, Language, LocationConfig } from '../types/prayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationConfig;
  onSelectLocation: (loc: LocationConfig) => void;
  language: Language;
}

export const LocationSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  language,
}) => {
  const isArabic = language === 'ar';
  const [activeTab, setActiveTab] = useState<'algeria' | 'international' | 'custom'>('algeria');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWilayaCode, setExpandedWilayaCode] = useState<string | null>(
    currentLocation.wilayaCode || null
  );
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Custom coordinate inputs
  const [customLat, setCustomLat] = useState(currentLocation.latitude.toString());
  const [customLng, setCustomLng] = useState(currentLocation.longitude.toString());
  const [customName, setCustomName] = useState(currentLocation.wilayaName);

  if (!isOpen) return null;

  // Filter Algeria wilayas
  const filteredWilayas = ALGERIA_WILAYAS.filter((w) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      w.code.includes(q) ||
      w.nameFr.toLowerCase().includes(q) ||
      w.nameAr.includes(q) ||
      w.communes.some((c) => c.nameFr.toLowerCase().includes(q) || c.nameAr.includes(q))
    );
  });

  // Filter International cities
  const filteredInternational = INTERNATIONAL_CITIES.filter((city) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      city.wilayaName.toLowerCase().includes(q) ||
      city.wilayaNameAr.includes(q) ||
      city.country.toLowerCase().includes(q) ||
      city.countryAr.includes(q)
    );
  });

  const handleSelectWilaya = (wilaya: AlgeriaWilaya, commune?: { nameFr: string; nameAr: string; latitude: number; longitude: number }) => {
    const selectedCommune = commune || wilaya.communes[0] || {
      nameFr: wilaya.nameFr,
      nameAr: wilaya.nameAr,
      latitude: wilaya.latitude,
      longitude: wilaya.longitude,
    };

    const newLoc: LocationConfig = {
      country: 'Algérie',
      countryAr: 'الجزائر',
      wilayaCode: wilaya.code,
      wilayaName: wilaya.nameFr,
      wilayaNameAr: wilaya.nameAr,
      communeName: selectedCommune.nameFr,
      communeNameAr: selectedCommune.nameAr,
      latitude: selectedCommune.latitude,
      longitude: selectedCommune.longitude,
      isGPS: false,
    };

    onSelectLocation(newLoc);
    onClose();
  };

  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      setGpsError(
        isArabic
          ? 'خاصية تحديد الموقع غير مدعومة في متصفحك'
          : 'La géolocalisation n\'est pas supportée par votre navigateur'
      );
      return;
    }

    setIsDetectingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingGPS(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const nearest = findNearestAlgerianCommune(lat, lng);
        const coordLabel = `GPS (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;

        const newLoc: LocationConfig = nearest
          ? {
              country: 'Algérie',
              countryAr: 'الجزائر',
              wilayaCode: nearest.wilaya.code,
              wilayaName: nearest.wilaya.nameFr,
              wilayaNameAr: nearest.wilaya.nameAr,
              communeName: nearest.commune.nameFr,
              communeNameAr: nearest.commune.nameAr,
              latitude: lat,
              longitude: lng,
              isGPS: true,
            }
          : {
              country: 'Position GPS',
              countryAr: 'موقع GPS',
              wilayaCode: undefined,
              wilayaName: coordLabel,
              wilayaNameAr: coordLabel,
              communeName: '',
              communeNameAr: '',
              latitude: lat,
              longitude: lng,
              isGPS: true,
            };

        onSelectLocation(newLoc);
        onClose();
      },
      (err) => {
        setIsDetectingGPS(false);
        setGpsError(
          isArabic
            ? 'تعذر تحديد الموقع تلقائياً. يُرجى اختيار الولاية يدوياً.'
            : 'Impossible d\'obtenir la position GPS. Veuillez sélectionner manuellement.'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleApplyCustomCoords = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng)) return;

    onSelectLocation({
      country: 'Personnalisé',
      countryAr: 'موقع مخصص',
      wilayaName: customName || 'Coordonnées manuelles',
      wilayaNameAr: customName || 'إحداثيات يدوية',
      communeName: '',
      communeNameAr: '',
      latitude: lat,
      longitude: lng,
      isGPS: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5">
      <div className="w-full max-w-2xl rounded-3xl bg-emerald-950 border border-amber-500/40 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isArabic ? 'تحديد الموقع وحساب المواقيت' : 'Sélection de la Ville & Localisation'}
              </h3>
              <p className="text-xs text-emerald-300/80">
                {isArabic
                  ? 'اختر ولايتك في الجزائر أو أي مدينة في العالم'
                  : 'Choisissez votre wilaya en Algérie ou une ville internationale'}
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

        {/* GPS Quick Button */}
        <div className="px-4 sm:px-5 pt-3">
          <button
            onClick={handleGPSDetect}
            disabled={isDetectingGPS}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 active:scale-98 transition cursor-pointer disabled:opacity-60"
          >
            <Navigation className={`w-4 h-4 ${isDetectingGPS ? 'animate-spin' : ''}`} />
            <span>
              {isDetectingGPS
                ? isArabic
                  ? 'جاري الكشف عن موقعك عبر GPS...'
                  : 'Détection GPS en cours...'
                : isArabic
                ? 'استخدام موقعي الحالي تلقائياً (GPS)'
                : 'Utiliser ma position GPS actuelle'}
            </span>
          </button>
          {gpsError && (
            <p className="mt-1.5 text-xs text-rose-400 text-center">{gpsError}</p>
          )}
        </div>

        {/* Tabs: Algeria / International / Custom */}
        <div className="px-4 sm:px-5 pt-3 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('algeria')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'algeria'
                ? 'bg-emerald-800 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-emerald-900/50 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            {isArabic ? 'ولايات الجزائر (58 ولاية)' : 'Algérie (58 Wilayas)'}
          </button>
          <button
            onClick={() => setActiveTab('international')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'international'
                ? 'bg-emerald-800 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-emerald-900/50 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            {isArabic ? 'مدن دولية وعواصم' : 'Villes Internationales'}
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-emerald-800 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-emerald-900/50 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            {isArabic ? 'إحداثيات' : 'GPS'}
          </button>
        </div>

        {/* Search input (for Algeria or International) */}
        {activeTab !== 'custom' && (
          <div className="px-4 sm:px-5 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'algeria'
                    ? isArabic
                      ? 'ابحث برقم الولاية (مثلاً: 16) أو الاسم (وهران، قسنطينة...)'
                      : 'Rechercher par numéro (ex: 16 Alger, 31 Oran) ou commune...'
                    : isArabic
                    ? 'ابحث عن مدينة (مكة، المدينة، باريس...)'
                    : 'Rechercher une ville (Makkah, Paris, Tunis...)'
                }
                className="w-full bg-emerald-900/60 border border-emerald-700/70 rounded-xl py-2.5 ps-10 pe-4 text-xs sm:text-sm text-slate-100 placeholder-emerald-400/60 focus:outline-none focus:border-amber-400/80 transition"
              />
            </div>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {activeTab === 'algeria' && (
            <div className="space-y-2">
              {filteredWilayas.map((wilaya) => {
                const isSelected = currentLocation.wilayaCode === wilaya.code;
                const isExpanded = expandedWilayaCode === wilaya.code;

                return (
                  <div
                    key={wilaya.code}
                    className={`rounded-2xl border transition overflow-hidden ${
                      isSelected
                        ? 'bg-emerald-900/80 border-amber-400/80'
                        : 'bg-emerald-900/40 border-emerald-800/60 hover:border-emerald-700'
                    }`}
                  >
                    {/* Wilaya row */}
                    <div className="flex items-center justify-between p-3">
                      <div
                        onClick={() => handleSelectWilaya(wilaya)}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-mono font-bold text-xs">
                          {wilaya.code}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">
                            {isArabic ? wilaya.nameAr : wilaya.nameFr}
                          </h4>
                          <span className="text-[11px] text-emerald-300/80">
                            {isArabic ? wilaya.nameFr : wilaya.nameAr}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="p-1 rounded-full bg-amber-400 text-emerald-950">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}

                        {wilaya.communes.length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedWilayaCode(isExpanded ? null : wilaya.code)
                            }
                            className="p-1.5 rounded-lg hover:bg-emerald-800 text-slate-300 transition cursor-pointer text-xs flex items-center gap-1"
                            title={isArabic ? 'عرض البلديات' : 'Voir communes'}
                          >
                            <span className="text-[11px] hidden sm:inline text-emerald-400">
                              {wilaya.communes.length} {isArabic ? 'بلديات' : 'communes'}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? 'rotate-180 text-amber-400' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Communes expandable list */}
                    {isExpanded && wilaya.communes.length > 0 && (
                      <div className="bg-emerald-950/70 border-t border-emerald-800/60 p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {wilaya.communes.map((commune) => {
                          const isCommuneSelected =
                            isSelected &&
                            (currentLocation.communeName === commune.nameFr ||
                              currentLocation.communeNameAr === commune.nameAr);

                          return (
                            <button
                              key={commune.nameFr}
                              onClick={() => handleSelectWilaya(wilaya, commune)}
                              className={`text-start px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-between ${
                                isCommuneSelected
                                  ? 'bg-amber-400 text-emerald-950 font-bold'
                                  : 'bg-emerald-900/50 text-slate-200 hover:bg-emerald-800 hover:text-white'
                              }`}
                            >
                              <span className="truncate">
                                {isArabic ? commune.nameAr : commune.nameFr}
                              </span>
                              {isCommuneSelected && (
                                <Check className="w-3 h-3 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'international' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredInternational.map((city) => {
                const isSelected =
                  currentLocation.wilayaName === city.wilayaName && !currentLocation.isGPS;

                return (
                  <button
                    key={city.wilayaName}
                    onClick={() => {
                      onSelectLocation(city);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-start transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-900/90 border-amber-400 text-white'
                        : 'bg-emerald-900/40 border-emerald-800/60 hover:border-emerald-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-800/80 text-amber-300 flex items-center justify-center">
                        <Globe2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">
                          {isArabic ? city.wilayaNameAr : city.wilayaName}
                        </div>
                        <div className="text-[11px] text-emerald-300/80">
                          {isArabic ? city.countryAr : city.country}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-amber-400 text-emerald-950">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4 p-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                {isArabic
                  ? 'أدخل الإحداثيات الجغرافية يدويّاً (خط العرض وخط الطول) للحساب الدقيق لمواقيت الصلاة في أي نقطة في العالم.'
                  : 'Saisissez manuellement vos coordonnées GPS exactes pour un calcul sur mesure.'}
              </p>
              <div>
                <label className="text-xs font-semibold text-emerald-300 block mb-1">
                  {isArabic ? 'اسم المكان / المدينة' : 'Nom du lieu'}
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-emerald-900/60 border border-emerald-700/70 rounded-xl py-2 px-3 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-emerald-300 block mb-1">
                    {isArabic ? 'خط العرض (Latitude)' : 'Latitude'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full bg-emerald-900/60 border border-emerald-700/70 rounded-xl py-2 px-3 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-emerald-300 block mb-1">
                    {isArabic ? 'خط الطول (Longitude)' : 'Longitude'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full bg-emerald-900/60 border border-emerald-700/70 rounded-xl py-2 px-3 text-sm text-white font-mono"
                  />
                </div>
              </div>
              <button
                onClick={handleApplyCustomCoords}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                {isArabic ? 'تطبيق هذه الإحداثيات' : 'Appliquer ces coordonnées'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
