import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Compass, Shield, Zap } from 'lucide-react';
import { useMissionStore } from '../../store/useMissionStore';

export const IntroScreen: React.FC = () => {
  const setScreen = useMissionStore((s) => s.setScreen);

  // Allow skipping with any key press
  useEffect(() => {
    const handleKeyDown = () => setScreen('cockpit');
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setScreen]);

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#080a0f] px-6 text-slate-100">
      {/* Background Architectural Grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] rounded-full bg-sky-500/[0.03] blur-[100px]" />
      </div>

      {/* Main Hero Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex max-w-2xl flex-col items-center text-center"
      >
        {/* Defense/Aerospace Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3.5 py-1 text-[11px] font-medium tracking-wide text-slate-300"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <span>SMART INDIA HACKATHON 2026 &bull; GNSS/INS INTEGRATED NAVIGATION</span>
        </motion.div>

        {/* Wordmark */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-3 text-5xl font-bold tracking-tight text-white sm:text-6xl"
        >
          TrueTrack <span className="text-sky-400 font-medium">v2</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8 text-base text-slate-300 sm:text-lg max-w-xl"
        >
          Continuous sub-2% dead reckoning during sustained GNSS outages.
          <span className="block text-xs text-slate-500 mt-2 font-mono">
            16-State Error-State EKF &bull; TCN Odometry &bull; Dynamic Mount Estimation
          </span>
        </motion.p>

        {/* Technical Validation Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8 flex flex-wrap justify-center gap-3 text-xs text-slate-400"
        >
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0e121b] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-mono">1.84% Drift Gate Passed</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0e121b] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span className="text-slate-300 font-mono">100% On-Device Neural</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0e121b] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-slate-300 font-mono">120 ms Changepoint Recovery</span>
          </div>
        </motion.div>

        {/* Enter Mission Control Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setScreen('cockpit')}
          className="group flex items-center gap-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-7 py-3 font-semibold text-slate-950 transition-all cursor-pointer shadow-md"
        >
          <span>Open Telemetry Console</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </motion.button>

        <span className="mt-4 text-[11px] font-mono text-slate-500">
          Press any key to enter immediately
        </span>
      </motion.div>
    </div>
  );
};
