import React from 'react';
import {
  X,
  Volume2,
  Play,
  Square,
  Check,
  Radio,
  Sparkles,
} from 'lucide-react';
import { MUEZZIN_OPTIONS } from '../data/muezzins';
import { notificationService } from '../services/notificationService';
import { Language, MuezzinOption } from '../types/prayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedMuezzinId: string;
  onSelectMuezzin: (id: string) => void;
  isPlaying: boolean;
  currentMuezzin: MuezzinOption | null;
  language: Language;
}

export const AdhanModelSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedMuezzinId,
  onSelectMuezzin,
  isPlaying,
  currentMuezzin,
  language,
}) => {
  const isArabic = language === 'ar';

  if (!isOpen) return null;

  const handleTogglePreview = (muezzin: MuezzinOption) => {
    if (isPlaying && currentMuezzin?.id === muezzin.id) {
      notificationService.stopAudio();
    } else {
      notificationService.playMuezzin(muezzin.id);
    }
  };

  const handleSelect = (id: string) => {
    onSelectMuezzin(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5">
      <div className="w-full max-w-xl rounded-3xl bg-emerald-950 border border-amber-500/40 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-emerald-950 flex items-center justify-center shadow-lg shadow-amber-500/20 font-bold">
              <Volume2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isArabic ? 'اختيار صيغة ونموذج الأذان' : 'Choix du Modèle d\'Adhan'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-emerald-950">
                  {isArabic ? '4 نماذج صوتية' : '4 Modèles vocaux'}
                </span>
              </h3>
              <p className="text-xs text-emerald-300/80">
                {isArabic
                  ? 'تسجيلات صوتية بشرية حقيقية 100% بدون أي مؤثرات موسيقية'
                  : 'Récitations vocales humaines authentiques, sans aucun instrument de musique'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              notificationService.stopAudio();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-emerald-800/60 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative notice: Authentic pure vocal recitation */}
        <div className="px-4 sm:px-5 pt-3">
          <div className="p-3 rounded-2xl bg-emerald-900/40 border border-emerald-800/70 text-xs text-amber-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              {isArabic
                ? 'تم ضبط الأصوات بصوت المؤذنين البشري المعتمد في الحرمين الشريفين والجامع الأعظم والقدس.'
                : 'Les 4 modèles sont des enregistrements réels des muezzins des Lieux Saints et d\'Algérie.'}
            </span>
          </div>
        </div>

        {/* 4 Models List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {MUEZZIN_OPTIONS.map((muezzin, index) => {
            const isSelected = selectedMuezzinId === muezzin.id;
            const isCurrentlyPlayingThis = isPlaying && currentMuezzin?.id === muezzin.id;

            return (
              <div
                key={muezzin.id}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-900/90 to-emerald-950 border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
                    : 'bg-emerald-900/30 border-emerald-800/60 hover:border-emerald-700/80'
                }`}
              >
                {/* Top selection badge */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => handleSelect(muezzin.id)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-bold text-xs font-mono">
                        {index + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white font-quran">
                        {isArabic ? muezzin.nameAr : muezzin.nameFr}
                      </h4>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-emerald-950 flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{isArabic ? 'المختار' : 'Actif'}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-emerald-300/80 ps-8">
                      {isArabic ? muezzin.placeAr : muezzin.placeFr}
                    </p>
                  </div>

                  {/* Preview Listen Button */}
                  <button
                    onClick={() => handleTogglePreview(muezzin)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex-shrink-0 ${
                      isCurrentlyPlayingThis
                        ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                        : 'bg-emerald-800/80 hover:bg-emerald-700 text-amber-300 border border-amber-500/30 hover:border-amber-400'
                    }`}
                  >
                    {isCurrentlyPlayingThis ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>{isArabic ? 'إيقاف' : 'Arrêter'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isArabic ? 'استماع' : 'Écouter'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Select Trigger if not selected */}
                {!isSelected && (
                  <div className="mt-3 ps-8 flex justify-end">
                    <button
                      onClick={() => handleSelect(muezzin.id)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'تعيين هذا الأذان' : 'Sélectionner ce modèle'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-800/80 bg-emerald-950 flex items-center justify-between">
          <span className="text-xs text-emerald-300">
            {isArabic ? 'النموذج المختار محفوظ تلقائياً' : 'Choix sauvegardé automatiquement'}
          </span>
          <button
            onClick={() => {
              notificationService.stopAudio();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            {isArabic ? 'تأكيد وإغلاق' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};
