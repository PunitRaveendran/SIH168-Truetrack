import React from 'react';
import { useMissionStore } from '../../store/useMissionStore';
import { MapLibreView } from '../map/MapLibreView';
import { Navigation, ArrowUpRight, ShieldCheck, RadioTower, AlertTriangle, Monitor, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EngineCommand } from '../../data/adapter';

interface MobileNavViewProps {
  onCommand: (cmd: EngineCommand) => void;
}

export const MobileNavView: React.FC<MobileNavViewProps> = ({ onCommand }) => {
  const telemetry = useMissionStore((s) => s.telemetry);
  const isBlackout = useMissionStore((s) => s.isBlackout || (telemetry?.is_blackout ?? false));
  const isTilted = useMissionStore((s) => s.isTilted);
  const isJammed = useMissionStore((s) => s.isJammed);
  const setScreen = useMissionStore((s) => s.setScreen);
  const toggleBlackout = useMissionStore((s) => s.toggleBlackout);
  const toggleTilt = useMissionStore((s) => s.toggleTilt);

  const speed = telemetry?.speed ?? 36.5;
  const heading = telemetry?.heading ?? 84;
  const ttDrift = telemetry?.tt_drift ?? 0.4;
  const ttPct = telemetry?.tt_pct ?? 0.8;
  const alongTrack = telemetry?.along_track ?? 0.3;
  const crossTrack = telemetry?.cross_track ?? 0.1;

  const handleBlackoutToggle = () => {
    toggleBlackout();
    onCommand({ action: 'toggle_blackout' });
  };

  const handleTiltToggle = () => {
    toggleTilt();
    onCommand({ action: 'toggle_mount' });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#080a0f] text-slate-100 flex flex-col justify-between font-sans select-none">
      {/* 1. Fullscreen Map Navigation View */}
      <div className="absolute inset-0 z-0">
        <MapLibreView />
      </div>

      {/* 2. Top Turn-by-Turn Card (Google Maps / Apple Maps Style) */}
      <div className="relative z-20 pt-4 px-4 pointer-events-auto">
        <div className="rounded-2xl border border-white/10 bg-[#0d121c]/95 p-3.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-slate-950 font-bold shadow-md">
              <ArrowUpRight className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white font-mono">180 m</span>
                <span className="text-xs text-slate-400 font-medium">Keep left</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 truncate">
                Poonamallee Bypass &bull; Underpass Tunnel
              </div>
            </div>

            {/* Switch to Desktop Console Button */}
            <button
              onClick={() => setScreen('cockpit')}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
              title="Switch to Mission Control Desktop View"
            >
              <Monitor className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
          </div>

          {/* Dynamic GNSS / Dead Reckoning Status Pill */}
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!isBlackout ? (
                <motion.div
                  key="gnss-lock"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs font-medium text-emerald-400"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>GNSS Carrier Lock Active (Carrier-Phase)</span>
                </motion.div>
              ) : (
                <motion.div
                  key="dead-reckoning"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs font-medium text-amber-300"
                >
                  <RadioTower className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span>INS DEAD RECKONING ACTIVE (ES-EKF + TCN)</span>
                </motion.div>
              )}
            </AnimatePresence>

            <span className="font-mono text-[10px] text-slate-400">
              {isBlackout ? `Drift: ${ttDrift.toFixed(1)}m (${ttPct.toFixed(1)}%)` : '< 0.4m error'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Floating Speedometer & Heading Compass */}
      <div className="relative z-20 px-4 flex justify-between items-end pointer-events-none">
        {/* Speedometer Circle */}
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#0d121c]/90 p-3 shadow-xl backdrop-blur-md flex flex-col items-center min-w-[76px]">
          <span className="text-2xl font-black text-white font-mono tracking-tight leading-none">
            {Math.round(speed)}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            km/h
          </span>
        </div>

        {/* Heading Indicator */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0d121c]/90 px-3 py-1.5 shadow-xl backdrop-blur-md text-xs font-mono text-slate-300">
          <Navigation
            className="h-3.5 w-3.5 text-sky-400 transition-transform duration-200"
            style={{ transform: `rotate(${heading}deg)` }}
          />
          <span>{Math.round(heading)}° COG</span>
        </div>
      </div>

      {/* 4. Bottom Driver Navigation Bar */}
      <div className="relative z-20 pb-5 px-4 pt-2 pointer-events-auto space-y-2">
        {/* Real-time Navigation Metric Strip */}
        <div className="rounded-2xl border border-white/10 bg-[#0d121c]/95 p-3.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-emerald-400 font-mono">14 min</span>
                <span className="text-xs text-slate-400">&bull; 11.2 km &bull; 11:42 AM</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Along-Track: <strong className="text-slate-200 font-mono">{alongTrack}m</strong></span>
                <span>&bull;</span>
                <span>Cross-Track: <strong className="text-emerald-400 font-mono">{crossTrack}m</strong></span>
              </div>
            </div>

            {/* Quick Demo Scenario Injection Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleTiltToggle}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
                  isTilted
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Simulate 30° Phone Mount Shift"
              >
                {isTilted ? 'Reset 0°' : 'Tilt 30°'}
              </button>

              <button
                onClick={handleBlackoutToggle}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                  isBlackout
                    ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md'
                    : 'border-white/10 bg-sky-500 text-slate-950 font-bold hover:bg-sky-400'
                }`}
              >
                {isBlackout ? 'Exit Tunnel' : 'Simulate Blackout'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
