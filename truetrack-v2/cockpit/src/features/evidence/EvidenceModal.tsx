import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useMissionStore } from '../../store/useMissionStore';
import { PS_BENCHMARK_GATES, ABLATION_LADDER, FAULT_INJECTION_METRICS, SENSOR_GRADE_BENCHMARKS } from '../../data/results';
import { X, Award, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export const EvidenceModal: React.FC = () => {
  const isEvidenceOpen = useMissionStore((s) => s.isEvidenceOpen);
  const setEvidenceOpen = useMissionStore((s) => s.setEvidenceOpen);

  if (!isEvidenceOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
      <GlassCard className="relative flex h-[85vh] w-full max-w-5xl flex-col border-white/15 bg-[#0e121b]/95 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <Award className="h-6 w-6 text-sky-400" />
            <div>
              <h2 className="text-lg font-bold text-white">
                Empirical Evaluation & PS Compliance Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Derived directly from verifiable experimental test runs in <code className="text-sky-300 font-mono">truetrack-v2/results/</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => setEvidenceOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pr-2 text-xs">
          {/* 1. Problem Statement Benchmark Gates */}
          <div>
            <h3 className="mb-2.5 font-bold uppercase tracking-wider text-slate-300">
              1. Smart India Hackathon Problem Statement Gates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PS_BENCHMARK_GATES.map((gate, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-[#0c1017] p-3.5">
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-slate-100">{gate.requirement}</span>
                    <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="h-3 w-3" />
                      {gate.status}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded bg-slate-800/60 p-1.5">
                      <span className="text-slate-400 block text-[10px]">Target PS</span>
                      <span className="font-mono font-semibold text-slate-200">{gate.targetMetric}</span>
                    </div>
                    <div className="rounded bg-rose-950/30 p-1.5 border border-rose-900/40">
                      <span className="text-rose-400 block text-[10px]">Baseline B0</span>
                      <span className="font-mono font-semibold text-rose-300">{gate.baselineB0}</span>
                    </div>
                    <div className="rounded bg-sky-500/10 p-1.5 border border-sky-500/30">
                      <span className="text-sky-400 block text-[10px]">TrueTrack v2</span>
                      <span className="font-mono font-bold text-sky-200">{gate.trueTrackV2}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-sky-400 font-medium">
                    &bull; Advantage: {gate.improvementFactor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Ablation Progression Ladder */}
          <div>
            <h3 className="mb-2.5 font-bold uppercase tracking-wider text-slate-300">
              2. Ablation Ladder (Mean Blackout Drift % of Distance)
            </h3>
            <div className="space-y-2 rounded-lg border border-white/10 bg-[#0c1017] p-4">
              {ABLATION_LADDER.map((tier) => (
                <div key={tier.id} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-200">{tier.name}</span>
                    <span className={`font-mono font-bold ${tier.sihGatePassed ? 'text-sky-300' : 'text-rose-400'}`}>
                      {tier.meanDriftPct.toFixed(2)}% {tier.sihGatePassed ? '(PASSED)' : '(FAILED)'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className={`h-full ${tier.sihGatePassed ? 'bg-sky-400' : 'bg-rose-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (tier.meanDriftPct / 35) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">{tier.notes}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Sensor Grade Portability & Cost */}
          <div>
            <h3 className="mb-2.5 font-bold uppercase tracking-wider text-slate-300">
              3. Sensor Portability & Hardware Agnostic Performance
            </h3>
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#0c1017]">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="border-b border-white/10 bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="p-2.5">Hardware Grade</th>
                    <th className="p-2.5">Device Tested</th>
                    <th className="p-2.5">Angle Random Walk</th>
                    <th className="p-2.5">1-Min Blackout Drift</th>
                    <th className="p-2.5">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {SENSOR_GRADE_BENCHMARKS.map((s, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-2.5 font-sans font-semibold text-slate-100 flex items-center gap-1.5">
                        {s.grade}
                        {s.type.includes('SIMULATED') && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                            SIMULATED
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">{s.device}</td>
                      <td className="p-2.5">{s.arw}</td>
                      <td className="p-2.5 font-bold text-sky-300">{s.blackoutDrift1Min}</td>
                      <td className="p-2.5 text-slate-400">{s.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Fault Injection & Defense Summary */}
          <div>
            <h3 className="mb-2.5 font-bold uppercase tracking-wider text-slate-300">
              4. Integrity Defense & Fault Detection Benchmark
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FAULT_INJECTION_METRICS.map((f, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-[#0c1017] p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <ShieldAlert className="h-4 w-4 text-sky-400" />
                    <span>{f.scenario}</span>
                  </div>
                  <div className="mt-2 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Latency:</span>
                      <span className="text-sky-300 font-bold">{f.detectionLatencyMs} ms</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Measured:</span>
                      <span className="text-slate-200">{f.measuredValue}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 leading-tight">
                    {f.mechanism}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
