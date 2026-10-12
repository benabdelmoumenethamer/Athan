import React, { useState } from 'react';
import { X, Sparkles, RotateCcw, Volume2, VolumeX, Check } from 'lucide-react';
import { Language } from '../types/prayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface DhikrItem {
  id: string;
  arabic: string;
  french: string;
  meaning: string;
  target: number;
}

const PRESET_DHIKR: DhikrItem[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    french: 'SubhanAllah',
    meaning: 'Gloire et Pureté à Allah',
    target: 33,
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    french: 'Alhamdulillah',
    meaning: 'Louange à Allah',
    target: 33,
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    french: 'Allahu Akbar',
    meaning: 'Allah est le Plus Grand',
    target: 34,
  },
  {
    id: 'tahlil',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    french: 'La ilaha illa Allah wahdahu la sharika lah',
    meaning: 'Il n\'y a de divinité digne d\'adoration qu\'Allah',
    target: 100,
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    french: 'Astaghfirullah wa atubu ilayh',
    meaning: 'Je demande pardon à Allah et je me repens à Lui',
    target: 100,
  },
  {
    id: 'salawat',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    french: 'Allahumma salli wa sallim \'ala Nabiyyina Muhammad',
    meaning: 'Ô Allah, répands Tes bénédictions sur notre Prophète',
    target: 100,
  },
];

export const TasbihCounterModal: React.FC<Props> = ({ isOpen, onClose, language }) => {
  const isArabic = language === 'ar';
  const [selectedDhikr, setSelectedDhikr] = useState<DhikrItem>(PRESET_DHIKR[0]);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  if (!isOpen) return null;

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);
    setTotalCount((t) => t + 1);

    // Haptic vibration
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (newCount === selectedDhikr.target) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      } else {
        navigator.vibrate(35);
      }
    }

    // Gentle click sound if enabled
    if (soundEnabled && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(newCount === selectedDhikr.target ? 880 : 540, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        }
      } catch {
        // Ignored
      }
    }
  };

  const handleReset = () => {
    setCount(0);
  };

  const isCompleted = count >= selectedDhikr.target;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 0.5rem)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 0.5rem)',
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-emerald-950 border border-amber-500/40 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isArabic ? 'المسبحة الإلكترونية والأذكار' : 'Tasbih Électronique & Dhikr'}
              </h3>
              <p className="text-xs text-emerald-300/80">
                {isArabic ? 'أذكار ما بعد الصلاة والاستغفار' : 'Invocations post-prière & louanges'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
          {/* Dhikr Selector Chips */}
          <div className="w-full flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {PRESET_DHIKR.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDhikr(d);
                  setCount(0);
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedDhikr.id === d.id
                    ? 'bg-amber-400 text-emerald-950 font-bold shadow-md shadow-amber-400/20'
                    : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {isArabic ? d.arabic.split(' ')[0] : d.french.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Current Selected Dhikr Card */}
          <div className="mt-4 w-full p-4 rounded-2xl bg-emerald-900/40 border border-emerald-800/70 text-center">
            <div className="text-lg sm:text-xl font-bold font-quran text-amber-300 leading-relaxed">
              {selectedDhikr.arabic}
            </div>
            <div className="text-xs text-emerald-200/90 mt-1">
              {selectedDhikr.french}
            </div>
            <div className="text-[11px] text-emerald-400/70 mt-0.5">
              {selectedDhikr.meaning}
            </div>
          </div>

          {/* Big Interactive Tap Circle */}
          <div className="my-6 relative flex items-center justify-center">
            <button
              onClick={handleIncrement}
              className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer select-none ${
                isCompleted
                  ? 'border-amber-400 bg-gradient-to-b from-amber-500/30 to-emerald-900 shadow-amber-500/25 ring-4 ring-amber-400/40'
                  : 'border-emerald-600/70 bg-gradient-to-b from-emerald-900/90 to-emerald-950 hover:border-amber-500/50'
              }`}
            >
              <span className="text-5xl sm:text-6xl font-black font-mono text-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                {count}
              </span>
              <span className="text-xs font-semibold text-emerald-300/80 mt-1">
                {isArabic ? `الهدف: ${selectedDhikr.target}` : `Objectif : ${selectedDhikr.target}`}
              </span>
              {isCompleted && (
                <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-emerald-950 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  {isArabic ? 'اكتمل' : 'Atteint'}
                </span>
              )}
            </button>
          </div>

          {/* Controls Bar: Reset, Sound, Total */}
          <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-emerald-900/30 border border-emerald-800/60">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-xs text-slate-200 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{isArabic ? 'تصفير' : 'Reset'}</span>
            </button>

            <span className="text-xs text-emerald-300">
              {isArabic ? 'المجموع الكلي:' : 'Total :'} <strong className="text-amber-300 font-mono">{totalCount}</strong>
            </span>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-xs text-amber-300 transition cursor-pointer"
              title={soundEnabled ? 'كتم النقرات' : 'تفعيل صوت النقر'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
