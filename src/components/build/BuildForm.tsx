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

const PRESET_BUDGETS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];

function getAvailableResolutions(budget: number, purpose: BuildPurpose): Resolution[] {
  if (purpose === 'Office' || purpose === 'Coding') {
    if (budget >= 10000000) return ['1080p', '1440p', '4K'];
    if (budget >= 5000000) return ['1080p', '1440p'];
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

const LOADING_MESSAGES = [
  'Menganalisis komponen hardware',
  'Meracik kombinasi terbaik',
  'Menyeimbangkan performa & budget',
  'Mengoptimalkan瓶颈 analysis',
  'Hampir selesai...',
];

function BuildLoadingOverlay({ isDarkMode }: { isDarkMode: boolean }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const dots = [0, 1, 2];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative flex flex-col items-center gap-8"
      >
        {/* Animated Ring */}
        <div className="relative w-28 h-28">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              background: `conic-gradient(from 0deg, transparent 30%, ${isDarkMode ? '#10b981' : '#059669'} 50%, transparent 70%)`,
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-full border border-white/10"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
            >
              <Cpu className="w-7 h-7 text-primary" />
            </motion.div>
          </div>
        </div>

        {/* Status Message */}
        <div className="h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
            >
              {LOADING_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2">
          {dots.map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'}`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
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
      <AnimatePresence>
        {loading && <BuildLoadingOverlay isDarkMode={isDarkMode} />}
      </AnimatePresence>
      <div className="max-w-2xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-center px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step >= s
                  ? 'bg-primary text-primary-foreground'
                  : isDarkMode
                    ? 'bg-black text-gray-500 border border-white/10'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-1 w-12 md:w-24 mx-2 transition-colors ${step > s ? 'bg-primary' : isDarkMode ? 'bg-black border-white/5' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-8 min-h-[450px] flex flex-col">
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
                    min="3000000"
                    max="100000000"
                    step="500000"
                    value={formData.budget}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFormData((prev) => ({ ...prev, budget: v, resolution: adjustResolution(v, prev.purpose, prev.resolution) }));
                    }}
                    className="w-full h-2 bg-gray-200 dark:bg-emerald-900/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span className="dark:text-emerald-500/50">3 Juta</span>
                    <span className="dark:text-emerald-500/50">100 Juta+</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {displayedPresets.map((jt) => (
                    <button
                      key={jt}
                      onClick={() => {
                        const v = jt * 1000000;
                        setFormData((prev) => ({ ...prev, budget: v, resolution: adjustResolution(v, prev.purpose, prev.resolution) }));
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
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        purpose: p.id,
                        resolution: adjustResolution(prev.budget, p.id, prev.resolution),
                      }))}
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
                <label className="block">
                  <span className="text-gray-400 text-sm mb-2 block font-medium">Resolusi Target</span>
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
                  <p className={`mt-2 text-[10px] ${availableResolutions.length < 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {availableResolutions.length === 1
                      ? 'Budget ini ideal untuk gaming 1080p.'
                      : availableResolutions.length === 2
                        ? 'Budget ini mendukung gaming 1080p – 1440p.'
                        : 'Budget ini mendukung semua resolusi hingga 4K.'}
                  </p>
                </label>

                <label className="block">
                  <span className="text-gray-400 text-sm mb-2 block font-medium">Platform Prosesor</span>
                  <div className="grid grid-cols-2 gap-2">
                    {([{ id: 'intel', label: 'Intel' },
                      { id: 'amd', label: 'AMD' }] as { id: Platform; label: string }[]).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setFormData((prev) => ({ ...prev, platform: prev.platform === p.id ? 'default' : p.id }))}
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
                    <p className="mt-2 text-[10px] opacity-50">PCNerd Engine akan memilih platform terbaik secara otomatis.</p>
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
