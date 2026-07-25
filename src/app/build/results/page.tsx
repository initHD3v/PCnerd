'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Trash2,
  Loader2,
  X,
  Check,
  Database,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { predictPerformance, generateNarrative } from '@/lib/recommendation-engine';
import { useTheme } from '@/hooks/use-theme';
import ThemeToggle from '@/components/ThemeToggle';
import {
  findCpuBenchmark,
  findGpuBenchmark,
  findRamImpact,
  suggestBottleneckFix,
  analyzeBottleneck,
  estimateFpsFromPrice,
} from '@/data/benchmarks';
import { getUpgradeImpact } from '@/lib/recommendation-engine';

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
  const [customBuild, setCustomBuild] = useState<Record<string, any>>({});
  const [removedComponents, setRemovedComponents] = useState<Record<string, any>>({});
  const [selectorOpen, setSelectorOpen] = useState<string | null>(null);
  const [selectorComponents, setSelectorComponents] = useState<any[]>([]);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorSort, setSelectorSort] = useState('price-asc');
  const [selectorBrand, setSelectorBrand] = useState('');
  const [llmNarratives, setLlmNarratives] = useState<Record<string, any>>({});
  const [llmLoading, setLlmLoading] = useState(false);
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
      try {
        setRequestData(JSON.parse(req));
      } catch {}
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
    setCustomBuild({});
    setRemovedComponents({});
  };

  const getBuildHash = useCallback((b: Record<string, any>) => {
    const ids = Object.entries(b)
      .filter(([, p]) => p)
      .sort(([a], [b2]) => a.localeCompare(b2))
      .map(([, p]) => p.id || '')
      .join('|');
    return ids || 'empty';
  }, []);

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
    for (const [type, part] of Object.entries(customBuild)) {
      build[type] = part;
    }
    for (const type of Object.keys(removedComponents)) {
      build[type] = null;
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
    const hasChanges =
      Object.keys(appliedUpgrades).length > 0 ||
      Object.keys(customBuild).length > 0 ||
      Object.keys(removedComponents).length > 0;
    const narrative = generateNarrative(
      build,
      {
        budget: activeBuild.targetBudget,
        purpose: requestData?.purpose || 'Gaming',
        resolution: activeBuild.resolution || '1080p',
        includePeripheral: false,
        platform: requestData?.platform || 'default',
      },
      hasChanges,
    );
    return {
      build,
      totalPrice,
      performance,
      technical: { totalTdp, psuWattage, isPsuSafe, bottleneckStatus: bottleneck.status },
      narrative,
    };
  }, [activeBuild, appliedUpgrades, customBuild, removedComponents, requestData, estimateGpuTdp]);

  const hasUpgrades =
    Object.keys(appliedUpgrades).length > 0 ||
    Object.keys(customBuild).length > 0 ||
    Object.keys(removedComponents).length > 0;
  const build = upgradeState?.build ?? activeBuild?.build ?? {};
  const totalPrice = upgradeState?.totalPrice ?? activeBuild?.totalPrice ?? 0;
  const performance = upgradeState?.performance ?? activeBuild?.performance ?? [];
  const technical = upgradeState?.technical ?? activeBuild?.technical ?? {};
  const templateNarrative = upgradeState?.narrative ?? {};
  const componentScores: Record<string, any> = activeBuild?.componentScores ?? {};

  // LLM narrative: original → cache → fetch
  const originalKey = useMemo(() => {
    return activeBuild ? getBuildHash(activeBuild.build) : '';
  }, [activeBuild, getBuildHash]);

  const currentHash = getBuildHash(build);
  const isOriginalBuild = activeBuild && currentHash === originalKey;
  const originalNarrative = activeBuild?.narrative?.general ? activeBuild.narrative : null;
  const cachedLlm = isOriginalBuild && originalNarrative ? originalNarrative : llmNarratives[currentHash] || {};

  const partialKey = `partial_${currentHash}`;
  const partialNarrative = llmNarratives[partialKey];
  const narrative = partialNarrative?.general ? partialNarrative : cachedLlm?.general ? cachedLlm : templateNarrative;

  // Fetch LLM narrative when build changes (not original, not cached)
  const prevHashRef = useRef('');
  useEffect(() => {
    if (!activeBuild || !build) return;
    if (isOriginalBuild) return;
    if (currentHash === prevHashRef.current) return;
    if (llmNarratives[currentHash]) return;

    prevHashRef.current = currentHash;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLlmLoading(true);
    });

    const narrativeBuild = Object.fromEntries(Object.entries(build).filter(([, p]) => p));

    fetch('/api/ai/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        build: narrativeBuild,
        budget: activeBuild.targetBudget,
        purpose: requestData?.purpose || 'Gaming',
        resolution: activeBuild.resolution || '1080p',
        stream: true,
      }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setLlmLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setLlmLoading(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = '';

        // Store a partial narrative entry that streams in
        const partialKey = `partial_${currentHash}`;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) break;

          accumulated += decoder.decode(value, { stream: true });

          // Try to extract partial "general" field for live preview
          try {
            const jsonStart = accumulated.indexOf('{');
            if (jsonStart !== -1) {
              const jsonStr = accumulated.slice(jsonStart);
              // Try to match "general" value with a regex
              const generalMatch = jsonStr.match(/"general"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              if (generalMatch) {
                const generalVal = generalMatch[1];
                if (generalVal.length > 10) {
                  setLlmNarratives((prev) => ({
                    ...prev,
                    [partialKey]: { general: generalVal + '...', strengths: [], weaknesses: [] },
                  }));
                }
              }
            }
          } catch {}

          // Reset loading once we start getting data
          if (!cancelled) setLlmLoading(false);
        }

        if (cancelled) return;

        // Parse complete JSON
        const braceStart = accumulated.indexOf('{');
        const braceEnd = accumulated.lastIndexOf('}');
        if (braceStart !== -1 && braceEnd > braceStart) {
          const jsonStr = accumulated.slice(braceStart, braceEnd + 1);
          try {
            const data = JSON.parse(jsonStr);
            if (data.general || data.strengths?.length || data.weaknesses?.length) {
              // Remove partial entry, store final
              setLlmNarratives((prev) => {
                const next = { ...prev };
                delete next[partialKey];
                next[currentHash] = data;
                return next;
              });
              setLlmLoading(false);
              return;
            }
          } catch {}
        }

        // Fallback: store accumulated as general text
        const cleaned = accumulated
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\{.*\}/s, '')
          .trim();
        if (cleaned) {
          setLlmNarratives((prev) => ({
            ...prev,
            [currentHash]: { general: cleaned, strengths: [], weaknesses: [] },
          }));
        }
        setLlmLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLlmLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentHash]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = useCallback(
    (componentType: string) => {
      const currentBuild = upgradeState?.build ?? activeBuild?.build ?? {};
      const current = currentBuild[componentType];
      if (current) {
        setRemovedComponents((prev) => ({ ...prev, [componentType]: current }));
        setCustomBuild((prev) => {
          const next = { ...prev };
          delete next[componentType];
          return next;
        });
        setAppliedUpgrades((prev) => {
          const next = { ...prev };
          delete next[componentType];
          return next;
        });
      }
    },
    [activeBuild, upgradeState],
  );

  const handleRestore = useCallback((componentType: string) => {
    setRemovedComponents((prev) => {
      const next = { ...prev };
      delete next[componentType];
      return next;
    });
  }, []);

  const openComponentSelector = useCallback(
    async (componentType: string) => {
      setSelectorOpen(componentType);
      setSelectorLoading(true);
      try {
        const res = await fetch(`/api/admin/components`);
        if (res.ok) {
          const all = await res.json();
          if (componentType === 'PERIPHERAL') {
            setSelectorComponents(
              all.filter((c: any) => ['MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'SPEAKER'].includes(c.type)),
            );
          } else {
            let filtered = all.filter((c: any) => c.type === componentType);
            const build = upgradeState?.build ?? activeBuild?.build ?? {};
            const mobo = build.MOTHERBOARD;
            const cpu = build.CPU;
            if (componentType === 'CPU') {
              const platform = cpu?.socket || '';
              if (platform) {
                const allowedSockets =
                  platform.startsWith('AM') || platform.startsWith('FM') || platform.startsWith('sTRX')
                    ? ['AM4', 'AM5', 'FM2', 'FM1', 'sTRX4', 'sWRX8']
                    : ['LGA1700', 'LGA1851', 'LGA1200', 'LGA1151', 'LGA1150', 'LGA2066', 'LGA3647', 'LGA4677'];
                if (allowedSockets.includes(platform)) {
                  filtered = filtered.filter((c: any) => c.socket === platform);
                }
              }
            } else if (componentType === 'MOTHERBOARD') {
              if (cpu?.socket) {
                filtered = filtered.filter((c: any) => c.socket === cpu.socket);
              }
            } else if (componentType === 'RAM') {
              if (mobo?.ramType) {
                filtered = filtered.filter((c: any) => c.ramType === mobo.ramType);
              }
            } else if (componentType === 'GPU') {
              // No filter needed, all GPUs work with any platform
            }
            const currentComponent = build[componentType];
            const withImpact = filtered.map((c: any) => {
              if (!currentComponent || currentComponent.id === c.id) return { ...c, _impact: null };
              const impact = getUpgradeImpact(
                { name: currentComponent.name, type: componentType as any },
                { name: c.name, type: componentType as any },
                activeBuild?.resolution || '1080p',
                build.GPU?.name,
              );
              return { ...c, _impact: impact };
            });
            setSelectorComponents(withImpact);
          }
        }
      } catch {}
      setSelectorSearch('');
      setSelectorBrand('');
      setSelectorSort('price-asc');
      setSelectorLoading(false);
    },
    [activeBuild, upgradeState],
  );

  const handleSelectComponent = useCallback(
    (componentType: string, component: any) => {
      const currentBuild = upgradeState?.build ?? activeBuild?.build ?? {};
      const current = currentBuild[componentType];
      if (current?.id === component.id) {
        setSelectorOpen(null);
        return;
      }
      setCustomBuild((prev) => ({ ...prev, [componentType]: component }));
      if (componentType === 'CPU' || componentType === 'MOTHERBOARD') {
        setAppliedUpgrades((prev) => {
          const next = { ...prev };
          delete next[componentType];
          return next;
        });
      }
      if (removedComponents[componentType]) {
        setRemovedComponents((prev) => {
          const next = { ...prev };
          delete next[componentType];
          return next;
        });
      }
      setSelectorOpen(null);
    },
    [activeBuild, upgradeState, removedComponents],
  );

  const handleResetCustom = useCallback((componentType: string) => {
    setCustomBuild((prev) => {
      const next = { ...prev };
      delete next[componentType];
      return next;
    });
    setAppliedUpgrades((prev) => {
      const next = { ...prev };
      delete next[componentType];
      return next;
    });
  }, []);

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

  const findUpgradeForType = useCallback(
    (type: string) => {
      const currentBuild = upgradeState?.build ?? activeBuild?.build ?? {};
      const current = currentBuild[type];
      if (!current?.id) return null;
      return (activeBuild?.upgrades || []).find(
        (u: any) => u.componentType === type && u.currentPart?.id === current.id,
      );
    },
    [activeBuild, upgradeState],
  );

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

  const { targetBudget, distribution, lowBudgetAdvice } = activeBuild;
  const isOverBudget = totalPrice > targetBudget;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-gray-200' : 'bg-gray-50 text-gray-800'}`}
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
          <p>
            Dibuat pada {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
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
                <td colSpan={2} style={{ textAlign: 'right' }}>
                  Total
                </td>
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
          <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px', color: '#111827' }}>Estimasi Performa</h3>
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
          <h3 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px', color: '#111827' }}>Technical Overview</h3>
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
              <div className="print-metric-value" style={{ fontSize: 11 }}>
                {technical.bottleneckStatus || 'Seimbang'}
              </div>
            </div>
            <div className="print-metric">
              <div className="print-metric-label">Performa Tier</div>
              <div className="print-metric-value">
                {build.GPU ? (totalPrice > 25000000 ? 'High-End' : totalPrice > 12000000 ? 'Mid' : 'Entry') : 'Office'}
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
                <Link href="/" className="font-bold text-sm hover:text-primary transition-colors">
                  PCnerd
                </Link>
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
                <div
                  className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gray-400'}`}
                />
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
                    const isCustom = !!customBuild[type];
                    const isRemoved = !!removedComponents[type];
                    return (
                      <motion.div
                        layout
                        key={type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.06, ease: 'easeOut' }}
                        className={`component-card group/card ${isUpgraded || isCustom ? (isDark ? '!border-emerald-500/30' : '!border-emerald-400') : ''}`}
                      >
                        {(isUpgraded || isCustom) && (
                          <div className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-[8px] font-black text-white tracking-wider shadow-lg z-10">
                            {isCustom ? 'CUSTOM' : 'UPGRADED'}
                          </div>
                        )}
                        {isRemoved && (
                          <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-xs font-bold text-gray-400 mb-2">Komponen dihapus</div>
                              <button
                                onClick={() => handleRestore(type)}
                                className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-bold hover:opacity-90 transition-all"
                              >
                                <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Restore
                              </button>
                            </div>
                          </div>
                        )}
                        <div className={`flex items-start gap-3 ${isRemoved ? 'opacity-30' : ''}`}>
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
                                <span>
                                  {extractGpuModel(part.name)}
                                  {extractGpuVram(part.specs) ? ` · ${extractGpuVram(part.specs)}` : ''}
                                </span>
                              )}
                              {type === 'RAM' && (
                                <span>{[part.ramType, extractRamSpeed(part.name)].filter(Boolean).join(' · ')}</span>
                              )}
                              {type === 'STORAGE' && (
                                <span>
                                  {[extractStorageCapacity(part.name), extractStorageType(part.name)]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                              )}
                              {type === 'CPU' && (
                                <span>{[part.socket, part.tdp ? `${part.tdp}W` : ''].filter(Boolean).join(' · ')}</span>
                              )}
                              {type === 'PSU' && part.wattage && <span>{part.wattage}W</span>}
                              {type === 'MOTHERBOARD' && (
                                <span>{[part.socket, part.ramType].filter(Boolean).join(' · ')}</span>
                              )}
                            </div>

                            {componentScores[type] &&
                              (() => {
                                const sc = componentScores[type];
                                const pct = (sc.totalScore * 100).toFixed(0);
                                const color =
                                  sc.totalScore > 0.7 ? '#22c55e' : sc.totalScore > 0.4 ? '#eab308' : '#ef4444';
                                const items = [
                                  {
                                    label: 'Kompatibilitas',
                                    key: 'compatibilityScore',
                                    pct: (sc.compatibilityScore * 100).toFixed(0),
                                  },
                                  {
                                    label: 'Performa',
                                    key: 'performanceScore',
                                    pct: (sc.performanceScore * 100).toFixed(0),
                                  },
                                  { label: 'Value', key: 'valueScore', pct: (sc.valueScore * 100).toFixed(0) },
                                  {
                                    label: 'Reliabilitas',
                                    key: 'reliabilityScore',
                                    pct: (sc.reliabilityScore * 100).toFixed(0),
                                  },
                                ];
                                return (
                                  <div className="group/score mt-1.5 relative">
                                    <div className="flex items-center gap-2 cursor-help">
                                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all"
                                          style={{
                                            width: `${Math.min(100, Math.max(0, Number(pct)))}%`,
                                            background: color,
                                          }}
                                        />
                                      </div>
                                      <span className="text-[9px] font-bold font-mono" style={{ color }}>
                                        {pct}
                                      </span>
                                    </div>
                                    <div className="absolute bottom-full left-0 mb-2 w-44 opacity-100 visible md:opacity-0 md:invisible md:group-hover/score:opacity-100 md:group-hover/score:visible transition-all duration-200 z-20 pointer-events-none">
                                      <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg p-2.5 shadow-xl text-[10px] space-y-1.5 border border-white/10">
                                        <div className="font-black text-[9px] uppercase tracking-wider opacity-60 mb-1.5">
                                          Skor Komponen
                                        </div>
                                        {items.map((item) => (
                                          <div key={item.key} className="flex items-center justify-between gap-2">
                                            <span className="opacity-70">{item.label}</span>
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                  className="h-full rounded-full"
                                                  style={{
                                                    width: `${Math.min(100, Math.max(0, Number(item.pct)))}%`,
                                                    background: color,
                                                  }}
                                                />
                                              </div>
                                              <span className="font-mono font-bold w-6 text-right" style={{ color }}>
                                                {item.pct}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                            {isUpgraded ? (
                              <div className="mt-3 pt-3 border-t border-dashed border-white/10 space-y-1.5">
                                <button
                                  onClick={() => handleReset(type)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate flex-1 text-left">Reset ke part awal</span>
                                </button>
                              </div>
                            ) : upgrade ? (
                              <div className="mt-3 pt-3 border-t border-dashed border-white/10 space-y-1.5">
                                <button
                                  onClick={() => handleUpgrade(type, upgrade)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                >
                                  <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate flex-1 text-left">{upgrade.suggestedPart.name}</span>
                                  <span className="shrink-0">+Rp {upgrade.priceDiff.toLocaleString('id-ID')}</span>
                                </button>
                                {upgrade.benefit && (
                                  <div className="text-[8px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/5 text-emerald-500/70 text-center">
                                    {upgrade.benefit}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <div className="text-sm font-black text-primary">
                              Rp {part.price.toLocaleString('id-ID')}
                            </div>
                            {!isRemoved && (
                              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleRemove(type)}
                                  className="w-8 h-8 md:w-6 md:h-6 rounded-lg md:rounded-md flex items-center justify-center text-[10px] md:text-[9px] font-bold bg-red-500/10 text-red-500 md:hover:bg-red-500/20 transition-all"
                                  title="Hapus komponen"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {!isRemoved && (
                          <button
                            onClick={() => openComponentSelector(type)}
                            className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-bold transition-all bg-white/5 text-gray-400 hover:bg-white/10 hover:text-primary border border-dashed border-white/10"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Ganti {TYPE_LABELS[type] || type}
                          </button>
                        )}
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(part.name + ' harga Indonesia')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Lihat detail"
                          className="absolute bottom-2 right-2 w-8 h-8 md:w-6 md:h-6 rounded-lg md:rounded-md flex items-center justify-center opacity-100 md:opacity-20 md:hover:opacity-100 md:hover:bg-white/10 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
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
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverBudget ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}
                  >
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
                  <div
                    className={`text-xs font-black px-3 py-1.5 rounded-lg ${isOverBudget ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}
                  >
                    {isOverBudget
                      ? `− Rp ${(totalPrice - targetBudget).toLocaleString('id-ID')}`
                      : `${Math.round((totalPrice / targetBudget) * 100)}%`}
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
                    const groupLevel =
                      bestVal >= 15000 ? 'Ultra' : bestVal >= 5000 ? 'High' : bestVal >= 1500 ? 'Mid' : 'Entry';
                    const borderColor =
                      groupLevel === 'Ultra'
                        ? 'border-purple-500/30'
                        : groupLevel === 'High'
                          ? 'border-emerald-500/30'
                          : groupLevel === 'Mid'
                            ? 'border-amber-500/30'
                            : 'border-red-500/30';
                    const headerColor =
                      groupLevel === 'Ultra'
                        ? 'text-purple-500'
                        : groupLevel === 'High'
                          ? 'text-emerald-500'
                          : groupLevel === 'Mid'
                            ? 'text-amber-500'
                            : 'text-red-500';
                    return (
                      <div key={group} className={`rounded-xl border ${borderColor} bg-white/[0.02] overflow-hidden`}>
                        <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
                          <span className="text-xs font-black uppercase tracking-wider">
                            {group === 'Office' ? 'Kantor / Sekolah' : 'Coding / Programming'}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 ${headerColor}`}>
                            {groupLevel}
                          </span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {items.map((perf: any, idx: number) => {
                            const label = perf.category.replace(/^(Office|Coding)\s*/, '').trim();
                            const levelColor =
                              perf.level === 'Ultra'
                                ? 'text-purple-500'
                                : perf.level === 'High'
                                  ? 'text-emerald-500'
                                  : perf.level === 'Mid'
                                    ? 'text-amber-500'
                                    : 'text-red-500';
                            const barColor =
                              perf.level === 'Ultra'
                                ? 'bg-purple-500'
                                : perf.level === 'High'
                                  ? 'bg-emerald-500'
                                  : perf.level === 'Mid'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500';
                            const barWidth =
                              perf.level === 'Ultra'
                                ? '100%'
                                : perf.level === 'High'
                                  ? '70%'
                                  : perf.level === 'Mid'
                                    ? '45%'
                                    : '25%';
                            return (
                              <div key={idx} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold opacity-40">{label}</span>
                                  <span className={`text-sm font-black ${levelColor}`}>{perf.fps}</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/5">
                                  <div
                                    className={`h-full rounded-full ${barColor} transition-all duration-700`}
                                    style={{ width: barWidth }}
                                  />
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
                    const groupLevel =
                      bestFps >= 100 ? 'Ultra' : bestFps >= 60 ? 'High' : bestFps >= 40 ? 'Mid' : 'Entry';
                    const borderColor =
                      groupLevel === 'Ultra'
                        ? 'border-purple-500/30'
                        : groupLevel === 'High'
                          ? 'border-emerald-500/30'
                          : groupLevel === 'Mid'
                            ? 'border-amber-500/30'
                            : 'border-red-500/30';
                    const headerColor =
                      groupLevel === 'Ultra'
                        ? 'text-purple-500'
                        : groupLevel === 'High'
                          ? 'text-emerald-500'
                          : groupLevel === 'Mid'
                            ? 'text-amber-500'
                            : 'text-red-500';
                    return (
                      <div key={group} className={`rounded-xl border ${borderColor} bg-white/[0.02] overflow-hidden`}>
                        <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
                          <span className="text-xs font-black uppercase tracking-wider">{group}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 ${headerColor}`}>
                            {groupLevel}
                          </span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {items.map((perf: any, idx: number) => {
                            const resMatch = perf.category.match(/\((.+)\)/);
                            const resLabel = resMatch ? resMatch[1] : '';
                            const levelColor =
                              perf.level === 'Ultra'
                                ? 'text-purple-500'
                                : perf.level === 'High'
                                  ? 'text-emerald-500'
                                  : perf.level === 'Mid'
                                    ? 'text-amber-500'
                                    : 'text-red-500';
                            const barColor =
                              perf.level === 'Ultra'
                                ? 'bg-purple-500'
                                : perf.level === 'High'
                                  ? 'bg-emerald-500'
                                  : perf.level === 'Mid'
                                    ? 'text-amber-500'
                                    : 'bg-amber-500';
                            const barWidth =
                              perf.level === 'Ultra'
                                ? '100%'
                                : perf.level === 'High'
                                  ? '70%'
                                  : perf.level === 'Mid'
                                    ? '45%'
                                    : '25%';
                            return (
                              <div key={idx} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold opacity-40">{resLabel}</span>
                                  <span className={`text-sm font-black ${levelColor}`}>{perf.fps}</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/5">
                                  <div
                                    className={`h-full rounded-full ${barColor} transition-all duration-700`}
                                    style={{ width: barWidth }}
                                  />
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
                    <div
                      key={group}
                      className={`rounded-xl border ${isProductivityBuild ? 'border-white/10' : ''} bg-white/[0.02] overflow-hidden`}
                    >
                      {isProductivityBuild ? (
                        <div className="px-4 py-3 text-center text-[10px] opacity-40">
                          Game FPS tidak relevan untuk build {requestData?.purpose === 'Office' ? 'kantor' : 'coding'}.
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
                                  className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${gameQuality === q ? 'bg-primary text-black shadow-sm' : 'bg-white/5 text-gray-400 active:bg-white/10 md:hover:bg-white/10'}`}
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
                                  className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${gameType === t ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400 active:bg-white/10 md:hover:bg-white/10'}`}
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
                              const QUALITY_MULT: Record<string, number> = {
                                LOW: 2.0,
                                Medium: 1.5,
                                High: 1.2,
                                Ultra: 1.0,
                              };
                              let fps = 0;
                              if (gpuBench) {
                                const baseFps =
                                  gameType === 'E-Sports'
                                    ? gpuBench.fpsEsports
                                    : resKey === '4K'
                                      ? gpuBench.fps4k
                                      : resKey === '1440p'
                                        ? gpuBench.fps1440p
                                        : gpuBench.fps1080p;
                                let cpuMult = 1.0;
                                if (cpuBench) {
                                  const gpuAvg = (gpuBench.fps1080p + gpuBench.fps1440p + gpuBench.fps4k) / 3;
                                  const target = gpuAvg * 100 * 0.6;
                                  if (cpuBench.passmarkSingle < target)
                                    cpuMult = Math.max(0.5, cpuBench.passmarkSingle / target);
                                }
                                fps = Math.round(baseFps * cpuMult * QUALITY_MULT[gameQuality]);
                              } else {
                                const fallback = estimateFpsFromPrice(build.GPU?.price || 0);
                                fps =
                                  parseInt(gameType === 'E-Sports' ? fallback.esports : fallback.aaa) *
                                  QUALITY_MULT[gameQuality];
                              }
                              const level = fps >= 100 ? 'Ultra' : fps >= 60 ? 'High' : fps >= 40 ? 'Mid' : 'Entry';
                              const levelColor =
                                level === 'Ultra'
                                  ? 'text-purple-500'
                                  : level === 'High'
                                    ? 'text-emerald-500'
                                    : level === 'Mid'
                                      ? 'text-amber-500'
                                      : 'text-red-500';
                              const barColor =
                                level === 'Ultra'
                                  ? 'bg-purple-500'
                                  : level === 'High'
                                    ? 'bg-emerald-500'
                                    : level === 'Mid'
                                      ? 'bg-amber-500'
                                      : 'bg-red-500';
                              const barWidth =
                                level === 'Ultra' ? '100%' : level === 'High' ? '70%' : level === 'Mid' ? '45%' : '25%';
                              return (
                                <div key={resKey} className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold opacity-40">{resKey}</span>
                                    <span className={`text-sm font-black ${levelColor}`}>{fps} FPS</span>
                                  </div>
                                  <div className="h-1 w-full rounded-full bg-white/5">
                                    <div
                                      className={`h-full rounded-full ${barColor} transition-all duration-700`}
                                      style={{ width: barWidth }}
                                    />
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
            <section className="section-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <BrainCircuit className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-sm">AI Analysis</h3>
                  <p className="text-[10px] opacity-40 font-bold uppercase">
                    {llmLoading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Menganalisis...
                      </span>
                    ) : (
                      'Real-time'
                    )}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed italic mb-5">
                {llmLoading && !cachedLlm?.general ? (
                  <span className="opacity-40 animate-pulse">Menganalisis...</span>
                ) : narrative?.general ? (
                  `"${narrative.general}"`
                ) : (
                  <span className="opacity-40">Analisis tidak tersedia.</span>
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
                  <div className="text-lg font-black mt-1">
                    {technical.totalTdp}
                    <span className="text-xs opacity-40">W</span>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${technical.isPsuSafe ? 'border-white/5 bg-white/[0.03]' : 'border-amber-500/20 bg-amber-500/5'}`}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">PSU</div>
                  <div className={`text-lg font-black mt-1 ${technical.isPsuSafe ? '' : 'text-amber-500'}`}>
                    {technical.psuWattage}
                    <span className="text-xs opacity-40">W</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">Performa</div>
                  <div className="text-lg font-black mt-1">
                    {build.GPU
                      ? totalPrice > 25000000
                        ? 'High-End'
                        : totalPrice > 12000000
                          ? 'Mid'
                          : 'Entry'
                      : 'Office'}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl border ${isOverBudget ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-white/[0.03]'}`}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">Total Biaya</div>
                  <div className={`text-lg font-black mt-1 ${isOverBudget ? 'text-red-500' : ''}`}>
                    Rp {(totalPrice / 1000000).toFixed(1)}
                    <span className="text-xs opacity-40">jt</span>
                  </div>
                </div>
                {build.RAM &&
                  (() => {
                    const ramName = build.RAM.name || '';
                    const ramSpeed = extractRamSpeed(ramName);
                    const ramType = build.RAM.ramType || '';
                    const ramCapacity = ramName.match(/(\d+)\s*GB/i)?.[1] || '';
                    const ramImpact = findRamImpact(ramName);
                    const ramPct = ramImpact ? Math.round((ramImpact.gamingFpsMultiplier - 1) * 100) : 0;
                    const ramProdPct = ramImpact ? Math.round((ramImpact.productivityMultiplier - 1) * 100) : 0;
                    return (
                      <div className="p-3 rounded-xl border border-white/5 bg-white/[0.03]">
                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">RAM</div>
                        <div className="text-lg font-black mt-1 truncate" title={ramName}>
                          {ramType}
                          {ramSpeed ? ` ${ramSpeed}` : ''}
                        </div>
                        {ramCapacity && <div className="text-[10px] font-bold opacity-50 mt-0.5">{ramCapacity} GB</div>}
                        {ramImpact && (
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="opacity-50">Gaming</span>
                              <span className={`font-bold ${ramPct >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                {ramPct >= 0 ? '+' : ''}
                                {ramPct}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="opacity-50">Produktivitas</span>
                              <span className={`font-bold ${ramProdPct >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                {ramProdPct >= 0 ? '+' : ''}
                                {ramProdPct}%
                              </span>
                            </div>
                            <div className="text-[7px] opacity-30 mt-1 leading-tight">
                              Baseline DDR4-3200. RAM lebih cepat = FPS lebih tinggi & rendering lebih cepat.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </section>

            {/* ── Bottleneck Analysis ── */}
            <BottleneckCard
              build={build}
              technical={technical}
              isDark={isDark}
              resolution={activeBuild.resolution || '1080p'}
            />

            {/* ── Budget Distribution ── */}
            <section className="section-card">
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
              <PeripheralsCard
                build={build}
                isDark={isDark}
                onRemove={handleRemove}
                onRestore={handleRestore}
                isRemoved={removedComponents}
                onReplace={openComponentSelector}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── Component Selector Modal ── */}
      <AnimatePresence>
        {selectorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectorOpen(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col ${isDark ? 'bg-black border-white/10' : 'bg-white border-gray-200'}`}
            >
              <div
                className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}
              >
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Pilih {TYPE_LABELS[selectorOpen] || selectorOpen}
                </h3>
                <button
                  onClick={() => setSelectorOpen(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 pt-3 space-y-2 shrink-0">
                <div className="relative">
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-white/20' : 'text-gray-400'}`}
                  />
                  <input
                    type="text"
                    value={selectorSearch}
                    onChange={(e) => setSelectorSearch(e.target.value)}
                    placeholder="Cari komponen..."
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none transition-all ${
                      isDark
                        ? 'bg-white/[0.03] border border-white/5 focus:border-primary/30 text-white placeholder:text-white/20'
                        : 'bg-gray-50 border border-gray-200 focus:border-gray-400 text-gray-900 placeholder:text-gray-400'
                    }`}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectorSort}
                    onChange={(e) => setSelectorSort(e.target.value)}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold outline-none appearance-none cursor-pointer ${
                      isDark
                        ? 'bg-white/[0.03] border border-white/5 text-white'
                        : 'bg-gray-50 border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="price-asc">Harga ↑</option>
                    <option value="price-desc">Harga ↓</option>
                    <option value="name-asc">Nama A-Z</option>
                    <option value="name-desc">Nama Z-A</option>
                  </select>
                  <select
                    value={selectorBrand}
                    onChange={(e) => setSelectorBrand(e.target.value)}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold outline-none appearance-none cursor-pointer ${
                      isDark
                        ? 'bg-white/[0.03] border border-white/5 text-white'
                        : 'bg-gray-50 border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">Semua Brand</option>
                    {[...new Set(selectorComponents.map((c: any) => c.brand).filter(Boolean))].sort().map((b) => (
                      <option key={b as string} value={b as string}>
                        {b as string}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectorLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  (() => {
                    let filtered = [...selectorComponents];

                    if (selectorSearch) {
                      const q = selectorSearch.toLowerCase();
                      filtered = filtered.filter(
                        (c: any) =>
                          c.name?.toLowerCase().includes(q) ||
                          c.brand?.toLowerCase().includes(q) ||
                          c.socket?.toLowerCase().includes(q) ||
                          c.ramType?.toLowerCase().includes(q),
                      );
                    }

                    if (selectorBrand) {
                      filtered = filtered.filter((c: any) => c.brand === selectorBrand);
                    }

                    filtered.sort((a: any, b: any) => {
                      switch (selectorSort) {
                        case 'price-desc':
                          return b.price - a.price;
                        case 'name-asc':
                          return (a.name || '').localeCompare(b.name || '');
                        case 'name-desc':
                          return (b.name || '').localeCompare(a.name || '');
                        default:
                          return a.price - b.price;
                      }
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-20 text-gray-500">
                          <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm">Tidak ada komponen ditemukan.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {filtered.map((comp: any) => {
                          const build2 = upgradeState?.build ?? activeBuild?.build ?? {};
                          const current = build2[selectorOpen];
                          const isSelected = current?.id === comp.id;
                          const priceDiff = current ? comp.price - current.price : comp.price;
                          const Icon = TYPE_ICONS[selectorOpen] || Box;
                          return (
                            <button
                              key={comp.id}
                              onClick={() => handleSelectComponent(selectorOpen, comp)}
                              disabled={isSelected}
                              className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-4 ${
                                isSelected
                                  ? isDark
                                    ? 'border-emerald-500/30 bg-emerald-500/10'
                                    : 'border-emerald-400 bg-emerald-50'
                                  : isDark
                                    ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                                    : 'border-gray-100 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
                                >
                                  {comp.name}
                                </div>
                                <div className="text-[10px] opacity-40 mt-0.5 flex flex-wrap gap-x-3">
                                  <span>{comp.brand}</span>
                                  {comp.socket && <span>{comp.socket}</span>}
                                  {comp.ramType && <span>{comp.ramType}</span>}
                                  {comp.wattage && <span>{comp.wattage}W</span>}
                                  {comp.tdp && <span>{comp.tdp}W TDP</span>}
                                </div>
                                {comp._impact && !isSelected && current && (
                                  <div className="mt-1.5 space-y-1">
                                    {comp._impact.currentFps !== undefined && comp._impact.newFps !== undefined ? (
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden flex">
                                          <div
                                            className="h-full bg-red-500/50 rounded-l-full transition-all"
                                            style={{ width: '40%' }}
                                          />
                                          <div
                                            className="h-full bg-primary rounded-r-full transition-all"
                                            style={{ width: '60%' }}
                                          />
                                        </div>
                                        <span className="text-[8px] font-mono font-bold text-primary">
                                          {comp._impact.currentFps}→{comp._impact.newFps} FPS
                                        </span>
                                      </div>
                                    ) : null}
                                    {comp._impact.benefit && (
                                      <div className="text-[8px] leading-tight font-bold text-primary/70 line-clamp-1">
                                        {comp._impact.benefit}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <div
                                  className={`text-sm font-black ${isSelected ? 'text-emerald-500' : 'text-primary'}`}
                                >
                                  Rp {comp.price.toLocaleString('id-ID')}
                                </div>
                                {!isSelected && current && (
                                  <div
                                    className={`text-[9px] font-bold ${priceDiff > 0 ? 'text-red-500' : 'text-emerald-500'}`}
                                  >
                                    {priceDiff > 0 ? '+' : ''}Rp {priceDiff.toLocaleString('id-ID')}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
              <div
                className={`px-6 py-3 border-t flex justify-between items-center shrink-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}
              >
                <span className="text-[10px] opacity-40">
                  {selectorSearch || selectorBrand
                    ? selectorComponents.filter((c: any) => {
                        let ok = true;
                        if (selectorSearch) {
                          const q = selectorSearch.toLowerCase();
                          ok =
                            ok &&
                            (c.name?.toLowerCase().includes(q) ||
                              c.brand?.toLowerCase().includes(q) ||
                              c.socket?.toLowerCase().includes(q) ||
                              c.ramType?.toLowerCase().includes(q));
                        }
                        if (selectorBrand) ok = ok && c.brand === selectorBrand;
                        return ok;
                      }).length
                    : selectorComponents.length}{' '}
                  komponen tersedia
                </span>
                <button
                  onClick={() => setSelectorOpen(null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-white/10 hover:bg-white/5 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

function BottleneckCard({
  build,
  technical,
  isDark,
  resolution,
}: {
  build: any;
  technical: any;
  isDark: boolean;
  resolution?: string;
}) {
  const cpuBench = build.CPU?.name ? findCpuBenchmark(build.CPU.name) : null;
  const gpuBench = build.GPU?.name ? findGpuBenchmark(build.GPU.name) : null;

  const isBottleneck = technical.bottleneckStatus && !technical.bottleneckStatus.includes('Seimbang');
  const isSevere = technical.bottleneckStatus?.includes('Severe') || technical.bottleneckStatus?.includes('Moderate');
  const fix = suggestBottleneckFix(cpuBench, gpuBench, resolution || '1080p');
  const showRed = isBottleneck && isSevere;

  let ratio = 0;
  let gpuFps = 0;
  let balancedMin = 0;
  let balancedMax = 0;
  let gaugePct = 0;
  if (cpuBench && gpuBench) {
    const getFps = (b: typeof gpuBench) => {
      if (resolution === '4K') return b.fps4k;
      if (resolution === '1440p') return b.fps1440p;
      return b.fps1080p;
    };
    gpuFps = getFps(gpuBench);
    ratio = gpuFps > 0 ? cpuBench.passmarkSingle / (gpuFps * 100) : 0;
    const t =
      resolution === '4K'
        ? { cpuMin: 0.18, gpuMax: 1.2 }
        : resolution === '1440p'
          ? { cpuMin: 0.22, gpuMax: 0.85 }
          : { cpuMin: 0.25, gpuMax: 0.7 };
    balancedMin = t.cpuMin;
    balancedMax = t.gpuMax;
    gaugePct = Math.min(100, Math.max(0, (ratio / (t.gpuMax * 2)) * 100));
  }

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

      {cpuBench && gpuBench && gpuFps > 0 && (
        <div className="space-y-3 mt-3 mb-3">
          <div className="relative h-6 rounded-full bg-white/10 overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="h-full bg-red-500/20" style={{ width: `${(balancedMin / (balancedMax * 2)) * 100}%` }} />
              <div
                className="h-full bg-emerald-500/20"
                style={{ width: `${((balancedMax - balancedMin) / (balancedMax * 2)) * 100}%` }}
              />
              <div className="h-full bg-red-500/20 flex-1" />
            </div>
            <div
              className="absolute top-0.5 h-5 w-1 rounded-full bg-white shadow-lg transition-all duration-500 z-10"
              style={{ left: `${gaugePct}%`, transform: 'translateX(-50%)' }}
            />
            <div className="absolute inset-0 flex items-center px-2">
              <span className="text-[7px] font-black text-red-400">CPU</span>
              <span className="flex-1 text-center text-[7px] font-black text-emerald-400">Seimbang</span>
              <span className="text-[7px] font-black text-red-400">GPU</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-40 mb-0.5">CPU PassMark</div>
              <div className="text-sm font-black">{cpuBench.passmarkSingle.toLocaleString()}</div>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-40 mb-0.5">
                GPU FPS ({resolution})
              </div>
              <div className="text-sm font-black">{gpuFps}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="opacity-40">Rasio: {(ratio * 100).toFixed(1)}%</span>
            <span className="opacity-40">
              Zona seimbang: {Math.round(balancedMin * 100)}% - {Math.round(balancedMax * 100)}%
            </span>
          </div>
        </div>
      )}

      {!showRed && cpuBench && gpuBench && (
        <p className="text-[10px] opacity-50 leading-relaxed">
          CPU dan GPU telah diseimbangkan untuk performa gaming optimal di resolusi {resolution}.
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
            {fix.suggestions.map((s, i) => {
              const uplift =
                s.passmarkSingle && cpuBench
                  ? Math.round(((s.passmarkSingle - cpuBench.passmarkSingle) / cpuBench.passmarkSingle) * 100)
                  : 0;
              const fpsBoost = s.avgFps && gpuFps ? Math.round(((s.avgFps - gpuFps) / gpuFps) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="font-bold truncate mr-2">{s.model}</span>
                  <span className="opacity-50 font-mono shrink-0">
                    {uplift > 0 ? `+${uplift}%` : ''}
                    {fpsBoost > 0 ? ` +${fpsBoost} FPS` : ''}
                    {s.passmarkSingle && !uplift ? `${s.passmarkSingle.toLocaleString()} pts` : ''}
                    {s.avgFps && !fpsBoost ? `${s.avgFps} FPS` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function PeripheralsCard({
  build,
  isDark,
  onRemove,
  onRestore,
  isRemoved,
  onReplace,
}: {
  build: any;
  isDark: boolean;
  onRemove: (t: string) => void;
  onRestore: (t: string) => void;
  isRemoved: Record<string, any>;
  onReplace: (t: string) => void;
}) {
  const peripheralEntries = Object.entries(build)
    .filter(([type]) => ['MONITOR', 'KEYBOARD', 'MOUSE'].includes(type))
    .filter(([, part]) => part);

  if (peripheralEntries.length === 0) return null;

  return (
    <section className="section-card">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-4 h-4 text-primary" />
        <h3 className="font-black text-sm">Peripheral</h3>
      </div>
      <div className="space-y-3">
        {peripheralEntries.map(([type, part]: [string, any]) => {
          const Icon = TYPE_ICONS[type] || Box;
          const removed = !!isRemoved[type];
          return (
            <div key={type} className={`flex items-center gap-3 group/peripheral ${removed ? 'opacity-30' : ''}`}>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
              >
                <Icon className="w-4 h-4 opacity-60" />
              </div>
              {removed ? (
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">{TYPE_LABELS[type]}</div>
                  <button
                    onClick={() => onRestore(type)}
                    className="text-xs font-bold text-primary hover:underline mt-0.5 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-40">{TYPE_LABELS[type]}</div>
                    <div className="text-xs font-bold truncate">{part.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs font-black text-primary">Rp {part.price.toLocaleString('id-ID')}</div>
                    <button
                      onClick={() => onRemove(type)}
                      className="w-7 h-7 md:w-5 md:h-5 rounded-lg md:rounded flex items-center justify-center text-[9px] md:text-[8px] font-bold bg-red-500/10 text-red-500 md:hover:bg-red-500/20 transition-all opacity-100 md:opacity-0 md:group-hover/peripheral:opacity-100"
                      title="Hapus peripheral"
                    >
                      <Trash2 className="w-3 h-3 md:w-2.5 md:h-2.5" />
                    </button>
                    <button
                      onClick={() => onReplace(type)}
                      className="w-7 h-7 md:w-5 md:h-5 rounded-lg md:rounded flex items-center justify-center text-[9px] md:text-[8px] font-bold bg-white/5 text-gray-400 md:hover:bg-white/10 md:hover:text-primary transition-all opacity-100 md:opacity-0 md:group-hover/peripheral:opacity-100"
                      title="Ganti peripheral"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
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
