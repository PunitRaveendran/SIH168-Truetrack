/**
 * Typed Telemetry Adapter & WebSocket Bridge for TrueTrack v2 Mission Control.
 * Connects to ws://localhost:8765, serializes engine state, and handles fallback gracefully.
 */

export interface TelemetryPacket {
  type: 'telemetry';
  step: number;
  total_steps: number;
  time_str: string;
  speed: number;
  heading: number;
  gt_coord: [number, number];
  tt_coord: [number, number];
  b0_coord: [number, number];
  tt_drift: number;
  tt_pct: number;
  b0_drift: number;
  b0_pct: number;
  along_track: number;
  cross_track: number;
  div_ratio: number;
  cov_major: number;
  cov_minor: number;
  nis: number;
  status_text: string;
  is_blackout: boolean;
  is_tilted: boolean;
  is_jammed: boolean;
  is_spoofed: boolean;
  budget_pct: number;
  obs_grade: string;
  drift_budget: string;
  is_live_backend: boolean;
}

export interface RouteInitPacket {
  type: 'route_init';
  route_id: string;
  name: string;
  origin: [number, number];
  gt_coords: [number, number][];
  total_frames: number;
}

export type EnginePacket = TelemetryPacket | RouteInitPacket;

export type EngineCommand =
  | { action: 'play' }
  | { action: 'pause' }
  | { action: 'reset' }
  | { action: 'select_route'; route_id: string }
  | { action: 'set_speed'; speed: number }
  | { action: 'seek'; step: number }
  | { action: 'toggle_blackout' }
  | { action: 'toggle_mount' }
  | { action: 'toggle_jamming' }
  | { action: 'toggle_spoof' };

export class TelemetryBridge {
  private ws: WebSocket | null = null;
  private url: string;
  private onPacketCallback: ((packet: EnginePacket) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;
  private reconnectTimer: any = null;
  private isConnected = false;

  constructor(url = 'ws://localhost:8765') {
    this.url = url;
  }

  public connect(
    onPacket: (packet: EnginePacket) => void,
    onConnection: (connected: boolean) => void
  ) {
    this.onPacketCallback = onPacket;
    this.onConnectionChange = onConnection;
    this.initSocket();
  }

  private initSocket() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as EnginePacket;
          this.onPacketCallback?.(data);
        } catch (e) {
          console.error('[Bridge] Failed to parse engine packet', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onConnectionChange?.(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.onConnectionChange?.(false);
      };
    } catch (err) {
      this.isConnected = false;
      this.onConnectionChange?.(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initSocket();
    }, 2000);
  }

  public send(cmd: EngineCommand) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
