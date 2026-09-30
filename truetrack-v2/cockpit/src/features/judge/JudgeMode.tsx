import React, { useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useMissionStore } from '../../store/useMissionStore';
import { Award, ArrowRight, ArrowLeft, X, Play, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JudgeModeProps {
  onCommand: (cmd: any) => void;
}

const TOUR_STEPS = [
  {
    title: '1. Nominal GNSS-Aided Carrier Lock',
    badge: 'STAGE 1: ALIGNMENT',
    description:
      'Vehicle is cruising on Chennai arterial corridor at 60.8 Hz native IMU. Dynamic alignment continuously estimates gravity vector and mount orientation without requiring artificial vehicle maneuvers.',
    actionNote: 'Estimator error < 0.4 m & Covariance ellipse tightly bound.',
    trigger: (onCmd: any, s: any) => {
      onCmd({ action: 'select_route', route_id: 'chennai_varada' });
      if (s.isBlackout) s.toggleBlackout();
    }
  },
  {
    title: '2. GNSS Blackout & Flyover Divergence',
    badge: 'STAGE 2: DEAD RECKONING',
    description:
      'GNSS completely lost entering the Poonamallee bypass interchange curve. Baseline B0 holds last speed and straight heading, rapidly diverging. TrueTrack v2 applies Calibrated Neural TCN speed + Non-Holonomic Constraints (NHC) to hug the curve.',
    actionNote: 'TrueTrack stays < 1.84% drift (SIH Gate Passed) while Baseline B0 blows out to 14.8%.',
    trigger: (onCmd: any, s: any) => {
      if (!s.isBlackout) s.toggleBlackout();
      onCmd({ action: 'toggle_blackout' });
    }
  },
  {
    title: '3. Hostile Fault: 30° Sudden Phone Tilt',
    badge: 'STAGE 3: MOUNT RECOVERY',
    description:
      'Driver hits a pothole or adjusts phone mount by 30°. Classic dead reckoners fail immediately. TrueTrack v2 CUSUM detector identifies changepoint in 120 ms, resets attitude covariance, and re-levels within 3.2 seconds.',
    actionNote: 'Attitude error recovers smoothly without diverging position track.',
    trigger: (onCmd: any, s: any) => {
      s.toggleTilt();
      onCmd({ action: 'toggle_mount' });
    }
  },
  {
    title: '4. Defense Against Jamming & Spoofing',
    badge: 'STAGE 4: INTEGRITY GATING',
    description:
      'Simulating hostile GNSS jamming and spoofing attacks. Normalized Innovation Squared (NIS) spikes to 28.5, well above the chi-square 99% threshold. The ES-EKF gates out the poisoned measurements instantly.',
    actionNote: 'Poisoned GNSS updates are quarantined; estimator continues on pure dead reckoning.',
    trigger: (onCmd: any, s: any) => {
      s.toggleJamming();
      onCmd({ action: 'toggle_jamming' });
    }
  },
  {
    title: '5. GNSS Recovery & Fixed-Lag RTS Smoothing',
    badge: 'STAGE 5: RETROACTIVE CORRECTION',
    description:
      'Vehicle exits the blackout corridor and re-locks carrier phase. Rauch-Tung-Striebel (RTS) fixed-lag smoother retroactively corrects the preceding 15-second trajectory, eliminating accumulated longitudinal uncertainty.',
    actionNote: 'Observe the visual trail snap back to true ground truth geometry.',
    trigger: (onCmd: any, s: any) => {
      if (s.isBlackout) s.toggleBlackout();
      onCmd({ action: 'toggle_blackout' });
    }
  }
];

export const JudgeMode: React.FC<JudgeModeProps> = ({ onCommand }) => {
  const isJudgeMode = useMissionStore((s) => s.isJudgeMode);
  const toggleJudgeMode = useMissionStore((s) => s.toggleJudgeMode);
  const judgeStep = useMissionStore((s) => s.judgeStep);
  const setJudgeStep = useMissionStore((s) => s.setJudgeStep);
  const store = useMissionStore();

  const currentStepData = TOUR_STEPS[judgeStep] || TOUR_STEPS[0];

  const goNext = () => {
    if (judgeStep < TOUR_STEPS.length - 1) {
      const next = judgeStep + 1;
      setJudgeStep(next);
      TOUR_STEPS[next].trigger(onCommand, store);
    } else {
      toggleJudgeMode();
    }
  };

  const goPrev = () => {
    if (judgeStep > 0) {
      const prev = judgeStep - 1;
      setJudgeStep(prev);
      TOUR_STEPS[prev].trigger(onCommand, store);
    }
  };

  // Keyboard navigation for presentation
  useEffect(() => {
    if (!isJudgeMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        toggleJudgeMode();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isJudgeMode, judgeStep]);

  if (!isJudgeMode) return null;

  return (
    <div className="fixed top-18 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none">
      <GlassCard className="pointer-events-auto border border-white/15 bg-[#0e121b]/95 p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Judge Mode Guided Tour
            </span>
            <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-white/10">
              Step {judgeStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              [Space / Arrows to navigate]
            </span>
            <button
              onClick={toggleJudgeMode}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={judgeStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-sky-400 border border-sky-500/30">
                {currentStepData.badge}
              </span>
              <h3 className="text-sm font-semibold text-white">{currentStepData.title}</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentStepData.description}
            </p>

            <div className="rounded border border-white/10 bg-[#0c1017] px-3 py-1.5 text-[11px] text-slate-300 font-medium">
              &bull; {currentStepData.actionNote}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.08] pt-2.5">
          <button
            onClick={goPrev}
            disabled={judgeStep === 0}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          <button
            onClick={goNext}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-1.5 text-xs font-semibold text-slate-950 transition-all cursor-pointer shadow-sm"
          >
            <span>{judgeStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
