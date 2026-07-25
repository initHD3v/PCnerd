'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CircleDollarSign,
  Gamepad2,
  Monitor,
  Cpu,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { BuildPurpose, Resolution, Platform } from '@/lib/recommendation-engine';
import { useTheme } from '@/hooks/use-theme';
import AiLoadingOverlay from '@/components/AiLoadingOverlay';

const PURPOSES: { id: BuildPurpose; label: string; icon: any }[] = [
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'Editing', label: 'Video Editing', icon: Monitor },
  { id: 'Streaming', label: 'Streaming', icon: Cpu },
  { id: 'Office', label: 'Office / Kerja', icon: CircleDollarSign },
  { id: 'Coding', label: 'Coding / Programming', icon: Cpu },
  { id: 'Rendering', label: '3D Rendering', icon: Cpu },
];

const RESOLUTIONS: { id: Resolution; label: string }[] = [
  { id: '1080p', label: '1080p (Full HD)' },
  { id: '1440p', label: '1440p (2K)' },
  { id: '4K', label: '4K (Ultra HD)' },
];

const PRESET_BUDGETS = [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100];

const MIN_BUDGET_PER_PURPOSE: Record<BuildPurpose, { min: number; label: string }> = {
  Office: { min: 4_500_000, label: 'Rp 4,5jt' },
  Gaming: { min: 8_000_000, label: 'Rp 8jt' },
  Coding: { min: 7_000_000, label: 'Rp 7jt' },
  Editing: { min: 10_000_000, label: 'Rp 10jt' },
  Streaming: { min: 12_000_000, label: 'Rp 12jt' },
  Rendering: { min: 20_000_000, label: 'Rp 20jt' },
};

function getAvailableResolutions(budget: number, purpose: BuildPurpose): Resolution[] {
  if (purpose === 'Office') {
    if (budget >= 10000000) return ['1080p', '1440p', '4K'];
    if (budget >= 5000000) return ['1080p', '1440p'];
    return ['1080p'];
  }
  if (purpose === 'Coding') {
    if (budget >= 15000000) return ['1080p', '1440p', '4K'];
    if (budget >= 8000000) return ['1080p', '1440p'];
    return ['1080p'];
  }
  if (purpose === 'Editing' || purpose === 'Rendering') {
    if (budget >= 20000000) return ['1080p', '1440p', '4K'];
    if (budget >= 10000000) return ['1080p', '1440p'];
    return ['1080p'];
  }
  // Gaming / Streaming
  if (budget >= 25000000) return ['1080p', '1440p', '4K'];
  if (budget >= 12000000) return ['1080p', '1440p'];
  return ['1080p'];
}

