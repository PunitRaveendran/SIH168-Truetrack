import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Odometer } from '../../components/ui/Odometer';
import { useMissionStore } from '../../store/useMissionStore';
import { RadioTower, Sparkles, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ComparisonCard: React.FC = () => {
  const telemetry = useMissionStore((s) => s.telemetry);
  const isBlackout = useMissionStore((s) => s.isBlackout || (telemetry?.is_blackout ?? false));

  const ttDrift = telemetry?.tt_drift ?? null;
  const ttPct = telemetry?.tt_pct ?? null;
  const b0Drift = telemetry?.b0_drift ?? null;
  const b0Pct = telemetry?.b0_pct ?? null;
  const divRatio = telemetry?.div_ratio ?? 1.0;

  return (
    <GlassCard className="w-84 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Blackout Divergence Comparison
          </span>
        </div>
        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/10">
          SIH Gate &lt;10%
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!isBlackout ? (
          /* Idle Calm State */
          <motion.div
            key="idle-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-5 text-center"
          >
            <div className="relative mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <RadioTower className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-slate-200">
              Awaiting GNSS Blackout
            </span>
            <p className="mt-1 max-w-[240px] text-[11px] text-slate-400 leading-tight">
              Carrier lock active (&lt; 0.4 m error). Trigger blackout to observe dual divergence.
            </p>
          </motion.div>
        ) : (
          /* Active Blackout Divergence State */
          <motion.div
            key="active-blackout"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-3"
          >
            {/* Side by side comparison columns */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* TrueTrack v2 Column */}
              <div className="rounded-lg border border-sky-500/40 bg-[#0c1017] p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>TrueTrack v2</span>
                </div>
                <div className="mt-1.5">
                  <Odometer
                    value={ttDrift}
                    unit="m"
                    decimals={1}
                    className="text-2xl font-bold text-white font-mono-numbers"
                    unitClassName="text-slate-400 text-sm ml-1"
                  />
                  <div className="text-[11px] font-mono text-sky-300 font-medium">
                    {ttPct !== null ? `${ttPct.toFixed(1)}% dist` : '—'}
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-medium text-emerald-400 font-mono">
                  &check; PASSES GATE
                </div>
              </div>

              {/* Baseline B0 Column */}
              <div className="rounded-lg border border-amber-500/30 bg-[#0c1017] p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Baseline B0</span>
                </div>
                <div className="mt-1.5">
                  <Odometer
                    value={b0Drift}
                    unit="m"
                    decimals={1}
                    className="text-2xl font-bold text-slate-200 font-mono-numbers"
                    unitClassName="text-slate-500 text-sm ml-1"
                  />
                  <div className="text-[11px] font-mono text-amber-400/90 font-medium">
                    {b0Pct !== null ? `${b0Pct.toFixed(1)}% dist` : '—'}
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-medium text-rose-400 font-mono">
                  &cross; FAILS GATE
                </div>
              </div>
            </div>

            {/* Improvement Banner */}
            <div className="rounded-lg border border-white/[0.08] bg-[#0c1017] p-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Advantage:</span>
                <span className="font-mono text-base font-bold text-white">
                  {divRatio.toFixed(1)}x
                </span>
                <span className="text-[11px] text-slate-400">less drift</span>
              </div>
            </div>

            {/* Divergence Progress Comparison Bars */}
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Divergence Ratio Scale</span>
                <span className="font-mono text-sky-400">8.1x Target</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full bg-sky-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (divRatio / 8.5) * 100)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
