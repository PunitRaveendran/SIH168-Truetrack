import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useMissionStore } from '../../store/useMissionStore';
import { Search, Map, ShieldAlert, Award, Sparkles, Navigation, X } from 'lucide-react';

interface CommandPaletteProps {
  onCommand: (cmd: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onCommand }) => {
  const isOpen = useMissionStore((s) => s.isCommandPaletteOpen);
  const setOpen = useMissionStore((s) => s.setCommandPaletteOpen);
  const setSelectedRoute = useMissionStore((s) => s.setSelectedRoute);
  const toggleBlackout = useMissionStore((s) => s.toggleBlackout);
  const toggleTilt = useMissionStore((s) => s.toggleTilt);
  const toggleJamming = useMissionStore((s) => s.toggleJamming);
  const toggleJudgeMode = useMissionStore((s) => s.toggleJudgeMode);
  const setEvidenceOpen = useMissionStore((s) => s.setEvidenceOpen);
  const setContributionsOpen = useMissionStore((s) => s.setContributionsOpen);

  const [query, setQuery] = useState('');

  // Toggle with Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      } else if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const actions = [
    {
      category: 'Routes & Datasets',
      items: [
        { label: 'Chennai Varadarajapuram (Real Two-Wheeler)', icon: Map, action: () => { setSelectedRoute('chennai_varada'); onCommand({ action: 'select_route', route_id: 'chennai_varada' }); } },
        { label: 'Chennai 45/46 Express Highway (Real Two-Wheeler)', icon: Map, action: () => { setSelectedRoute('chennai_highway'); onCommand({ action: 'select_route', route_id: 'chennai_highway' }); } },
        { label: 'IO-VNBD Passenger Car (Coventry - SIMULATED)', icon: Map, action: () => { setSelectedRoute('iovnbd_car'); onCommand({ action: 'select_route', route_id: 'iovnbd_car' }); } },
        { label: '200 Hz Tactical FOG Stream (SIMULATED)', icon: Map, action: () => { setSelectedRoute('fog_200hz'); onCommand({ action: 'select_route', route_id: 'fog_200hz' }); } },
      ]
    },
    {
      category: 'Scenarios & Injections',
      items: [
        { label: 'Toggle GNSS Blackout (Dead Reckoning)', icon: ShieldAlert, action: () => { toggleBlackout(); onCommand({ action: 'toggle_blackout' }); } },
        { label: 'Rotate Phone Mount (30° Tilt CUSUM Test)', icon: Navigation, action: () => { toggleTilt(); onCommand({ action: 'toggle_mount' }); } },
        { label: 'Inject GNSS Jamming Burst (NIS Gating)', icon: ShieldAlert, action: () => { toggleJamming(); onCommand({ action: 'toggle_jamming' }); } },
      ]
    },
    {
      category: 'Presentation & Reports',
      items: [
        { label: 'Launch Judge Mode (90s Autopilot Tour)', icon: Award, action: () => toggleJudgeMode() },
        { label: 'View Empirical Evidence & Benchmark Table', icon: Award, action: () => setEvidenceOpen(true) },
        { label: 'View Novelty Contributions (N1, N2, N3)', icon: Sparkles, action: () => setContributionsOpen(true) },
      ]
    }
  ];

  const filtered = actions.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase())
    )
  })).filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-24">
      <GlassCard className="w-full max-w-xl border-white/15 bg-[#0e121b]/95 p-4 shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <Search className="h-4 w-4 text-sky-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command, route, or scenario..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1 text-xs">
          {filtered.map((group, gIdx) => (
            <div key={gIdx}>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.category}
              </div>
              <div className="space-y-1">
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={iIdx}
                      onClick={() => {
                        item.action();
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Icon className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
