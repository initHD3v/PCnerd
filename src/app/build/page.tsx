'use client';

import BuildForm from '@/components/build/BuildForm';
import ThemeToggle from '@/components/ThemeToggle';
import { Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/hooks/use-theme';

export default function BuildPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <main
      className={`min-h-screen pt-20 pb-12 px-4 flex flex-col items-center transition-colors duration-300 ${isDarkMode ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
    >
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 px-6 h-20 flex items-center justify-between backdrop-blur-md border-b transition-colors duration-300 ${isDarkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-gray-200'}`}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <span
              className={`font-bold tracking-tight hidden sm:inline ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              PCnerd <span className="text-primary">AI</span>
            </span>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl font-extrabold mb-4">
          Mulai <span className="gradient-text">Build PC</span> Anda
        </h1>
        <p className={`max-w-lg mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Isi detail di bawah ini agar AI kami dapat meracik kombinasi komponen terbaik untuk kebutuhan Anda.
        </p>
      </div>

      <BuildForm />
    </main>
  );
}
