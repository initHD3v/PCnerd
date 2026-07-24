'use client';

import { useTheme } from '@/hooks/use-theme';
import { Monitor, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.9, rotate: theme === 'dark' ? -15 : 15 }}
      onClick={toggleTheme}
      className="theme-toggle-btn relative"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <Monitor className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}

      <div
        className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gray-400'}`}
      />
    </motion.button>
  );
}
