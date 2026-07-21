'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { BuildPurpose, Resolution } from '@/lib/recommendation-engine';
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
  });

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID').format(val);
  };

  const parseCurrency = (str: string) => {
    return Number(str.replace(/[^0-9]/g, ''));
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseCurrency(e.target.value);
    if (rawValue <= 500000000) {
      setFormData({ ...formData, budget: rawValue });
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
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
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
                      onClick={() => setFormData({ ...formData, budget: jt * 1000000 })}
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
                      onClick={() => setFormData({ ...formData, purpose: p.id })}
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
                    {RESOLUTIONS.map((r) => (
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
  );
}
