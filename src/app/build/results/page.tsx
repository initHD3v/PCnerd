'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Gamepad2,
  Zap,
  ShieldCheck,
  ArrowUpCircle,
  TrendingUp,
  Box,
  HardDrive,
  Power,
  Fan,
  MemoryStick,
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ThumbsUp,
  ThumbsDown,
  BrainCircuit,
} from 'lucide-react';
import Link from 'next/link';
import { predictPerformance, generateNarrative } from '@/lib/recommendation-engine';
import { useTheme } from '@/hooks/use-theme';
import ThemeToggle from '@/components/ThemeToggle';

const TYPE_ICONS: Record<string, any> = {
  CPU: Cpu,
  GPU: Gamepad2,
  MOTHERBOARD: Box,
  RAM: MemoryStick,
  STORAGE: HardDrive,
  PSU: Power,
  CASE: Box,
  COOLER: Fan,
};

export default function BuildResults() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeBuild, setActiveBuild] = useState<any>(null);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem('latest_build');
        if (saved) {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setActiveBuild(parsed);
        } else {
          router.replace('/build');
        }
      } catch {
        router.replace('/build');
      }
      setReady(true);
    });
  }, [router]);

  // Background LLM narrative refresh on initial load
  useEffect(() => {
    if (!activeBuild || activeBuild.llmLoaded) return;
    const build = activeBuild.build;
    const budget = activeBuild.targetBudget;
    const timer = setTimeout(() => {
      fetch('/api/ai/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          build,
          budget,
          purpose: activeBuild.purpose || 'Gaming',
          resolution: activeBuild.resolution || '1080p',
        }),
      })
        .then((r) => r.json())
        .then((llm) => {
          if (llm && !llm.error) {
            setActiveBuild((prev: any) => ({
              ...prev,
              narrative: llm,
              llmLoaded: true,
            }));
          }
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBuild?.llmLoaded]);

  if (!ready || !activeBuild)
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-black'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm font-bold">Loading your dream build...</p>
        </div>
      </div>
    );

  const handleUpgrade = (upgrade: any) => {
    const updatedBuild = { ...activeBuild.build, [upgrade.componentType]: upgrade.suggestedPart };
    recalculateBuild(updatedBuild, true);
  };

  const handleUndo = (type: string) => {
    const updatedBuild = { ...activeBuild.build, [type]: data.originalBuild[type] };
    const isStillUpgraded = Object.entries(updatedBuild).some(
      ([t, p]: [string, any]) => p.id !== data.originalBuild[t]?.id,
    );
    recalculateBuild(updatedBuild, isStillUpgraded);
  };

  const handleResetAll = () => {
    recalculateBuild(data.originalBuild, false);
  };

  const recalculateBuild = (newComponents: any, isUpgrade: boolean) => {
    const newTotalPrice = Object.values(newComponents).reduce((sum: number, item: any) => sum + (item?.price || 0), 0);
    const gpuName = newComponents.GPU?.name || '';
    const resolution = activeBuild.resolution || '1080p';
    const newPerformance = predictPerformance(
      newComponents.GPU?.price || 0,
      newComponents.CPU.price,
      gpuName,
      resolution,
    );
    const newNarrative = generateNarrative(
      newComponents,
      {
        budget: activeBuild.targetBudget,
        purpose: 'Gaming',
        includePeripheral: false,
      },
      isUpgrade,
    );

    setActiveBuild({
      ...activeBuild,
      build: newComponents,
      totalPrice: newTotalPrice,
      performance: newPerformance,
      narrative: newNarrative,
      isOverBudget: newTotalPrice > activeBuild.targetBudget,
    });

    // Background refresh narrative via LLM API
    fetch('/api/ai/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        build: newComponents,
        budget: activeBuild.targetBudget,
        purpose: activeBuild.purpose || 'Gaming',
        resolution: activeBuild.resolution || '1080p',
      }),
    })
      .then((r) => r.json())
      .then((llm) => {
        if (llm && !llm.error) {
          setActiveBuild((prev: any) => ({
            ...prev,
            narrative: llm,
            llmLoaded: true,
          }));
        }
      })
      .catch(() => {});
  };

  const isPartUpgraded = (type: string) => {
    return activeBuild.build[type]?.id !== data.originalBuild[type]?.id;
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
    >
      {/* Dynamic Header / Summary */}
      <header
        className={`border-b sticky top-0 z-40 transition-colors duration-500 ${isDarkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-gray-200'} backdrop-blur-md`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/build"
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="hidden md:block">
              <h2
                className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
              >
                Current Budget
              </h2>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-lg font-black">Rp {activeBuild.targetBudget.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div
                className={`text-xs font-bold uppercase tracking-widest ${activeBuild.isOverBudget ? 'text-red-500' : 'text-emerald-500'}`}
              >
                {activeBuild.isOverBudget ? 'Over Budget' : 'Within Budget'}
              </div>
              <div className={`text-2xl font-black ${activeBuild.isOverBudget ? 'text-red-500' : 'text-emerald-500'}`}>
                Rp {activeBuild.totalPrice.toLocaleString('id-ID')}
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>

        <div className={`h-1 w-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((activeBuild.totalPrice / activeBuild.targetBudget) * 100, 100)}%` }}
            className={`h-full ${activeBuild.isOverBudget ? 'bg-red-500' : 'bg-primary'}`}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Box className="w-6 h-6 text-primary" /> Component Selection
              </h3>
              {Object.keys(activeBuild.build).some(
                (key) => activeBuild.build[key]?.id !== data.originalBuild[key]?.id,
              ) && (
                <button
                  onClick={handleResetAll}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to Original Build
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(activeBuild.build).map(([type, part]: [string, any]) => {
                const Icon = TYPE_ICONS[type] || Box;
                const upgraded = isPartUpgraded(type);
                return (
                  <motion.div
                    layout
                    key={type}
                    className={`glass-card relative p-5 transition-all ${upgraded ? 'ring-1 ring-primary/30' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}
                      >
                        <Icon className={`w-6 h-6 ${upgraded ? 'text-primary' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                          >
                            {type}
                          </span>
                          {upgraded && (
                            <button
                              onClick={() => handleUndo(type)}
                              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Undo
                            </button>
                          )}
                        </div>
                        <h4 className="text-sm font-bold truncate pr-4">{part?.name}</h4>
                        {type === 'RAM' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {[part?.ramType, extractRamSize(part?.name || ''), extractRamSpeed(part?.name || '')]
                              .filter(Boolean)
                              .join(' · ') || part?.name}
                          </div>
                        )}
                        {type === 'STORAGE' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {[extractStorageCapacity(part?.name || ''), extractStorageType(part?.name || ''), part?.formFactor]
                              .filter(Boolean)
                              .join(' · ') || part?.name}
                          </div>
                        )}
                        {type === 'CPU' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {[part?.model, part?.socket, part?.tdp ? `${part.tdp}W` : ''].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {type === 'GPU' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {[extractGpuModel(part?.name || ''), extractGpuVram(part?.specs)].filter(Boolean).join(' · ') || part?.name}
                          </div>
                        )}
                        {type === 'MOTHERBOARD' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {[part?.socket, part?.ramType, part?.formFactor].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {type === 'PSU' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {part?.wattage ? `${part.wattage}W` : part?.name}
                          </div>
                        )}
                        {type === 'CASE' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {part?.formFactor || part?.name}
                          </div>
                        )}
                        {type === 'COOLER' && (
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                            {extractCoolerSize(part?.name || '') || part?.name}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-black text-primary">
                            Rp {part?.price.toLocaleString('id-ID')}
                          </span>
                          {upgraded && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-primary text-black rounded-full">
                              UPGRADED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {activeBuild.performance.map((perf: any, idx: number) => (
                <div key={idx} className="glass-card p-6 border-l-4 border-l-primary shadow-none bg-transparent">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-2">{perf.category}</div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-black">{perf.fps}</div>
                    <div className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                      {perf.level} Level
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <section className="glass-card p-6 border-primary/20 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <BrainCircuit className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    AI Assistant
                    {!activeBuild.llmLoaded && (activeBuild.narrative.weaknesses === undefined || activeBuild.narrative.weaknesses.length === 0) && (
                      <span className="ml-2 text-[10px] text-gray-500 font-normal animate-pulse">(loading...)</span>
                    )}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Real-time Analysis</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed italic mb-6">"{activeBuild.narrative.general || activeBuild.narrative.general}"</p>

              {activeBuild.narrative.strengths && activeBuild.narrative.strengths.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase">Strengths</span>
                  </div>
                  <ul className="space-y-1">
                    {activeBuild.narrative.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-[11px] text-gray-400 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeBuild.narrative.weaknesses && activeBuild.narrative.weaknesses.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsDown className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-500 uppercase">Weaknesses</span>
                  </div>
                  <ul className="space-y-1">
                    {activeBuild.narrative.weaknesses.map((w: string, i: number) => (
                      <li key={i} className="text-[11px] text-gray-400 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">-</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <StatusItem
                  icon={CheckCircle2}
                  label="Compatibility"
                  value="100% Guaranteed"
                  color="text-emerald-500"
                  darkMode={isDarkMode}
                />
                <StatusItem
                  icon={activeBuild.technical.isPsuSafe ? CheckCircle2 : AlertTriangle}
                  label="Power Supply"
                  value={`${activeBuild.technical.psuWattage}W - ${activeBuild.technical.isPsuSafe ? 'Healthy' : 'Tight'}`}
                  color={activeBuild.technical.isPsuSafe ? 'text-emerald-500' : 'text-amber-500'}
                  darkMode={isDarkMode}
                />
                <StatusItem
                  icon={TrendingUp}
                  label="Balance"
                  value={activeBuild.technical.bottleneckStatus}
                  color="text-blue-500"
                  darkMode={isDarkMode}
                />
              </div>
            </section>

            <div className="space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-emerald-400" /> Available Upgrades
              </h3>
              <div className="space-y-3">
                {activeBuild.upgrades
                  .filter((u: any) => !isPartUpgraded(u.componentType))
                  .map((upgrade: any, idx: number) => (
                    <div key={idx} className="glass-card p-4 hover:border-primary/50 group transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-primary uppercase">{upgrade.componentType}</span>
                        <span className="text-xs font-black">+Rp {upgrade.priceDiff.toLocaleString('id-ID')}</span>
                      </div>
                      <h4 className="text-sm font-bold mb-1">{upgrade.suggestedPart.name}</h4>
                      <p className="text-[10px] text-gray-500 mb-4">{upgrade.benefit}</p>
                      <button
                        onClick={() => handleUpgrade(upgrade)}
                        className="w-full py-2.5 bg-primary text-black text-xs font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        Apply Upgrade <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function extractRamSize(name: string): string {
  const match = name.match(/(\d+\s*GB(?:\s*\(\d+\s*x\s*\d+\))?)/i);
  return match ? match[1] : '';
}

function extractRamSpeed(name: string): string {
  const match = name.match(/(\d{4,5}\s*MHz)/i);
  return match ? match[1] : '';
}

function extractStorageCapacity(name: string): string {
  const match = name.match(/(\d+\s*(?:GB|TB))/i);
  return match ? match[1] : '';
}

function extractStorageType(name: string): string {
  const match = name.match(/\b(SSD|NVMe|HDD)\b/i);
  return match ? match[1].toUpperCase() : '';
}

function extractGpuVram(specs: any): string {
  if (!specs) return '';
  if (typeof specs === 'string') {
    try { const p = JSON.parse(specs); return p?.vram || ''; } catch { return ''; }
  }
  return specs.vram || '';
}

function extractGpuModel(name: string): string {
  const match = name.match(/(RTX\s*\d+\s*\w*|RX\s*\d+\s*\w*|GTX\s*\d+\s*\w*|Arc\s*\w*)/i);
  return match ? match[0] : '';
}

function extractCoolerSize(name: string): string {
  const match = name.match(/(\d+mm)/i);
  return match ? match[0] : '';
}

function StatusItem({ icon: Icon, label, value, color, darkMode }: any) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
      </div>
      <span className={`text-[10px] font-black ${color}`}>{value}</span>
    </div>
  );
}
