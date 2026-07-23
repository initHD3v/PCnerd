'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Minimize2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
} from 'lucide-react';

interface SyncStatus {
  status: string;
  progress: number;
  message: string;
  total?: number;
  processed?: number;
}

export default function SyncPanel({ isDarkMode, onComplete }: { isDarkMode: boolean; onComplete?: () => void }) {
  const [minimized, setMinimized] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pollRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const t = pollingRef.current;
      if (t) clearTimeout(t);
    };
  }, []);

  const poll = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const res = await fetch('/api/admin/sync');
      if (res.ok) {
        const data = await res.json();
        if (!mountedRef.current) return;
        setStatus(data);
        if (data.status === 'running') {
          pollingRef.current = setTimeout(() => pollRef.current?.(), 2000);
        } else {
          setSyncing(false);
          onComplete?.();
        }
      }
    } catch {
      if (mountedRef.current) setSyncing(false);
    }
  }, [onComplete]);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const startSync = useCallback(async () => {
    setSyncing(true);
    setStatus(null);
    setShowPanel(true);
    setMinimized(false);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();
      if (!mountedRef.current) return;
      if (res.status === 409) {
        setStatus({ status: 'failed', progress: 0, message: data.message || 'Sinkronisasi sudah berjalan.' });
        setSyncing(false);
      } else if (res.ok) {
        pollRef.current?.();
      } else {
        setSyncing(false);
        setShowPanel(false);
      }
    } catch {
      if (mountedRef.current) {
        setSyncing(false);
        setShowPanel(false);
      }
    }
  }, []);

  const closePanel = () => {
    setShowPanel(false);
    setMinimized(false);
  };

  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';

  return (
    <>
      {/* Trigger button — always visible when not syncing */}
      {!showPanel && (
        <button
          onClick={startSync}
          disabled={syncing}
          className={`px-4 py-2 border rounded-lg text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50 ${
            isDarkMode
              ? 'bg-black border-white/10 hover:bg-white/10 text-white'
              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync Prices
        </button>
      )}

      {/* Floating panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50"
          >
            {minimized ? (
              <button
                onClick={() => setMinimized(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl border transition-all hover:scale-105 ${
                  isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''} text-primary`} />
                <span className="text-sm font-bold">{status?.progress || 0}%</span>
                <Maximize2 className="w-3 h-3 text-gray-500" />
              </button>
            ) : (
              <div
                className={`w-80 rounded-2xl shadow-2xl border overflow-hidden ${
                  isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-200'
                }`}
              >
                {/* Header */}
                <div
                  className={`flex items-center justify-between px-5 py-4 border-b ${
                    isDarkMode ? 'border-white/5' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-emerald-500/10' : isFailed ? 'bg-red-500/10' : 'bg-primary/10'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : isFailed ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <RefreshCw className={`w-4 h-4 text-primary ${isRunning ? 'animate-spin' : ''}`} />
                      )}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isCompleted ? 'Sync Complete' : isFailed ? 'Sync Failed' : 'Price Sync'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">
                        {isRunning ? 'Sedang memproses...' : status?.message || ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMinimized(true)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={closePanel}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div
                      className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${status?.progress || 0}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-primary'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {status?.progress || 0}%
                      </span>
                      {status?.total && status?.processed !== undefined && (
                        <span className={`text-[10px] font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {status.processed} / {status.total}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="flex items-start gap-2">
                    {isRunning ? (
                      <Database className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {status?.message || 'Memulai sinkronisasi...'}
                    </p>
                  </div>

                  {/* Action buttons when done */}
                  {(isCompleted || isFailed) && (
                    <button
                      onClick={startSync}
                      className="w-full py-2.5 bg-primary text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                    >
                      {isFailed ? 'Coba Lagi' : 'Sync Lagi'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
