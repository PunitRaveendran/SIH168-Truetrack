import React from 'react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { HoldButton } from '../../components/ui/HoldButton';
import { useMissionStore } from '../../store/useMissionStore';
import { Smartphone, Radio, Zap, Layers, MapPin, Gauge } from 'lucide-react';

interface ScenarioCardsProps {
  onCommand: (cmd: any) => void;
}

export const ScenarioCards: React.FC<ScenarioCardsProps> = ({ onCommand }) => {
  const isTilted = useMissionStore((s) => s.isTilted);
  const isJammed = useMissionStore((s) => s.isJammed);
  const isSpoofed = useMissionStore((s) => s.isSpoofed);
  const isObservabilityVisible = useMissionStore((s) => s.isObservabilityVisible);
  const selectedRoute = useMissionStore((s) => s.selectedRoute);
  const setSelectedRoute = useMissionStore((s) => s.setSelectedRoute);

  const toggleTilt = useMissionStore((s) => s.toggleTilt);
  const toggleJamming = useMissionStore((s) => s.toggleJamming);
  const toggleSpoofing = useMissionStore((s) => s.toggleSpoofing);
  const toggleObservability = useMissionStore((s) => s.toggleObservability);

  const handleTilt = () => {
    toggleTilt();
    onCommand({ action: 'toggle_mount' });
  };

  const handleJamming = () => {
    toggleJamming();
    onCommand({ action: 'toggle_jamming' });
  };

  const handleSpoofing = () => {
    toggleSpoofing();
    onCommand({ action: 'toggle_spoof' });
  };

  const handleRouteChange = (routeId: string) => {
    setSelectedRoute(routeId);
    onCommand({ action: 'select_route', route_id: routeId });
  };

  const isSimulated = selectedRoute === 'iovnbd_car' || selectedRoute === 'fog_200hz';

  return (
    <div className="w-84 space-y-2.5">
      <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span>Fault Injection & Sensors</span>
        {isSimulated && (
          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-500/30">
            SIMULATED
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* Card 1: 30° Mount Shift */}
        <SpotlightCard className="p-3 bg-[#0e121b]/90 border-white/[0.08]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="rounded-lg bg-slate-800/80 p-2 text-slate-300 border border-white/5">
                <Smartphone className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">Phone Mount Shift (30°)</div>
                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Simulates mount slip. CUSUM detects changepoint in 120 ms.
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex justify-end">
            <button
              onClick={handleTilt}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                isTilted
                  ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                  : 'border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isTilted ? 'Reset Mount (0°)' : 'Inject 30° Slip'}
            </button>
          </div>
        </SpotlightCard>

        {/* Card 2: Jamming Burst */}
        <SpotlightCard className="p-3 bg-[#0e121b]/90 border-white/[0.08]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="rounded-lg bg-slate-800/80 p-2 text-slate-300 border border-white/5">
                <Radio className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">GNSS Jamming Burst</div>
                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Spikes innovation NIS &gt; χ² 99% CI to trigger filter gating.
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex justify-end">
            <button
              onClick={handleJamming}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                isJammed
                  ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                  : 'border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isJammed ? 'Clear Jamming' : 'Inject Jamming'}
            </button>
          </div>
        </SpotlightCard>

        {/* Card 3: CUSUM Spoofing */}
        <SpotlightCard className="p-3 bg-[#0e121b]/90 border-white/[0.08]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="rounded-lg bg-slate-800/80 p-2 text-slate-300 border border-white/5">
                <Zap className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">CUSUM Spoofing Attack</div>
                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Creeping Doppler drift injection. Requires hold to simulate hostile fault.
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex justify-end">
            <HoldButton
              label="Hold to Inject Spoofing"
              activeLabel="Clear Spoofing"
              isActive={isSpoofed}
              onConfirm={handleSpoofing}
            />
          </div>
        </SpotlightCard>

        {/* Card 4: Sensor Profile Switcher */}
        <SpotlightCard className="p-3 bg-[#0e121b]/90 border-white/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs font-medium text-slate-200">Sensor Profile & Route</span>
          </div>
          <select
            value={selectedRoute}
            onChange={(e) => handleRouteChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none cursor-pointer"
          >
            <option value="chennai_varada">Chennai Varadarajapuram (Real Two-Wheeler)</option>
            <option value="chennai_highway">Chennai 45/46 Express (Real Highway)</option>
            <option value="iovnbd_car">IO-VNBD Car [SIMULATED]</option>
            <option value="fog_200hz">200 Hz Tactical FOG [SIMULATED]</option>
          </select>
        </SpotlightCard>

        {/* Card 5: N2 Observability Overlay Toggle */}
        <SpotlightCard className="p-3 bg-[#0e121b]/90 border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" />
              <div>
                <div className="text-xs font-medium text-slate-200">N2 Observability Map</div>
                <div className="text-[10px] text-slate-400">Road manifold Fisher Information</div>
              </div>
            </div>
            <button
              onClick={toggleObservability}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isObservabilityVisible
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800 text-slate-400 border border-white/10 hover:text-slate-200'
              }`}
            >
              {isObservabilityVisible ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};
