import { create } from 'zustand';
import { TelemetryPacket, RouteInitPacket } from '../data/adapter';

export interface EngineEvent {
  id: string;
  timeStr: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

interface MissionState {
  // Navigation & Screen View
  screen: 'intro' | 'cockpit' | 'mobile';
  isJudgeMode: boolean;
  judgeStep: number;
  isEvidenceOpen: boolean;
  isContributionsOpen: boolean;
  isCommandPaletteOpen: boolean;
  isEventStreamCollapsed: boolean;

  // Telemetry Engine State
  isLiveConnected: boolean;
  isMockMode: boolean;
  isPlaying: boolean;
  playbackSpeed: 1 | 2 | 4 | 8;
  selectedRoute: string;

  // Active Scenarios
  isBlackout: boolean;
  isTilted: boolean;
  isJammed: boolean;
  isSpoofed: boolean;
  isObservabilityVisible: boolean;

  // Incoming Packets
  telemetry: TelemetryPacket | null;
  routeInit: RouteInitPacket | null;

  // Real Engine Event Stream (Manus-style)
  eventLogs: EngineEvent[];

  // Actions
  setScreen: (screen: 'intro' | 'cockpit' | 'mobile') => void;
  toggleJudgeMode: () => void;
  setJudgeStep: (step: number) => void;
  setEvidenceOpen: (open: boolean) => void;
  setContributionsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleEventStream: () => void;

  setLiveConnected: (connected: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: 1 | 2 | 4 | 8) => void;
  setSelectedRoute: (routeId: string) => void;

  toggleBlackout: () => void;
  toggleTilt: () => void;
  toggleJamming: () => void;
  toggleSpoofing: () => void;
  toggleObservability: () => void;

  setTelemetry: (packet: TelemetryPacket) => void;
  setRouteInit: (init: RouteInitPacket) => void;
  addEvent: (event: Omit<EngineEvent, 'id'>) => void;
}

// Detect ?mock=1 in URL
const isMockURL = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === '1';

export const useMissionStore = create<MissionState>((set, get) => ({
  screen: 'intro',
  isJudgeMode: false,
  judgeStep: 0,
  isEvidenceOpen: false,
  isContributionsOpen: false,
  isCommandPaletteOpen: false,
  isEventStreamCollapsed: false,

  isLiveConnected: false,
  isMockMode: isMockURL,
  isPlaying: true,
  playbackSpeed: 1,
  selectedRoute: 'chennai_varada',

  isBlackout: false,
  isTilted: false,
  isJammed: false,
  isSpoofed: false,
  isObservabilityVisible: false,

  telemetry: null,
  routeInit: null,
  eventLogs: [
    {
      id: 'init-1',
      timeStr: '00:00',
      title: 'Mission Control Initialized',
      description: 'Connected to TrueTrack v2 high-rate ES-EKF estimator pipeline.',
      type: 'info'
    }
  ],

  setScreen: (screen) => set({ screen }),
  toggleJudgeMode: () => set((s) => ({ isJudgeMode: !s.isJudgeMode, judgeStep: 0 })),
  setJudgeStep: (judgeStep) => set({ judgeStep }),
  setEvidenceOpen: (isEvidenceOpen) => set({ isEvidenceOpen }),
  setContributionsOpen: (isContributionsOpen) => set({ isContributionsOpen }),
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  toggleEventStream: () => set((s) => ({ isEventStreamCollapsed: !s.isEventStreamCollapsed })),

  setLiveConnected: (isLiveConnected) => set({ isLiveConnected }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),

  toggleBlackout: () => {
    const next = !get().isBlackout;
    set({ isBlackout: next });
    get().addEvent({
      timeStr: get().telemetry?.time_str || '00:00',
      title: next ? 'GNSS Blackout Triggered' : 'GNSS Lock Restored',
      description: next
        ? 'GNSS measurement innovation severed. Switching 100% to Neural TCN + NHC Dead Reckoning.'
        : 'Carrier-phase GNSS lock reacquired. Triggering RTS fixed-lag trajectory smoothing.',
      type: next ? 'danger' : 'success'
    });
  },

  toggleTilt: () => {
    const next = !get().isTilted;
    set({ isTilted: next });
    get().addEvent({
      timeStr: get().telemetry?.time_str || '00:00',
      title: next ? 'Phone Mount Shift (30° Tilt)' : 'Phone Re-Leveled',
      description: next
        ? 'CUSUM gravity vector changepoint triggered (120 ms). Attitude covariance reset; continuous alignment active.'
        : 'Mount leveled. Accelerometer low-pass aligns with vehicle gravity axis.',
      type: 'warning'
    });
  },

  toggleJamming: () => {
    const next = !get().isJammed;
    set({ isJammed: next });
    get().addEvent({
      timeStr: get().telemetry?.time_str || '00:00',
      title: next ? 'GNSS Jamming Injected' : 'Jamming Cleared',
      description: next
        ? 'Normalized Innovation Squared (NIS = 28.5) exceeds chi-square 99% CI threshold. Fault gated.'
        : 'Measurement noise returns to normal sensor covariance bounds.',
      type: next ? 'warning' : 'info'
    });
  },

  toggleSpoofing: () => {
    const next = !get().isSpoofed;
    set({ isSpoofed: next });
    get().addEvent({
      timeStr: get().telemetry?.time_str || '00:00',
      title: next ? 'CUSUM Spoofing Drift Detected' : 'Spoofing Attack Terminated',
      description: next
        ? 'Subtle velocity divergence accumulator reached score 38.2 (threshold 15.0). Spoofed updates discarded.'
        : 'Integrity monitor resumed nominal Doppler tracking.',
      type: next ? 'danger' : 'info'
    });
  },

  toggleObservability: () => set((s) => ({ isObservabilityVisible: !s.isObservabilityVisible })),

  setTelemetry: (telemetry) => set({ telemetry }),
  setRouteInit: (routeInit) => set({ routeInit }),

  addEvent: (event) =>
    set((state) => ({
      eventLogs: [
        {
          ...event,
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
        },
        ...state.eventLogs.slice(0, 49) // Keep last 50 events
      ]
    }))
}));
