import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useMissionStore } from '../../store/useMissionStore';
import { N3_FEASIBILITY_SUMMARY } from '../../data/results';
import { X, Sparkles, Sliders, Layers, FileText } from 'lucide-react';

export const ContributionsPanel: React.FC = () => {
  const isContributionsOpen = useMissionStore((s) => s.isContributionsOpen);
  const setContributionsOpen = useMissionStore((s) => s.setContributionsOpen);
  const isObservabilityVisible = useMissionStore((s) => s.isObservabilityVisible);
  const toggleObservability = useMissionStore((s) => s.toggleObservability);

  const [activeTab, setActiveTab] = useState<'n1' | 'n2' | 'n3'>('n1');

  if (!isContributionsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <GlassCard className="relative w-full max-w-2xl border-white/15 bg-slate-950/90 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              TrueTrack v2: Technical Novelty & Contributions
            </h2>
          </div>
          <button
            onClick={() => setContributionsOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="mt-4 flex gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('n1')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'n1'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>N1: RLS Adaptation</span>
          </button>

          <button
            onClick={() => setActiveTab('n2')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'n2'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>N2: Observability Map</span>
          </button>

          <button
            onClick={() => setActiveTab('n3')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'n3'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>N3: Vibration Gate</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-5 text-sm text-slate-300">
          {activeTab === 'n1' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">N1: GNSS-Supervised On-Device Adaptation</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  When GNSS carrier Doppler is healthy prior to entering a tunnel, velocity innovation provides zero-cost ground truth labels. 
                  TrueTrack adapts the TCN model's final linear projection layer in real-time via <strong>Recursive Least Squares (RLS)</strong>, 
                  tuning the forward velocity estimator to specific suspension and mount compliance.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0c1017] p-3.5">
                <div className="text-xs font-mono text-sky-300 font-semibold">
                  Measured Calibration Gain:
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded bg-slate-800/80 p-2">
                    <div className="text-[10px] text-slate-400">Pre-Tunnel GNSS</div>
                    <div className="font-mono text-sm font-bold text-slate-200">0s (Zero-Shot)</div>
                    <div className="text-[10px] text-amber-400">3.42% Drift</div>
                  </div>
                  <div className="rounded bg-slate-800/80 p-2">
                    <div className="text-[10px] text-slate-400">Pre-Tunnel GNSS</div>
                    <div className="font-mono text-sm font-bold text-slate-200">15s Exposure</div>
                    <div className="text-[10px] text-sky-400">2.60% Drift</div>
                  </div>
                  <div className="rounded bg-sky-500/10 border border-sky-500/30 p-2">
                    <div className="text-[10px] text-slate-400">Pre-Tunnel GNSS</div>
                    <div className="font-mono text-sm font-bold text-sky-300">30s Converged</div>
                    <div className="text-[10px] text-emerald-400 font-bold">1.84% Drift</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                <strong className="text-slate-200">Fail-Safe Lock:</strong> Adaptation instantly freezes the microsecond GNSS variance degrades, preventing self-reinforcing bias loops during blackouts.
              </div>
            </div>
          )}

          {activeTab === 'n2' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">N2: Along-Track Geometry Observability & Drift Budget</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Map matching trivially bounds cross-track error, but along-track drift grows unconstrained on straightaways. 
                  Road curvature provides an along-track heading signature that resets longitudinal variance at bends.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0c1017] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Upcoming Tunnel Drift Budget:</span>
                  <span className="font-mono font-bold text-sky-300">&plusmn; 6.4 meters</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Manifold Observability Grade:</span>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 font-bold text-sky-300 text-[10px]">
                    HIGH (Bends Available)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300">Toggle Curvature Observability Map Overlay:</span>
                <button
                  onClick={toggleObservability}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isObservabilityVisible
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-800 text-slate-400 border border-white/10'
                  }`}
                >
                  {isObservabilityVisible ? 'Overlay Active' : 'Enable Overlay'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'n3' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 border border-amber-500/30">
                  {N3_FEASIBILITY_SUMMARY.status}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {N3_FEASIBILITY_SUMMARY.reason}
              </p>

              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kill Criterion Target:</span>
                  <span className="font-mono text-slate-200">R &ge; 0.90</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Measured Correlation:</span>
                  <span className="font-mono text-amber-400 font-bold">R = 0.54 (Failed Gate)</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic">
                {N3_FEASIBILITY_SUMMARY.verdict}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
