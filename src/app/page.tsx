'use client';

import { motion } from 'framer-motion';
import { Cpu, Zap, ShieldCheck, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/use-theme';

export default function Home() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div
      className={`flex flex-col min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
    >
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 px-6 h-20 flex items-center justify-between backdrop-blur-md border-b transition-colors duration-500 ${isDarkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-gray-200'}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-black" />
          </div>
          <span className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            PCnerd <span className="text-primary">ID</span>
          </span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-40 pb-20 text-center overflow-hidden">
        {/* Background Animation Decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-cyan-500/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Rakit PC Impianmu dengan <span className="gradient-text">Kecerdasan AI</span>
          </h1>
          <p
            className={`text-xl mb-10 max-w-2xl mx-auto leading-relaxed transition-colors duration-500 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Dapatkan rekomendasi build PC terbaik berdasarkan budget Anda, lengkap dengan performa gaming, estabilasi
            harga termurah, dan jaminan kompatibilitas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/build"
              className="px-8 py-4 bg-primary text-black font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Mulai Rakit Sekarang
            </Link>
            <button
              className={`px-8 py-4 border font-bold rounded-xl transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm'}`}
            >
              Lihat Contoh Build
            </button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-32 max-w-6xl w-full">
          <FeatureCard
            icon={<Cpu className="w-6 h-6 text-emerald-400" />}
            title="AI Recommendation"
            description="Algoritma cerdas yang menentukan komponen paling worth it."
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={<TrendingDown className="w-6 h-6 text-cyan-400" />}
            title="Harga Termurah"
            description="Aggregator harga dari berbagai e-commerce terkemuka di Indonesia."
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
            title="Compatibility Check"
            description="Jaminan 100% semua komponen cocok satu sama lain."
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6 text-cyan-400" />}
            title="Performa Estimasi"
            description="Prediksi FPS gaming dan performa produktivitas secara real-time."
            isDarkMode={isDarkMode}
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  isDarkMode,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isDarkMode: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`p-6 text-left transition-all duration-300 border rounded-2xl ${
        isDarkMode
          ? 'bg-white/5 border-white/10 hover:border-emerald-500/30'
          : 'bg-white border-gray-100 shadow-sm hover:border-emerald-500/30 hover:shadow-md'
      }`}
    >
      <div className="mb-4">{icon}</div>
      <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
    </motion.div>
  );
}
