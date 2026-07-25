'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, ShieldCheck, TrendingDown, Send, Sparkles, Bot, User, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/use-theme';
import AiLoadingOverlay from '@/components/AiLoadingOverlay';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const EXAMPLE_PROMPTS = [
  'PC gaming Rp 15 juta buat main Valorant dan Genshin',
  'Build PC for editing 4K video Rp 25 jutaan',
  'PC kantor 5 jutaan lengkap monitor dan keyboard',
  'Gaming PC 20 million with RTX 4060 for Warzone',
];

const QA_PROMPTS = [
  'Mana yang lebih bagus Intel atau AMD?',
  'Apakah RTX 4060 worth it untuk 2026?',
  'Perbedaan DDR4 dan DDR5?',
];

export default function Home() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState<'idle' | 'qa' | 'build'>('idle');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading !== 'idle') return;
    const userMsg = prompt.trim();
    setPrompt('');
    setError('');
    setHint('');
    setChatHistory((prev) => [...prev, { role: 'user', text: userMsg }]);
    setShowChat(true);
    setLoading('qa');

    try {
      const res = await fetch('/api/ai/build-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg, history: chatHistory }),
      });

      const data = await res.json();

      if (!res.ok) {
        setChatHistory((prev) => [...prev, { role: 'assistant', text: data.error || 'Gagal memproses prompt' }]);
        if (data.hint) setHint(data.hint);
        setLoading('idle');
        return;
      }

      if (data.intent === 'question') {
        setChatHistory((prev) => [...prev, { role: 'assistant', text: data.answer || 'Maaf, tidak ada jawaban.' }]);
        setLoading('idle');
      } else if (data.intent === 'invalid') {
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', text: data.reason || 'Maaf, pertanyaan tidak dapat diproses.' },
        ]);
        setLoading('idle');
      } else {
        setLoading('build');
        localStorage.setItem('latest_build', JSON.stringify(data.result));
        localStorage.setItem('build_request', JSON.stringify(data.request));
        // Brief delay so user sees the build loading before redirect
        await new Promise((r) => setTimeout(r, 800));
        router.push('/build/results');
      }
    } catch (e: any) {
      setChatHistory((prev) => [...prev, { role: 'assistant', text: e.message || 'Terjadi kesalahan' }]);
      setLoading('idle');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setChatHistory([]);
    setShowChat(false);
    setHint('');
    setError('');
  };

  return (
    <div
      className={`flex flex-col min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
    >
      <AnimatePresence>{loading === 'build' && <AiLoadingOverlay isDarkMode={isDarkMode} />}</AnimatePresence>
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 px-6 h-20 flex items-center justify-between backdrop-blur-md border-b transition-colors duration-300 ${isDarkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-gray-200'}`}
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
            className={`text-xl mb-10 max-w-2xl mx-auto leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Dapatkan rekomendasi build PC terbaik berdasarkan budget Anda, lengkap dengan performa gaming, estabilasi
            harga termurah, dan jaminan kompatibilitas.
          </p>

          {/* AI Chat / Prompt Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-2xl mx-auto mb-12 w-full"
          >
            {/* Chat Messages */}
            {showChat && (chatHistory.length > 0 || loading === 'qa') && (
              <div className="mb-4 space-y-3 max-h-80 overflow-y-auto scroll-smooth relative">
                {chatHistory.length > 1 && (
                  <button
                    onClick={handleClear}
                    className={`absolute top-1 right-1 z-10 p-1.5 rounded-lg transition-all ${
                      isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
                    }`}
                    title="Hapus percakapan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}
                      >
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? isDarkMode
                            ? 'bg-primary/20 text-white rounded-tr-md'
                            : 'bg-primary/10 text-gray-900 rounded-tr-md'
                          : isDarkMode
                            ? 'bg-white/5 text-gray-200 rounded-tl-md border border-white/5'
                            : 'bg-white text-gray-800 rounded-tl-md border border-gray-100 shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}
                      >
                        <User className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator for Q&A loading */}
                {loading === 'qa' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}
                    >
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl rounded-tl-md text-sm flex items-center ${
                        isDarkMode
                          ? 'bg-white/5 text-gray-200 border border-white/5'
                          : 'bg-white text-gray-800 border border-gray-100 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}

            <div
              className={`relative rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-white/[0.03] border-white/10 focus-within:border-primary/50' : 'bg-white border-gray-200 focus-within:border-primary/50 shadow-sm'}`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanya apa pun tentang PC atau minta rekomendasi build..."
                    rows={2}
                    className="w-full bg-transparent text-base resize-none focus:outline-none placeholder:text-gray-500"
                    disabled={loading !== 'idle'}
                  />
                  <div className="flex items-center justify-between mt-2">
                    {!showChat && (
                      <div className="flex flex-wrap gap-2">
                        {QA_PROMPTS.slice(0, 2).map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setPrompt(ex);
                              setError('');
                            }}
                            className={`text-[9px] px-2 py-1 rounded-lg font-bold transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    )}
                    {showChat && <div />}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmit}
                      disabled={!prompt.trim() || loading !== 'idle'}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        !prompt.trim() || loading !== 'idle'
                          ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                          : 'bg-primary text-black hover:opacity-90 shadow-lg shadow-primary/20'
                      }`}
                    >
                      {loading !== 'idle' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {chatHistory.length > 0 ? 'Tanya AI' : 'Tanya / Rakit'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-left">
                <p className="text-red-500 text-xs">{error}</p>
                {hint && <p className="text-gray-400 text-[10px] mt-1">{hint}</p>}
              </motion.div>
            )}

            {!showChat && (
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {[...EXAMPLE_PROMPTS, ...QA_PROMPTS.slice(2)].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(ex);
                      setError('');
                    }}
                    className={`text-[9px] px-2 py-1 rounded-lg font-bold transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {ex.length > 40 ? ex.slice(0, 40) + '...' : ex}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

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
