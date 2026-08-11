'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Gamepad2, MemoryStick, HardDrive, Power, Box, Fan, Monitor, Keyboard, Mouse } from 'lucide-react';
import type { ProgressEvent } from '@/lib/build-service';

const COMPONENT_ICONS: Record<string, any> = {
  CPU: Cpu,
  GPU: Gamepad2,
  MOTHERBOARD: Box,
  RAM: MemoryStick,
  STORAGE: HardDrive,
  PSU: Power,
  CASE: Box,
  COOLER: Fan,
  MONITOR: Monitor,
  KEYBOARD: Keyboard,
  MOUSE: Mouse,
};

const TIER_LABELS: Record<string, string> = {
  value: 'Termurah',
  balanced: 'Menengah',
  performance: 'Max Budget',
};

export default function AiLoadingOverlay({
  isDarkMode,
  progressEvents,
}: {
  isDarkMode: boolean;
  progressEvents?: ProgressEvent[];
}) {
  const latestComponent = useMemo(() => {
    if (!progressEvents?.length) return null;
    for (let i = progressEvents.length - 1; i >= 0; i--) {
      const ev = progressEvents[i];
      if (ev.step === 'component') return ev;
    }
    return null;
  }, [progressEvents]);

  const narrativeProgress = useMemo(() => {
    if (!progressEvents?.length) return { current: 0, total: 3, label: '' };
    const narrativeEvents = progressEvents.filter(
      (e): e is Extract<ProgressEvent, { step: 'narrative' }> => e.step === 'narrative',
    );
    const started = narrativeEvents.filter((e) => !e.done).length;
    const completed = narrativeEvents.filter((e) => e.done).length;
    const currentTier = narrativeEvents.filter((e) => !e.done && e.tier).pop()?.tier;
    return {
      current: completed,
      total: 3,
      label: currentTier ? TIER_LABELS[currentTier] || currentTier : '',
    };
  }, [progressEvents]);

  const statusMessage = useMemo(() => {
    if (!progressEvents?.length) return 'Menganalisis kebutuhan PC Anda';
    const last = progressEvents[progressEvents.length - 1];
    if (last.step === 'narrative' && !last.done) {
      return `Menulis narasi untuk ${TIER_LABELS[last.tier!] || last.tier}...`;
    }
    if (last.step === 'narrative' && last.done) {
      return 'Menyelesaikan build...';
    }
    if (last.step === 'component') {
      const label = last.type === 'CPU' ? 'Processor' : last.type === 'GPU' ? 'Kartu Grafis' : last.type;
      return `Memilih ${label}...`;
    }
    return 'Memproses build Anda';
  }, [progressEvents]);

  const ComponentIcon = latestComponent ? COMPONENT_ICONS[latestComponent.type] : null;

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
        className="relative flex flex-col items-center gap-6"
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
              key={statusMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
            >
              {statusMessage}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Live Component Feed */}
        {progressEvents && progressEvents.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 max-w-xs w-full">
            {progressEvents
              .filter((e): e is Extract<ProgressEvent, { step: 'component' }> => e.step === 'component')
              .slice(-4)
              .map((ev, i) => {
                const Icon = COMPONENT_ICONS[ev.type] || Cpu;
                return (
                  <motion.div
                    key={`${ev.tier}-${ev.type}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg w-full ${
                      isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className="truncate flex-1">{ev.name}</span>
                    {ev.tier && (
                      <span
                        className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                      >
                        {TIER_LABELS[ev.tier] || ev.tier}
                      </span>
                    )}
                  </motion.div>
                );
              })}
          </div>
        )}

        {/* Narrative Progress Bar */}
        {narrativeProgress.current > 0 && (
          <div className="flex flex-col items-center gap-1.5 w-full max-w-xs">
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(narrativeProgress.current / narrativeProgress.total) * 100}%` }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Narasi {narrativeProgress.current}/{narrativeProgress.total}
            </p>
          </div>
        )}

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
