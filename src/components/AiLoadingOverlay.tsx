'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';

const LOADING_MESSAGES = [
  'Menganalisis kebutuhan PC Anda',
  'Menentukan kombinasi komponen terbaik',
  'Menyeimbangkan performa & budget',
  'Mengoptimalkan bottleneck analysis',
  'Hampir selesai...',
];

export default function AiLoadingOverlay({ isDarkMode }: { isDarkMode: boolean }) {
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
