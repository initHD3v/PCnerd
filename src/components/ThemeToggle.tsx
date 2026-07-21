'use client';

import { useTheme } from '@/hooks/use-theme';
import { Sun, Moon, Power } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.9, rotate: 90 }}
      onClick={toggleTheme}
      className="theme-toggle-btn group relative overflow-hidden"
      title="Toggle System Power (Theme)"
    >
      <div className="absolute inset-0 bg-primary/10 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full" />

      {theme === 'dark' ? (
        <Sun className="w-6 h-6 relative z-10 text-emerald-400 group-hover:text-primary transition-colors" />
      ) : (
        <Moon className="w-6 h-6 relative z-10 text-primary" />
      )}

      {/* Power Button Indicator LED */}
      <div
        className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gray-400'}`}
      />
    </motion.button>
  );
}