export default function BuildForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAllPresets, setShowMorePresets] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [formData, setFormData] = useState({
    budget: 10000000,
    purpose: 'Gaming' as BuildPurpose,
    resolution: '1080p' as Resolution,
    includePeripheral: false,
    platform: 'default' as Platform,
  });

  const availableResolutions = useMemo(
    () => getAvailableResolutions(formData.budget, formData.purpose),
    [formData.budget, formData.purpose],
  );

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val);
  };

  const parseCurrency = (str: string) => {
    return Number(str.replace(/[^0-9]/g, ''));
  };

  const adjustResolution = (budget: number, purpose: BuildPurpose, current: Resolution): Resolution => {
    const available = getAvailableResolutions(budget, purpose);
    return available.includes(current) ? current : available[available.length - 1];
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseCurrency(e.target.value);
    if (rawValue <= 500000000) {
      setFormData((prev) => ({
        ...prev,
        budget: rawValue,
        resolution: adjustResolution(rawValue, prev.purpose, prev.resolution),
      }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        localStorage.setItem('latest_build', JSON.stringify(data));
        localStorage.setItem('build_request', JSON.stringify(formData));
        window.location.href = '/build/results';
      }
    } catch (err) {
      alert('Terjadi kesalahan saat membuat build.');
    } finally {
      setLoading(false);
    }
  };

  const displayedPresets = showAllPresets ? PRESET_BUDGETS : PRESET_BUDGETS.slice(0, 4);

  return (
    <>
      <AnimatePresence>{loading && <AiLoadingOverlay isDarkMode={isDarkMode} />}</AnimatePresence>
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-8 px-4">
          <div className="flex justify-between items-center mb-3">
            {[
              { n: 1, label: 'Budget' },
              { n: 2, label: 'Tujuan' },
              { n: 3, label: 'Preferensi' },
            ].map((s) => (
              <div key={s.n} className="flex flex-col items-center">
                <motion.div
                  animate={step >= s.n ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= s.n
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : isDarkMode
                        ? 'bg-black text-gray-500 border border-white/10'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {step > s.n ? <CheckCircle2 className="w-5 h-5" /> : s.n}
                </motion.div>
                <span
                  className={`text-[10px] font-bold mt-1.5 tracking-wider uppercase ${step >= s.n ? 'text-primary' : 'opacity-30'}`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="relative h-1 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
            />
          </div>
        </div>

        <div className="glass-card p-6 sm:p-8 min-h-[350px] sm:min-h-[450px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Berapa Budget Anda?</h2>
                    <p className="text-sm text-gray-400">Tentukan batas maksimal biaya rakitan.</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <CircleDollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-primary">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrency(formData.budget)}
                      onChange={handleBudgetChange}
                      className={`w-full border rounded-2xl py-5 pl-14 pr-6 text-3xl font-black focus:outline-none focus:border-primary transition-all ${
                        isDarkMode
                          ? 'bg-black border-emerald-500/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'
                      }`}
                    />
                  </div>

                  {/* Slider Input */}
                  <div className="px-2 pt-2">
                    <input
                      type="range"
                      min="4500000"
                      max="100000000"
                      step="500000"
                      value={formData.budget}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          budget: v,
                          resolution: adjustResolution(v, prev.purpose, prev.resolution),
                        }));
                      }}
                      className="w-full h-2 bg-gray-200 dark:bg-emerald-900/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <span className="dark:text-emerald-500/50">4,5 Juta</span>
                      <span className="dark:text-emerald-500/50">100 Juta+</span>
                    </div>
                  </div>
                  <div
                    className={`px-2 ${formData.budget < MIN_BUDGET_PER_PURPOSE[formData.purpose].min ? '' : 'hidden'}`}
                  >
                    <p className="text-[10px] text-amber-500 flex items-center gap-1">
                      ⚠ Budget minimum untuk{' '}
                      {formData.purpose === 'Office'
                        ? 'Office'
                        : formData.purpose === 'Coding'
                          ? 'Coding / Programming'
                          : formData.purpose === 'Editing'
                            ? 'Video Editing'
                            : formData.purpose === 'Rendering'
                              ? '3D Rendering'
                              : formData.purpose}{' '}
                      adalah {MIN_BUDGET_PER_PURPOSE[formData.purpose].label}.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {displayedPresets.map((jt) => (
                      <button
                        key={jt}
                        onClick={() => {
                          const v = jt * 1000000;
                          setFormData((prev) => ({
                            ...prev,
                            budget: v,
                            resolution: adjustResolution(v, prev.purpose, prev.resolution),
                          }));
                        }}
                        className={`py-2.5 px-2 border rounded-xl text-xs font-bold transition-all ${
                          formData.budget === jt * 1000000
                            ? 'bg-primary text-black border-primary'
                            : isDarkMode
                              ? 'bg-black border-emerald-500/10 hover:border-emerald-500/40 text-white'
                              : 'bg-white border-gray-100 hover:border-gray-200 text-gray-700 shadow-sm'
                        }`}
                      >
                        {jt} Jt
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowMorePresets(!showAllPresets)}
                    className="w-full flex items-center justify-center gap-1 text-[10px] font-black text-gray-500 hover:text-primary uppercase tracking-widest transition-colors py-2"
                  >
                    {showAllPresets ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" /> Show More Options
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Apa Tujuan Penggunaan?</h2>
                <div className="grid grid-cols-2 gap-4">
                  {PURPOSES.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            purpose: p.id,
                            resolution: adjustResolution(prev.budget, p.id, prev.resolution),
                          }))
                        }
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                          formData.purpose === p.id
                            ? 'bg-primary/10 border-primary text-primary'
                            : isDarkMode
                              ? 'bg-black border-white/10 text-gray-400 hover:border-white/20'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 shadow-sm'
                        }`}
                      >
                        <Icon className="w-8 h-8" />
                        <span className="font-medium text-sm">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Preferensi Tambahan</h2>

                <div className="space-y-4">
                  {formData.purpose === 'Office' ? (
                    <div
                      className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black border-white/5' : 'bg-gray-50/50 border-gray-200'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-400">Resolusi Monitor</span>
                      </div>
                      <p className="text-[10px] opacity-50">
                        Build Office menggunakan 1080p secara default. Resolusi tidak mempengaruhi pemilihan komponen
                        untuk kebutuhan produktivitas.
                      </p>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-gray-400 text-sm mb-2 block font-medium">
                        {formData.purpose === 'Coding' ? 'Resolusi Monitor' : 'Resolusi Target'}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {RESOLUTIONS.filter((r) => availableResolutions.includes(r.id)).map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setFormData({ ...formData, resolution: r.id })}
                            className={`p-3 text-xs font-bold rounded-lg border transition-all ${
                              formData.resolution === r.id
                                ? 'bg-primary/10 border-primary text-primary'
                                : isDarkMode
                                  ? 'bg-black border-white/10 text-gray-500'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 shadow-sm'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <p
                        className={`mt-2 text-[10px] ${availableResolutions.length < 3 ? 'text-amber-500' : 'text-emerald-500'}`}
                      >
                        {formData.purpose === 'Coding'
                          ? availableResolutions.length === 1
                            ? 'Resolusi standar untuk coding & programming.'
                            : availableResolutions.length === 2
                              ? '1440p memberi lebih banyak ruang kode tanpa scroll horizontal.'
                              : '4K ideal untuk kode, dokumentasi, dan debugging side-by-side.'
                          : availableResolutions.length === 1
                            ? `Budget ini ideal untuk ${formData.purpose === 'Streaming' ? 'streaming' : 'gaming'} 1080p.`
                            : availableResolutions.length === 2
                              ? `Budget ini mendukung ${formData.purpose === 'Streaming' ? 'streaming' : 'gaming'} 1080p – 1440p.`
                              : `Budget ini mendukung semua resolusi hingga 4K.`}
                      </p>
                    </label>
                  )}

                  <label className="block">
                    <span className="text-gray-400 text-sm mb-2 block font-medium">Platform Prosesor</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'intel', label: 'Intel' },
                          { id: 'amd', label: 'AMD' },
                        ] as { id: Platform; label: string }[]
                      ).map((p) => (
                        <button
                          key={p.id}
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, platform: prev.platform === p.id ? 'default' : p.id }))
                          }
                          className={`p-3 text-xs font-bold rounded-lg border transition-all ${
                            formData.platform === p.id
                              ? 'bg-primary/10 border-primary text-primary'
                              : isDarkMode
                                ? 'bg-black border-white/10 text-gray-500'
                                : 'bg-gray-50 border-gray-200 text-gray-400 shadow-sm'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {formData.platform === 'default' && (
                      <p className="mt-2 text-[10px] opacity-50">
                        PCNerd Engine akan memilih platform terbaik secara otomatis.
                      </p>
                    )}
                  </label>

                  <div
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isDarkMode ? 'bg-black border-white/10' : 'bg-gray-50 border-gray-200 shadow-sm'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold">Sertakan Peripheral?</h4>
                      <p className="text-xs text-gray-500">Monitor, Keyboard, Mouse, dll.</p>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, includePeripheral: !formData.includePeripheral })}
                      className={`w-14 h-8 rounded-full transition-colors relative ${formData.includePeripheral ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-900'}`}
                    >
                      <div
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${formData.includePeripheral ? 'left-7' : 'left-1'}`}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto pt-8 flex gap-4">
            {step > 1 && (
              <button
                onClick={prevStep}
                className={`flex-1 py-4 border rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isDarkMode
                    ? 'bg-black border-white/10 hover:bg-white/5 text-gray-400'
                    : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <ChevronLeft className="w-5 h-5" /> Kembali
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-[2] py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/10"
              >
                Lanjut <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-4 bg-emerald-500 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Build PC'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
