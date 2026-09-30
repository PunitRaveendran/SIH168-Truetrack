import React, { useEffect, useRef } from 'react';
import { useMissionStore } from './store/useMissionStore';
import { TelemetryBridge, EngineCommand } from './data/adapter';
import { IntroScreen } from './features/intro/IntroScreen';
import { MapLibreView } from './features/map/MapLibreView';
import { LiveTelemetryPanel } from './features/live/LiveTelemetryPanel';
import { ComparisonCard } from './features/compare/ComparisonCard';
import { TimelineDock } from './features/timeline/TimelineDock';
import { ScenarioCards } from './features/scenarios/ScenarioCards';
import { EventStream } from './features/events/EventStream';
import { StatePill } from './components/ui/StatePill';
import { CommandPalette } from './features/command/CommandPalette';
import { EvidenceModal } from './features/evidence/EvidenceModal';
import { ContributionsPanel } from './features/contributions/ContributionsPanel';
import { JudgeMode } from './features/judge/JudgeMode';
import { MobileNavView } from './features/mobile/MobileNavView';
import { Compass, Command, Award, Sparkles, Smartphone } from 'lucide-react';

export const App: React.FC = () => {
  const screen = useMissionStore((s) => s.screen);
  const setScreen = useMissionStore((s) => s.setScreen);
  const setLiveConnected = useMissionStore((s) => s.setLiveConnected);
  const setTelemetry = useMissionStore((s) => s.setTelemetry);
  const setRouteInit = useMissionStore((s) => s.setRouteInit);
  const setCommandPaletteOpen = useMissionStore((s) => s.setCommandPaletteOpen);
  const setEvidenceOpen = useMissionStore((s) => s.setEvidenceOpen);
  const setContributionsOpen = useMissionStore((s) => s.setContributionsOpen);
  const toggleJudgeMode = useMissionStore((s) => s.toggleJudgeMode);
  const isJudgeMode = useMissionStore((s) => s.isJudgeMode);

  const bridgeRef = useRef<TelemetryBridge | null>(null);

  // Auto-detect mobile screen width or ?mobile query parameter
  useEffect(() => {
    if (window.innerWidth < 768 || window.location.search.includes('mobile')) {
      setScreen('mobile');
    }
  }, [setScreen]);

  // Initialize Telemetry Bridge
  useEffect(() => {
    const bridge = new TelemetryBridge('ws://localhost:8765');
    bridgeRef.current = bridge;

    bridge.connect(
      (packet) => {
        if (packet.type === 'route_init') {
          setRouteInit(packet);
        } else if (packet.type === 'telemetry') {
          setTelemetry(packet);
        }
      },
      (connected) => {
        setLiveConnected(connected);
      }
    );

    return () => {
      bridge.disconnect();
      bridgeRef.current = null;
    };
  }, [setLiveConnected, setTelemetry, setRouteInit]);

  const handleCommand = (cmd: EngineCommand) => {
    bridgeRef.current?.send(cmd);
  };

  if (screen === 'intro') {
    return <IntroScreen />;
  }

  if (screen === 'mobile') {
    return <MobileNavView onCommand={handleCommand} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100">
      {/* 1. Full-Bleed Map Canvas is the Hero */}
      <div className="absolute inset-0 z-0">
        <MapLibreView />
      </div>

      {/* 2. Top Mission Control Header Bar */}
      <header className="absolute top-0 inset-x-0 z-30 flex h-16 items-center justify-between px-6 pointer-events-none">
        {/* Left: Brand + Quick Palette */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0e121b]/90 px-3 py-1.5 backdrop-blur-md shadow-lg">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-sky-500 font-bold text-slate-950 text-xs">
              TT
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-sm">TrueTrack</span>
              <span className="ml-1 text-xs font-mono font-medium text-sky-400">v2</span>
            </div>
          </div>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0e121b]/80 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 hover:border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-md"
          >
            <Command className="h-3.5 w-3.5 text-slate-400" />
            <span>Search or Switch Route</span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">⌘K</kbd>
          </button>
        </div>

        {/* Center: Morphing State Pill */}
        <div className="pointer-events-auto">
          <StatePill />
        </div>

        {/* Right: Quick Action Modals (Mobile App, Judge Mode, Evidence, Novelty) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setScreen('mobile')}
            className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 backdrop-blur-md transition-all cursor-pointer shadow-md"
            title="Open Turn-by-Turn Mobile Driver Interface"
          >
            <Smartphone className="h-3.5 w-3.5 text-sky-400" />
            <span>Mobile App</span>
          </button>

          <button
            onClick={toggleJudgeMode}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border backdrop-blur-md transition-all cursor-pointer shadow-md ${
              isJudgeMode
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-[#0e121b]/80 text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-sky-400" />
            <span>Judge Mode</span>
          </button>

          <button
            onClick={() => setEvidenceOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0e121b]/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-md"
          >
            <Award className="h-3.5 w-3.5 text-emerald-400" />
            <span>PS Compliance</span>
          </button>

          <button
            onClick={() => setContributionsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0e121b]/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            <span>N1-N3 Novelty</span>
          </button>
        </div>
      </header>

      {/* 3. Floating Left Telemetry Panel */}
      <div className="absolute top-20 left-6 z-20 pointer-events-auto">
        <LiveTelemetryPanel />
      </div>

      {/* 4. Floating Right Panels (Comparison & Scenarios) */}
      <div className="absolute top-20 right-6 z-20 flex flex-col gap-3 pointer-events-auto max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
        <ComparisonCard />
        <ScenarioCards onCommand={handleCommand} />
      </div>

      {/* 5. Floating Bottom-Left Event Log Stream */}
      <div className="absolute bottom-22 left-6 z-20 pointer-events-auto">
        <EventStream />
      </div>

      {/* 6. Signature Bottom Timeline Dock */}
      <div className="absolute bottom-5 inset-x-0 z-30 px-6 pointer-events-none">
        <div className="pointer-events-auto">
          <TimelineDock onCommand={handleCommand} />
        </div>
      </div>

      {/* Modals & Overlays */}
      <CommandPalette onCommand={handleCommand} />
      <EvidenceModal />
      <ContributionsPanel />
      <JudgeMode onCommand={handleCommand} />
    </div>
  );
};
export default App;
