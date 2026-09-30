import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useMissionStore } from '../../store/useMissionStore';
import { Play, Pause, RotateCcw, FastForward, Sliders } from 'lucide-react';

interface TimelineDockProps {
  onCommand: (cmd: any) => void;
}

export const TimelineDock: React.FC<TimelineDockProps> = ({ onCommand }) => {
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const setIsPlaying = useMissionStore((s) => s.setIsPlaying);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);
  const telemetry = useMissionStore((s) => s.telemetry);
  const isBlackout = useMissionStore((s) => s.isBlackout);
  const toggleBlackout = useMissionStore((s) => s.toggleBlackout);

  const routeInit = useMissionStore((s) => s.routeInit);
  const step = telemetry?.step ?? 0;
  const totalSteps = telemetry?.total_steps ?? routeInit?.total_frames ?? 11500;
  const timeStr = telemetry?.time_str ?? '00:00';
  const progressPct = Math.min(100, Math.max(0, (step / Math.max(1, totalSteps)) * 100));

  const handlePlayPause = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    onCommand({ action: next ? 'play' : 'pause' });
  };

  const handleReset = () => {
    onCommand({ action: 'reset' });
  };

  const cycleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : playbackSpeed === 4 ? 8 : 1;
    setPlaybackSpeed(nextSpeed);
    onCommand({ action: 'set_speed', speed: nextSpeed });
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetStep = Math.round(ratio * (totalSteps - 1));
    onCommand({ action: 'seek', step: targetStep });
  };

  return (
    <GlassCard className="mx-auto max-w-4xl px-5 py-3">
      <div className="flex flex-col gap-2.5">
        {/* Top Controls Row */}
        <div className="flex items-center justify-between text-xs">
          {/* Left Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 transition-all cursor-pointer font-bold shadow-sm"
              title={isPlaying ? 'Pause Replay' : 'Play Replay'}
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
            </button>

            <button
              onClick={handleReset}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 transition-all cursor-pointer"
              title="Reset to Start"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={cycleSpeed}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-mono font-medium text-slate-200 border border-white/10 hover:bg-slate-700 transition-all cursor-pointer"
              title="Toggle Playback Speed (1x, 2x, 4x, 8x)"
            >
              <FastForward className="h-3 w-3 text-sky-400" />
              <span>{playbackSpeed}x</span>
            </button>

            <button
              onClick={() => {
                toggleBlackout();
                onCommand({ action: 'toggle_blackout' });
              }}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all cursor-pointer ${
                isBlackout
                  ? 'border border-amber-500/50 bg-amber-500/20 text-amber-300'
                  : 'border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isBlackout ? 'bg-amber-400' : 'bg-slate-500'}`} />
              <span>{isBlackout ? 'GNSS Blackout: ACTIVE' : 'Inject Blackout'}</span>
            </button>
          </div>

          {/* Time & Frame Counter */}
          <div className="flex items-center gap-3 font-mono text-xs text-slate-300">
            <span className="text-white font-bold">{timeStr}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Frame {step.toLocaleString()} of {totalSteps.toLocaleString()}</span>
          </div>
        </div>

        {/* Scrubbable Multi-Zone Track with Click-to-Seek */}
        <div
          onClick={handleSeek}
          className="relative h-4 w-full cursor-pointer rounded-full bg-[#0c1017] border border-white/10 overflow-hidden group"
          title="Click anywhere to scrub across all trip frames"
        >
          {/* Segment: 0% - 20% GNSS Lock */}
          <div className="absolute inset-y-0 left-0 w-[20%] bg-emerald-500/10 border-r border-emerald-500/20" />

          {/* Segment: 20% - 55% Tunnel/Curve Blackout Zone */}
          <div 
            className="absolute inset-y-0 left-[20%] w-[35%] bg-amber-500/10 border-r border-amber-500/20"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(245, 158, 11, 0.15) 5px, rgba(245, 158, 11, 0.15) 10px)'
            }}
          />

          {/* Segment: 55% - 100% Post-Blackout Recovery Lock */}
          <div className="absolute inset-y-0 left-[55%] w-[45%] bg-emerald-500/10" />

          {/* Progress Playhead Line */}
          <div
            className="absolute inset-y-0 left-0 bg-sky-500/70 transition-all duration-75"
            style={{ width: `${progressPct}%` }}
          />

          {/* Scrubber Knob */}
          <div
            className="absolute top-0 bottom-0 w-2.5 rounded-full bg-white shadow -translate-x-1/2 group-hover:scale-110 transition-transform"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Legend Track Annotations */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Nominal Carrier Lock
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Outage / Flyover Curve (Dead Reckoning)
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> RTS Fixed-Lag Snapback
          </span>
        </div>
      </div>
    </GlassCard>
  );
};
