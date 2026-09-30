import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Odometer } from '../../components/ui/Odometer';
import { Sparkline } from '../../components/ui/Sparkline';
import { useMissionStore } from '../../store/useMissionStore';
import { Activity, Gauge, Navigation, Compass } from 'lucide-react';

export const LiveTelemetryPanel: React.FC = () => {
  const telemetry = useMissionStore((s) => s.telemetry);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [driftHistory, setDriftHistory] = useState<number[]>([]);

  useEffect(() => {
    if (telemetry) {
      setSpeedHistory((prev) => [...prev.slice(-24), telemetry.speed]);
      setDriftHistory((prev) => [...prev.slice(-24), telemetry.along_track]);
    }
  }, [telemetry]);

  const alongTrack = telemetry?.along_track ?? null;
  const crossTrack = telemetry?.cross_track ?? null;
  const speed = telemetry?.speed ?? null;
  const heading = telemetry?.heading ?? null;

  return (
    <GlassCard className="w-80 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Primary Telemetry
          </span>
        </div>
        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/10">
          60.8 Hz INS
        </span>
      </div>

      {/* Hero Dual Error Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Along-Track Drift */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1017] p-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>ALONG-TRACK</span>
            <Sparkline data={driftHistory} color="#38bdf8" width={38} height={12} />
          </div>
          <div className="mt-1">
            <Odometer
              value={alongTrack}
              unit="m"
              decimals={1}
              className="text-2xl font-bold text-white font-mono-numbers"
              unitClassName="text-slate-400 text-sm ml-1"
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Longitudinal EKF σ</span>
        </div>

        {/* Cross-Track Drift */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1017] p-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>CROSS-TRACK</span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">NHC Gated</span>
          </div>
          <div className="mt-1">
            <Odometer
              value={crossTrack}
              unit="m"
              decimals={1}
              className="text-2xl font-bold text-white font-mono-numbers"
              unitClassName="text-slate-400 text-sm ml-1"
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Lateral Manifold</span>
        </div>
      </div>

      {/* Speed & Heading Row */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        {/* Forward Speed */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1017] p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <Gauge className="h-3 w-3 text-slate-400" />
            <span>FORWARD SPEED</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <Odometer
              value={speed}
              unit="km/h"
              decimals={1}
              className="text-lg font-semibold text-slate-100 font-mono-numbers"
              unitClassName="text-slate-500 text-xs ml-0.5"
            />
            <Sparkline data={speedHistory} color="#64748b" width={32} height={10} />
          </div>
        </div>

        {/* Heading */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1017] p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <Compass className="h-3 w-3 text-slate-400" />
            <span>HEADING (COG)</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <Odometer
              value={heading}
              unit="°"
              decimals={1}
              className="text-lg font-semibold text-slate-100 font-mono-numbers"
              unitClassName="text-slate-500 text-xs ml-0.5"
            />
            <Navigation
              className="h-3.5 w-3.5 text-sky-400 transition-transform duration-200"
              style={{ transform: `rotate(${heading || 0}deg)` }}
            />
          </div>
        </div>
      </div>

      {/* 5-Stage Estimator Pipeline Lightbar */}
      <div className="border-t border-white/[0.08] pt-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Estimator Pipeline Stages
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>IMU</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Align</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>TCN</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>EKF</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>NIS</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
