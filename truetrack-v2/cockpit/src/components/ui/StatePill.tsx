import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertTriangle, RadioTower } from 'lucide-react';
import { useMissionStore } from '../../store/useMissionStore';

export const StatePill: React.FC = () => {
  const telemetry = useMissionStore((s) => s.telemetry);
  const isBlackout = useMissionStore((s) => s.isBlackout);
  const isJammed = useMissionStore((s) => s.isJammed);
  const isSpoofed = useMissionStore((s) => s.isSpoofed);
  const isLiveConnected = useMissionStore((s) => s.isLiveConnected);
  const isMockMode = useMissionStore((s) => s.isMockMode);

  const isDeadReckoning = isBlackout || (telemetry?.is_blackout ?? false);
  const isDegraded = isJammed || isSpoofed;

  let modeLabel = 'GNSS-AIDED LOCK';
  let modeBorder = 'border-emerald-500/30 text-emerald-300';
  let dotBg = 'bg-emerald-400';
  let Icon = ShieldCheck;

  if (isDeadReckoning) {
    modeLabel = 'DEAD RECKONING (ES-EKF + TCN)';
    modeBorder = 'border-sky-500/40 text-sky-200';
    dotBg = 'bg-sky-400';
    Icon = RadioTower;
  } else if (isDegraded) {
    modeLabel = isJammed ? 'DEGRADED: JAMMING GATED' : 'DEGRADED: CUSUM SPOOFING';
    modeBorder = 'border-amber-500/40 text-amber-200';
    dotBg = 'bg-amber-400';
    Icon = AlertTriangle;
  }

  return (
    <div className="flex items-center gap-2.5">
      <AnimatePresence mode="wait">
        <motion.div
          key={modeLabel}
          initial={{ opacity: 0, y: -3, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 3, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className={`flex items-center gap-2 rounded-full border bg-slate-900/90 px-3.5 py-1 text-xs font-medium tracking-wide shadow-md backdrop-blur-md ${modeBorder}`}
        >
          <span className="flex h-2 w-2 items-center justify-center">
            <span className={`h-1.5 w-1.5 rounded-full ${dotBg}`} />
          </span>

          <Icon className="h-3.5 w-3.5 opacity-90" />
          <span>{modeLabel}</span>

          {telemetry && (
            <span className="ml-1 border-l border-white/10 pl-2 text-[10px] font-mono text-slate-400">
              NIS {telemetry.nis.toFixed(1)}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {isMockMode && (
        <span className="rounded-full border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          MOCK DATA
        </span>
      )}

      <span
        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono transition-colors ${
          isLiveConnected
            ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400'
            : 'border-white/10 bg-slate-900/80 text-slate-400'
        }`}
      >
        {isLiveConnected ? '● WS: 8765' : '● REPLAY'}
      </span>
    </div>
  );
};
