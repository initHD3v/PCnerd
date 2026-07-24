'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ThumbsUp,
  ThumbsDown,
  BrainCircuit,
  BarChart3,
  Gauge,
  Monitor,
  Keyboard,
  Mouse,
  Lightbulb,
  Printer,
} from 'lucide-react';
import Link from 'next/link';
import { predictPerformance, generateNarrative } from '@/lib/recommendation-engine';
import { useTheme } from '@/hooks/use-theme';
import ThemeToggle from '@/components/ThemeToggle';
import { findCpuBenchmark, findGpuBenchmark, suggestBottleneckFix, analyzeBottleneck, estimateFpsFromPrice } from '@/data/benchmarks';

const TYPE_ICONS: Record<string, any> = {
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

const TYPE_LABELS: Record<string, string> = {
  CPU: 'Processor',
  GPU: 'Kartu Grafis',
  MOTHERBOARD: 'Motherboard',
  RAM: 'RAM',
  STORAGE: 'Penyimpanan',
  PSU: 'Power Supply',
  CASE: 'Casing',
  COOLER: 'Pendingin',
  MONITOR: 'Monitor',
  KEYBOARD: 'Keyboard',
  MOUSE: 'Mouse',
};

const TIER_CONFIG = {
  cheapest: { label: 'Termurah', badge: 'Best Value', icon: ShieldCheck },
  mid: { label: 'Menengah', badge: 'Balanced', icon: TrendingUp },
  max: { label: 'Max Budget', badge: 'Max Performance', icon: Zap },
} as const;

type TierKey = keyof typeof TIER_CONFIG;

export default function BuildResults() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTier, setActiveTier] = useState<TierKey>('max');
  const [appliedUpgrades, setAppliedUpgrades] = useState<Record<string, any>>({});
  const [requestData, setRequestData] = useState<any>(null);
  const [gameQuality, setGameQuality] = useState<'LOW' | 'Medium' | 'High' | 'Ultra'>('Ultra');
  const [gameType, setGameType] = useState<'AAA Games' | 'E-Sports'>('AAA Games');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const loadBuild = useCallback(() => {
    const saved = localStorage.getItem('latest_build');
    if (!saved) {
      router.replace('/build');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.tiers) {
        router.replace('/build');
        return;
      }
      setData(parsed);
    } catch {
      router.replace('/build');
    }
    const req = localStorage.getItem('build_request');
    if (req) {
      try { setRequestData(JSON.parse(req)); } catch {}
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    Promise.resolve().then(loadBuild);
  }, [loadBuild]);

  const activeBuild = useMemo(() => {
    if (!data?.tiers) return null;
    return data.tiers[activeTier];
  }, [data, activeTier]);

  const determineTierKey = (tierData: any): TierKey => {
    if (!data) return 'max';
    for (const key of ['cheapest', 'mid', 'max'] as TierKey[]) {
      if (data.tiers[key] === tierData) return key;
    }
    return 'max';
  };

  const handleSwitchTier = (tier: TierKey) => {
    setActiveTier(tier);
    setAppliedUpgrades({});
  };

  const estimateGpuTdp = useCallback((gpu: any) => {
    if (gpu?.tdp) return gpu.tdp;
    const p = gpu?.price || 0;
    if (p > 15000000) return 350;
    if (p > 8000000) return 250;
    if (p > 4000000) return 200;
    if (p > 2000000) return 150;
    return 100;
  }, []);

  const upgradeState = useMemo(() => {
    if (!activeBuild) return null;
    const build = { ...activeBuild.build };
    for (const [type, part] of Object.entries(appliedUpgrades)) {
      if (part && build[type]) build[type] = part;
    }
    const totalPrice = Object.values(build).reduce((s: number, p: any) => s + (p?.price || 0), 0);
    const performance = predictPerformance(
      build.GPU?.price || 0,
      build.CPU?.price || 0,
      build.GPU?.name || '',
      activeBuild.resolution,
      build.CPU?.name || '',
      build.RAM?.name || '',
      requestData?.purpose,
    );
    const totalTdp = (build.CPU?.tdp || 0) + (build.GPU ? estimateGpuTdp(build.GPU) : 0);
    const psuWattage = build.PSU?.wattage || 0;
    const isPsuSafe = psuWattage >= totalTdp * 1.25;
    const cpuBench = findCpuBenchmark(build.CPU?.name || '');
    const gpuBench = findGpuBenchmark(build.GPU?.name || '');
    const bottleneck = analyzeBottleneck(cpuBench, gpuBench, activeBuild.resolution || '1080p');
    const narrative = generateNarrative(
      build,
      { budget: activeBuild.targetBudget, purpose: requestData?.purpose || 'Gaming', resolution: activeBuild.resolution || '1080p', includePeripheral: false, platform: requestData?.platform || 'default' },
      Object.keys(appliedUpgrades).length > 0,
    );
    return { build, totalPrice, performance, technical: { totalTdp, psuWattage, isPsuSafe, bottleneckStatus: bottleneck.status }, narrative };
  }, [activeBuild, appliedUpgrades, requestData, estimateGpuTdp]);

  const hasUpgrades = Object.keys(appliedUpgrades).length > 0;
  const build = upgradeState?.build ?? activeBuild?.build ?? {};
  const totalPrice = upgradeState?.totalPrice ?? activeBuild?.totalPrice ?? 0;
  const performance = upgradeState?.performance ?? activeBuild?.performance ?? [];
  const technical = upgradeState?.technical ?? activeBuild?.technical ?? {};
  const narrative = hasUpgrades ? upgradeState?.narrative ?? {} : activeBuild?.narrative ?? {};

  const handleUpgrade = useCallback((componentType: string, upgrade: any) => {
    setAppliedUpgrades((prev) => ({ ...prev, [componentType]: upgrade.suggestedPart }));
  }, []);

  const handleReset = useCallback((componentType: string) => {
    setAppliedUpgrades((prev) => {
      const next = { ...prev };
      delete next[componentType];
      return next;
    });
  }, []);

  const findUpgradeForType = useCallback((type: string) => {
    const currentBuild = upgradeState?.build ?? activeBuild?.build ?? {};
    const current = currentBuild[type];
    if (!current?.id) return null;
    return (activeBuild?.upgrades || []).find(
      (u: any) => u.componentType === type && u.currentPart?.id === current.id,
    );
  }, [activeBuild, upgradeState]);

  if (!ready || !activeBuild) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-black'}`}
      >
        <div className="flex flex-col items-center gap-8">
          <div className="relative w-28 h-28">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, transparent 30%, ${isDark ? '#10b981' : '#059669'} 50%, transparent 70%)`,
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
                <Zap className="w-7 h-7 text-primary" />
              </motion.div>
            </div>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                className={`w-2 h-2 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const {
    targetBudget,
    distribution,
    lowBudgetAdvice,
  } = activeBuild;
  const isOverBudget = totalPrice > targetBudget;

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
    >
      <style>{`
        @media print {
          @page { margin: 15mm 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-section {
            page-break-inside: avoid;
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            background: white;
          }
          .print-header {
            text-align: center;
            padding: 24px 0 16px;
            border-bottom: 2px solid #10b981;
            margin-bottom: 24px;
          }
          .print-header h1 {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            margin: 0 0 4px;
          }
          .print-header p {
            font-size: 11px;
            color: #6b7280;
            margin: 0;
          }
          .print-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .print-table th {
            text-align: left;
            padding: 6px 8px;
            background: #f9fafb;
            color: #374151;
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e5e7eb;
          }
          .print-table td {
            padding: 6px 8px;
            color: #374151;
            border-bottom: 1px solid #f3f4f6;
          }
          .print-table td:last-child { text-align: right; font-weight: 700; }
          .print-table tr:last-child td { border-bottom: none; }
          .print-total td {
            border-top: 2px solid #10b981 !important;
            font-weight: 800 !important;
            font-size: 13px !important;
            color: #059669 !important;
            padding-top: 8px !important;
          }
          .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .print-metric { padding: 8px; background: #f9fafb; border-radius: 6px; }
          .print-metric-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; }
          .print-metric-value { font-size: 14px; font-weight: 800; color: #111827; }
          .print-footer {
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            margin-top: 32px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }
          .print-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 700;
            background: #d1fae5;
            color: #059669;
          }
        }
        .print-only { display: none; }
      `}</style>
      {/* ── Print-Optimized Layout ── */}
      <div className="print-only">
        <div className="print-header">
          <h1>PCnerd ID — Build Report</h1>
          <p>Dibuat pada {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="print-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#111827' }}>
              {TIER_CONFIG[activeTier].label} Build
            </h2>
            <span className="print-badge">{TIER_CONFIG[activeTier].badge}</span>
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Komponen</th>
                <th style={{ width: '40%' }}>Nama</th>
                <th style={{ width: '20%' }}>Harga</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(build)
                .filter(([, p]) => p)
                .map(([type, part]: [string, any]) => (
                  <tr key={type}>
                    <td style={{ fontWeight: 700 }}>{TYPE_LABELS[type] || type}</td>
                    <td style={{ color: '#6b7280' }}>{part.name}</td>
                    <td>Rp {part.price.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              <tr className="print-total">
                <td colSpan={2} style={{ textAlign: 'right' }}>Total</td>
                <td>Rp {totalPrice.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, textAlign: 'right' }}>
            Budget: Rp {targetBudget.toLocaleString('id-ID')} ·{' '}
            {totalPrice > targetBudget ? 'Over budget' : `${Math.round((totalPrice / targetBudget) * 100)}% terpakai`}
          </div>
        </div>

        <div className="print-section">
          <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px', color: '#111827' }}>
            Estimasi Performa
          </h3>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Kategori</th>
                <th style={{ width: '30%' }}>FPS</th>
                <th style={{ width: '20%' }}>Level</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((perf: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{perf.category}</td>
                  <td style={{ fontWeight: 800 }}>{perf.fps}</td>
                  <td>
                    <span className="print-badge">{perf.level}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-section">
          <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px', color: '#111827' }}>
            Technical Overview
          </h3>
          <div className="print-grid">
            <div className="print-metric">
              <div className="print-metric-label">Total TDP</div>
              <div className="print-metric-value">{technical.totalTdp}W</div>
            </div>
            <div className="print-metric">
              <div className="print-metric-label">PSU</div>
              <div className="print-metric-value">{technical.psuWattage}W</div>
            </div>
            <div className="print-metric">
              <div className="print-metric-label">Bottleneck</div>
              <div className="print-metric-value" style={{ fontSize: 11 }}>{technical.bottleneckStatus || 'Seimbang'}</div>
            </div>
            <div className="print-metric">
              <div className="print-metric-label">Performa Tier</div>
              <div className="print-metric-value">
                {build.GPU
                  ? totalPrice > 25000000 ? 'High-End'
                    : totalPrice > 12000000 ? 'Mid' : 'Entry'
                  : 'Office'}
              </div>
            </div>
          </div>
        </div>

        <div className="print-footer">
          PCnerd ID — AI PC Builder Indonesia · {new Date().toLocaleDateString('id-ID')}
        </div>
      </div>

      {/* ── Sticky Header ── */}
      <header
        className={`no-print border-b sticky top-0 z-40 backdrop-blur-xl transition-colors ${isDark ? 'bg-black/80 border-white/5' : 'bg-white/80 border-gray-200'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/build"
                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-black" />
                </div>
                <Link href="/" className="font-bold text-sm hover:text-primary transition-colors">PCnerd</Link>
              </div>
            </div>

            
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9, rotate: -15 }}
                onClick={() => window.print()}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 print:hidden ${isDark ? 'bg-white/5 hover:bg-white/10 text-primary' : 'bg-gray-100 hover:bg-gray-200 text-primary shadow-inner'}`}
                title="Export PDF"
              >
                <Printer className="w-5 h-5" />
                <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gray-400'}`} />
              </motion.button>
              <div className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
              <ThemeToggle />
            </div>
          </div>

          {/* Budget bar */}
          <div className={`h-0.5 w-full no-print ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalPrice / targetBudget) * 100, 100)}%` }}
              className={`h-full ${isOverBudget ? 'bg-red-500' : 'bg-primary'}`}
            />
          </div>
        </div>
      </header>

      {/* ── Low Budget Advice ── */}
      {lowBudgetAdvice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 no-print">
          <div
            className={`p-6 rounded-2xl border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">{lowBudgetAdvice.title}</h3>
                <p className="text-xs opacity-70 mb-4">{lowBudgetAdvice.message}</p>
                <div className="flex flex-wrap gap-2">
                  {lowBudgetAdvice.strategies?.map((s: any) => (
                    <span
                      key={s.id}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white/10 dark:bg-white/5 border border-white/10"
                    >
                      {s.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ════ LEFT COLUMN ════ */}
          <div className="lg:col-span-8 space-y-6">
            {/* ── Tier Selector ── */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                {(Object.entries(TIER_CONFIG) as [TierKey, (typeof TIER_CONFIG)[keyof typeof TIER_CONFIG]][]).map(
                  ([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isActive = activeTier === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSwitchTier(key)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isActive ? 'bg-primary text-black shadow-sm' : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{cfg.label}</span>
                        <span className="sm:hidden">{cfg.label.charAt(0)}</span>
                        {isActive && data && (
                          <span className="hidden sm:inline text-[9px] opacity-60 ml-1">{cfg.badge}</span>
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* ── Components Section ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Box className="w-5 h-5 text-primary" /> Komponen
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {Object.values(build).filter(Boolean).length} items
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(build)
                  .filter(([, part]) => part)
                  .map(([type, part]: [string, any], idx) => {
                    const Icon = TYPE_ICONS[type] || Box;
                    const upgrade = findUpgradeForType(type);
                    const isUpgraded = !!appliedUpgrades[type];
                    return (
                      <motion.div
                        layout
                        key={type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.06, ease: 'easeOut' }}
                        className={`component-card ${isUpgraded ? (isDark ? '!border-emerald-500/30' : '!border-emerald-400') : ''}`}
                      >
                        {isUpgraded && (
                          <div className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-[8px] font-black text-white tracking-wider shadow-lg z-10">
                            UPGRADED
                          </div>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider opacity-40">
                                {TYPE_LABELS[type] || type}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold truncate">{part.name}</h4>
                            <div className="flex flex-wrap gap-x-2 text-[10px] opacity-40 mt-0.5">
                              {type === 'GPU' && (
                                <span>{extractGpuModel(part.name)}{extractGpuVram(part.specs) ? ` · ${extractGpuVram(part.specs)}` : ''}</span>
                              )}
                              {type === 'RAM' && (
                                <span>{[part.ramType, extractRamSpeed(part.name)].filter(Boolean).join(' · ')}</span>
                              )}
                              {type === 'STORAGE' && (
                                <span>{[extractStorageCapacity(part.name), extractStorageType(part.name)].filter(Boolean).join(' · ')}</span>
                              )}
                              {type === 'CPU' && (
                                <span>{[part.socket, part.tdp ? `${part.tdp}W` : ''].filter(Boolean).join(' · ')}</span>
                              )}
                              {type === 'PSU' && part.wattage && <span>{part.wattage}W</span>}
                              {type === 'MOTHERBOARD' && (
                                <span>{[part.socket, part.ramType].filter(Boolean).join(' · ')}</span>
                              )}
                            </div>

                            {isUpgraded ? (
                              <div className="mt-3 pt-3 border-t border-dashed border-white/10">
                                <button
                                  onClick={() => handleReset(type)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate flex-1 text-left">Reset ke part awal</span>
                                </button>
                              </div>
                            ) : upgrade ? (
                              <div className="mt-3 pt-3 border-t border-dashed border-white/10">
                                <button
                                  onClick={() => handleUpgrade(type, upgrade)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                >
                                  <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate flex-1 text-left">{upgrade.suggestedPart.name}</span>
                                  <span className="shrink-0">+Rp {upgrade.priceDiff.toLocaleString('id-ID')}</span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-primary">
                              Rp {part.price.toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(part.name + ' harga Indonesia')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Lihat detail"
                          className="absolute bottom-2 right-2 w-6 h-6 rounded-md flex items-center justify-center opacity-20 hover:opacity-100 hover:bg-white/10 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#EA4335" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </a>
                      </motion.div>
                    );
                  })}
              </div>
            </section>

            {/* ── Budget Summary ── */}
            <section className="section-card">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverBudget ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    <Wallet className={`w-5 h-5 ${isOverBudget ? 'text-red-500' : 'text-emerald-500'}`} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-40">Total Biaya</div>
                    <div className={`text-xl font-black ${isOverBudget ? 'text-red-500' : 'text-emerald-500'}`}>
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-40">Budget</div>
                  <div className="text-lg font-bold">Rp {targetBudget.toLocaleString('id-ID')}</div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className={`text-xs font-black px-3 py-1.5 rounded-lg ${isOverBudget ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {isOverBudget ? `− Rp ${(totalPrice - targetBudget).toLocaleString('id-ID')}` : `${Math.round((totalPrice / targetBudget) * 100)}%`}
                  </div>
                </div>
              </div>
              <div className={`mt-3 h-2 w-full rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalPrice / targetBudget) * 100, 100)}%` }}
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-primary'}`}
                />
              </div>
            </section>

            {/* ── Performance ── */}
            <section>
              <h2 className="text-lg font-black flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" /> Estimasi Performa
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['GAME', 'Video Rendering', 'Rendering 3D', 'Office', 'Coding'].map((group) => {
                  const items = performance.filter((p: any) => p.category.startsWith(group));
                  if (items.length === 0) return null;

                  if (group === 'Office' || group === 'Coding') {
                    const vals = items.map((p: any) => {
                      const n = parseInt(p.fps.replace(/[^0-9]/g, ''));
                      return isNaN(n) ? 0 : n;
                    });
                    const bestVal = Math.max(...vals);
                    const groupLevel = bestVal >= 15000 ? 'Ultra' : bestVal >= 5000 ? 'High' : bestVal >= 1500 ? 'Mid' : 'Entry';
                    const borderColor = groupLevel === 'Ultra' ? 'border-purple-500/30' : groupLevel === 'High' ? 'border-emerald-500/30' : groupLevel === 'Mid' ? 'border-amber-500/30' : 'border-red-500/30';
                    const headerColor = groupLevel === 'Ultra' ? 'text-purple-500' : groupLevel === 'High' ? 'text-emerald-500' : groupLevel === 'Mid' ? 'text-amber-500' : 'text-red-500';
                    return (
                      <div key={group} className={`rounded-xl border ${borderColor} bg-white/[0.02] overflow-hidden`}>
                        <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
                          <span className="text-xs font-black uppercase tracking-wider">{group === 'Office' ? 'Kantor / Sekolah' : 'Coding / Programming'}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 ${headerColor}`}>{groupLevel}</span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {items.map((perf: any, idx: number) => {
                            const label = perf.category.replace(/^(Office|Coding)\s*/, '').trim();
                            const levelColor = perf.level === 'Ultra' ? 'text-purple-500' : perf.level === 'High' ? 'text-emerald-500' : perf.level === 'Mid' ? 'text-amber-500' : 'text-red-500';
                            const barColor = perf.level === 'Ultra' ? 'bg-purple-500' : perf.level === 'High' ? 'bg-emerald-500' : perf.level === 'Mid' ? 'bg-amber-500' : 'bg-red-500';
                            const barWidth = perf.level === 'Ultra' ? '100%' : perf.level === 'High' ? '70%' : perf.level === 'Mid' ? '45%' : '25%';
                            return (
                              <div key={idx} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold opacity-40">{label}</span>
                                  <span className={`text-sm font-black ${levelColor}`}>{perf.fps}</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/5">
                                  <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: barWidth }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (group !== 'GAME') {
                    const fpsValues = items.map((p: any) => parseInt(p.fps));
                    const bestFps = Math.max(...fpsValues);
                    const groupLevel = bestFps >= 100 ? 'Ultra' : bestFps >= 60 ? 'High' : bestFps >= 40 ? 'Mid' : 'Entry';
                    const borderColor = groupLevel === 'Ultra' ? 'border-purple-500/30' : groupLevel === 'High' ? 'border-emerald-500/30' : groupLevel === 'Mid' ? 'border-amber-500/30' : 'border-red-500/30';
                    const headerColor = groupLevel === 'Ultra' ? 'text-purple-500' : groupLevel === 'High' ? 'text-emerald-500' : groupLevel === 'Mid' ? 'text-amber-500' : 'text-red-500';
                    return (
                      <div key={group} className={`rounded-xl border ${borderColor} bg-white/[0.02] overflow-hidden`}>
                        <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
                          <span className="text-xs font-black uppercase tracking-wider">{group}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 ${headerColor}`}>{groupLevel}</span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {items.map((perf: any, idx: number) => {
                            const resMatch = perf.category.match(/\((.+)\)/);
                            const resLabel = resMatch ? resMatch[1] : '';
                            const levelColor = perf.level === 'Ultra' ? 'text-purple-500' : perf.level === 'High' ? 'text-emerald-500' : perf.level === 'Mid' ? 'text-amber-500' : 'text-red-500';
                            const barColor = perf.level === 'Ultra' ? 'bg-purple-500' : perf.level === 'High' ? 'bg-emerald-500' : perf.level === 'Mid' ? 'text-amber-500' : 'bg-amber-500';
                            const barWidth = perf.level === 'Ultra' ? '100%' : perf.level === 'High' ? '70%' : perf.level === 'Mid' ? '45%' : '25%';
                            return (
                              <div key={idx} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold opacity-40">{resLabel}</span>
                                  <span className={`text-sm font-black ${levelColor}`}>{perf.fps}</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/5">
                                  <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: barWidth }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  const isProductivityBuild = requestData?.purpose === 'Office' || requestData?.purpose === 'Coding';

                  return (
                    <div key={group} className={`rounded-xl border ${isProductivityBuild ? 'border-white/10' : ''} bg-white/[0.02] overflow-hidden`}>
                      {isProductivityBuild ? (
                        <div className="px-4 py-3 text-center text-[10px] opacity-40">
                          Game FPS tidak relevan untuk build {requestData?.purpose === 'Office' ? 'kantor' : 'coding'}.
                          Fokus pada performa komputasi di panel sebelah.
                        </div>
                      ) : (
                        <>
                          <div className={`px-4 py-3 border-b flex items-center justify-between`}>
                            <span className="text-xs font-black uppercase tracking-wider">GAME</span>
                          </div>
                          <div className="px-4 pt-3 pb-2 space-y-2">
                            <div className="flex gap-1">
                              {(['LOW', 'Medium', 'High', 'Ultra'] as const).map((q) => (
                                <button
                                  key={q}
                                  onClick={() => setGameQuality(q)}
                                  className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${gameQuality === q ? 'bg-primary text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {(['AAA Games', 'E-Sports'] as const).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setGameType(t)}
                                  className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${gameType === t ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="divide-y divide-white/5">
                            {[1080, 1440, 2160].map((res, idx) => {
                              const resKey = idx === 0 ? '1080p' : idx === 1 ? '1440p' : '4K';
                              const gpuBench = build.GPU?.name ? findGpuBenchmark(build.GPU?.name) : null;
                              const cpuBench = build.CPU?.name ? findCpuBenchmark(build.CPU?.name) : null;
                              const QUALITY_MULT: Record<string, number> = { LOW: 2.0, Medium: 1.5, High: 1.2, Ultra: 1.0 };
                              let fps = 0;
                              if (gpuBench) {
                                const baseFps = gameType === 'E-Sports' ? gpuBench.fpsEsports : resKey === '4K' ? gpuBench.fps4k : resKey === '1440p' ? gpuBench.fps1440p : gpuBench.fps1080p;
                                let cpuMult = 1.0;
                                if (cpuBench) {
                                  const gpuAvg = (gpuBench.fps1080p + gpuBench.fps1440p + gpuBench.fps4k) / 3;
                                  const target = gpuAvg * 100 * 0.6;
                                  if (cpuBench.passmarkSingle < target) cpuMult = Math.max(0.5, cpuBench.passmarkSingle / target);
                                }
                                fps = Math.round(baseFps * cpuMult * QUALITY_MULT[gameQuality]);
                              } else {
                                const fallback = estimateFpsFromPrice(build.GPU?.price || 0);
                                fps = parseInt(gameType === 'E-Sports' ? fallback.esports : fallback.aaa) * QUALITY_MULT[gameQuality];
                              }
                              const level = fps >= 100 ? 'Ultra' : fps >= 60 ? 'High' : fps >= 40 ? 'Mid' : 'Entry';
                              const levelColor = level === 'Ultra' ? 'text-purple-500' : level === 'High' ? 'text-emerald-500' : level === 'Mid' ? 'text-amber-500' : 'text-red-500';
                              const barColor = level === 'Ultra' ? 'bg-purple-500' : level === 'High' ? 'bg-emerald-500' : level === 'Mid' ? 'bg-amber-500' : 'bg-red-500';
                              const barWidth = level === 'Ultra' ? '100%' : level === 'High' ? '70%' : level === 'Mid' ? '45%' : '25%';
                              return (
                                <div key={resKey} className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold opacity-40">{resKey}</span>
                                    <span className={`text-sm font-black ${levelColor}`}>{fps} FPS</span>
                                  </div>
                                  <div className="h-1 w-full rounded-full bg-white/5">
                                    <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: barWidth }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <div className="lg:col-span-4 space-y-6">
            {/* ── AI Narrative ── */}
            <section
              className="section-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <BrainCircuit className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-sm">AI Analysis</h3>
                  <p className="text-[10px] opacity-40 font-bold uppercase">Real-time</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed italic mb-5">
                {narrative?.general ? (
                  `"${narrative.general}"`
                ) : (
                  <span className="opacity-40 animate-pulse">Menganalisis...</span>
                )}
              </p>

              {narrative?.strengths?.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ThumbsUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Strengths</span>
                  </div>
                  <ul className="space-y-1">
                    {narrative.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-[11px] opacity-60 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 shrink-0">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {narrative?.weaknesses?.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ThumbsDown className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Weaknesses</span>
                  </div>
                  <ul className="space-y-1">
                    {narrative.weaknesses.map((w: string, i: number) => (
                      <li key={i} className="text-[11px] opacity-60 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 shrink-0">−</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* ── Technical Overview ── */}
            <section className="section-card">
              <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" /> Technical Overview
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">Total TDP</div>
                  <div className="text-lg font-black mt-1">{technical.totalTdp}<span className="text-xs opacity-40">W</span></div>
                </div>
                <div className={`p-3 rounded-xl border ${technical.isPsuSafe ? 'border-white/5 bg-white/[0.03]' : 'border-amber-500/20 bg-amber-500/5'}`}>
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">PSU</div>
                  <div className={`text-lg font-black mt-1 ${technical.isPsuSafe ? '' : 'text-amber-500'}`}>
                    {technical.psuWattage}<span className="text-xs opacity-40">W</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">Performa</div>
                  <div className="text-lg font-black mt-1">
                    {build.GPU
                      ? totalPrice > 25000000 ? 'High-End'
                        : totalPrice > 12000000 ? 'Mid' : 'Entry'
                      : 'Office'}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${isOverBudget ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-white/[0.03]'}`}>
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">Total Biaya</div>
                  <div className={`text-lg font-black mt-1 ${isOverBudget ? 'text-red-500' : ''}`}>
                    Rp {(totalPrice / 1000000).toFixed(1)}<span className="text-xs opacity-40">jt</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Bottleneck Analysis ── */}
            <BottleneckCard build={build} technical={technical} isDark={isDark} resolution={activeBuild.resolution || '1080p'} />

            {/* ── Budget Distribution ── */}
            <section
              className="section-card"
            >
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="font-black text-sm">Budget</h3>
              </div>
              <div className="space-y-2.5">
                {Object.entries(build)
                  .filter(([, p]) => p)
                  .map(([type, part]: [string, any]) => {
                    const pct = totalPrice > 0 ? Math.round((part.price / totalPrice) * 100) : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="font-semibold opacity-60">{TYPE_LABELS[type] || type}</span>
                          <span className="font-mono font-bold">{pct}%</span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* ── Peripherals ── */}
            {[build.MONITOR, build.KEYBOARD, build.MOUSE].some(Boolean) && (
              <PeripheralsCard build={build} isDark={isDark} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Sub-components ── */

function Metric({ label, value, status }: { label: string; value: string; status?: 'good' | 'warn' }) {
  const color = status === 'good' ? 'text-emerald-500' : status === 'warn' ? 'text-amber-500' : '';
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-40 mb-0.5">{label}</div>
      <div className={`text-sm font-black ${color}`}>{value}</div>
    </div>
  );
}

function BottleneckCard({ build, technical, isDark, resolution }: { build: any; technical: any; isDark: boolean; resolution?: string }) {
  const cpuBench = build.CPU?.name ? findCpuBenchmark(build.CPU.name) : null;
  const gpuBench = build.GPU?.name ? findGpuBenchmark(build.GPU.name) : null;

  const isBottleneck = technical.bottleneckStatus && !technical.bottleneckStatus.includes('Seimbang');
  const isSevere = technical.bottleneckStatus?.includes('Severe') || technical.bottleneckStatus?.includes('Moderate');

  const fix = suggestBottleneckFix(cpuBench, gpuBench, resolution || '1080p');
  const showRed = isBottleneck && isSevere;

  return (
    <section
      className={`p-5 rounded-2xl border ${
        showRed
          ? isDark
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-red-50 border-red-200'
          : isDark
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-emerald-50 border-emerald-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gauge className={`w-4 h-4 ${showRed ? 'text-red-500' : 'text-emerald-500'}`} />
        <h3 className={`font-black text-sm ${showRed ? 'text-red-500' : 'text-emerald-500'}`}>CPU & GPU Balance</h3>
      </div>

      <p className={`text-sm font-bold mb-1 ${showRed ? 'text-red-500' : 'text-emerald-500'}`}>
        {showRed ? technical.bottleneckStatus : 'Seimbang — performa optimal'}
      </p>

      {cpuBench && gpuBench && (
        <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-40 mb-0.5">CPU PassMark</div>
            <div className="text-sm font-black">{cpuBench.passmarkSingle.toLocaleString()}</div>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-40 mb-0.5">GPU Avg FPS</div>
            <div className="text-sm font-black">
              {Math.round((gpuBench.fps1080p + gpuBench.fps1440p + gpuBench.fps4k) / 3)}
            </div>
          </div>
        </div>
      )}

      {!showRed && cpuBench && gpuBench && (
        <p className="text-[10px] opacity-50 leading-relaxed">
          CPU dan GPU telah diseimbangkan secara otomatis oleh PCNerd untuk performa gaming optimal.
        </p>
      )}

      {showRed && fix && fix.suggestions.length > 0 && (
        <div className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">
              Rekomendasi Upgrade {fix.type}
            </span>
          </div>
          <div className="space-y-1.5">
            {fix.suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="font-bold">{s.model}</span>
                <span className="opacity-50 font-mono">
                  {s.passmarkSingle ? `${s.passmarkSingle.toLocaleString()} pts` : ''}
                  {s.avgFps ? `${s.avgFps} FPS` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PeripheralsCard({ build, isDark }: { build: any; isDark: boolean }) {
  const peripheralEntries = Object.entries(build)
    .filter(([type]) => ['MONITOR', 'KEYBOARD', 'MOUSE'].includes(type))
    .filter(([, part]) => part);

  if (peripheralEntries.length === 0) return null;

  return (
    <section
      className="section-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-4 h-4 text-primary" />
        <h3 className="font-black text-sm">Peripheral</h3>
      </div>
      <div className="space-y-3">
        {peripheralEntries.map(([type, part]: [string, any]) => {
          const Icon = TYPE_ICONS[type] || Box;
          return (
            <div key={type} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
              >
                <Icon className="w-4 h-4 opacity-60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">{TYPE_LABELS[type]}</div>
                <div className="text-xs font-bold truncate">{part.name}</div>
              </div>
              <div className="text-xs font-black text-primary">Rp {part.price.toLocaleString('id-ID')}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Helpers ── */

function extractRamSpeed(name: string): string {
  const m = name.match(/(\d{4,5}\s*MHz)/i);
  return m ? m[1] : '';
}

function extractStorageCapacity(name: string): string {
  const m = name.match(/(\d+\s*(?:GB|TB))/i);
  return m ? m[1] : '';
}

function extractStorageType(name: string): string {
  const m = name.match(/\b(SSD|NVMe|HDD)\b/i);
  return m ? m[1].toUpperCase() : '';
}

function extractGpuVram(specs: any): string {
  if (!specs) return '';
  if (typeof specs === 'string') {
    try {
      const p = JSON.parse(specs);
      return p?.vram || '';
    } catch {
      return '';
    }
  }
  return specs.vram || '';
}

function extractGpuModel(name: string): string {
  const m = name.match(/(RTX\s*\d+\s*\w*|RX\s*\d+\s*\w*|GTX\s*\d+\s*\w*|Arc\s*\w*)/i);
  return m ? m[0] : '';
}
