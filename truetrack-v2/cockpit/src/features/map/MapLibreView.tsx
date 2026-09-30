import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMissionStore } from '../../store/useMissionStore';

export const MapLibreView: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerTTRef = useRef<maplibregl.Marker | null>(null);
  const markerB0Ref = useRef<maplibregl.Marker | null>(null);

  const telemetry = useMissionStore((s) => s.telemetry);
  const routeInit = useMissionStore((s) => s.routeInit);
  const isObservabilityVisible = useMissionStore((s) => s.isObservabilityVisible);
  const isBlackout = useMissionStore((s) => s.isBlackout || (telemetry?.is_blackout ?? false));

  const historyTTRef = useRef<[number, number][]>([]);
  const historyB0Ref = useRef<[number, number][]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // High-contrast, sleek aerospace dark style - NO grey overlay!
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-raster': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              'tiles/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#07090e' }
          },
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-raster',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              // High-contrast dark styling: bright road geometry, dark backdrop
              'raster-opacity': 0.72,
              'raster-brightness-max': 0.7,
              'raster-contrast': 0.35,
              'raster-saturation': -0.8
            }
          }
        ]
      },
      center: [80.0865, 13.0488], // Chennai origin
      zoom: 15.5,
      pitch: 35 // Subtle aerospace 3D perspective
    });

    mapRef.current = map;

    map.on('load', () => {
      // 1. Ground Truth Source & Line
      map.addSource('ground-truth', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.addLayer({
        id: 'layer-gt',
        type: 'line',
        source: 'ground-truth',
        paint: { 'line-color': '#475569', 'line-width': 3, 'line-opacity': 0.7 }
      });

      // 2. Covariance 3-sigma Ellipse
      map.addSource('cov-ellipse', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[]] } }
      });
      map.addLayer({
        id: 'layer-cov-fill',
        type: 'fill',
        source: 'cov-ellipse',
        paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.08 }
      });
      map.addLayer({
        id: 'layer-cov-line',
        type: 'line',
        source: 'cov-ellipse',
        paint: { 'line-color': '#38bdf8', 'line-width': 1.2, 'line-dasharray': [3, 2], 'line-opacity': 0.7 }
      });

      // 3. TrueTrack v2 Precision Vector Trail
      map.addSource('tt-track', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.addLayer({
        id: 'layer-tt-halo',
        type: 'line',
        source: 'tt-track',
        paint: { 'line-color': '#38bdf8', 'line-width': 5, 'line-opacity': 0.15 }
      });
      map.addLayer({
        id: 'layer-tt',
        type: 'line',
        source: 'tt-track',
        paint: { 'line-color': '#38bdf8', 'line-width': 2.5, 'line-opacity': 0.95 }
      });

      // 4. Baseline B0 Diverging Amber Trail
      map.addSource('b0-track', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.addLayer({
        id: 'layer-b0',
        type: 'line',
        source: 'b0-track',
        paint: { 'line-color': '#f59e0b', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.85 }
      });

      // Custom TrueTrack Puck Marker with Heading Direction Cone
      const elTT = document.createElement('div');
      elTT.className = 'relative flex items-center justify-center';
      elTT.innerHTML = `
        <div class="absolute -top-2.5 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-sky-400"></div>
        <div class="h-5 w-5 rounded-full bg-sky-400 border-2 border-slate-900 shadow-md flex items-center justify-center">
          <div class="h-1.5 w-1.5 rounded-full bg-slate-950"></div>
        </div>
      `;

      // Custom Baseline B0 Puck Marker
      const elB0 = document.createElement('div');
      elB0.innerHTML = `
        <div class="h-4 w-4 rounded-full border-2 border-amber-400 bg-amber-500/20"></div>
      `;

      markerTTRef.current = new maplibregl.Marker({ element: elTT }).setLngLat([80.0865, 13.0488]).addTo(map);
      markerB0Ref.current = new maplibregl.Marker({ element: elB0 }).setLngLat([80.0865, 13.0488]).addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Route Geometry
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !routeInit) return;

    const source = map.getSource('ground-truth') as maplibregl.GeoJSONSource;
    if (source && routeInit.gt_coords?.length) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeInit.gt_coords }
      });
      historyTTRef.current = [];
      historyB0Ref.current = [];
      map.flyTo({ center: routeInit.origin || routeInit.gt_coords[0], zoom: 15.5, duration: 1000 });
    }
  }, [routeInit]);

  // Update Live Telemetry Trail & Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !telemetry) return;

    const { tt_coord, b0_coord, heading, cov_major, cov_minor, step } = telemetry;

    // Update Puck Positions & Heading
    if (markerTTRef.current && tt_coord) {
      markerTTRef.current.setLngLat(tt_coord);
      markerTTRef.current.setRotation(heading || 0);
    }
    if (markerB0Ref.current && b0_coord) {
      markerB0Ref.current.setLngLat(b0_coord);
    }

    // Camera follow smoothly
    if (step % 8 === 0 && tt_coord) {
      map.panTo(tt_coord, { duration: 300 });
    }

    // Accumulate Trail Histories
    if (tt_coord && b0_coord) {
      historyTTRef.current.push(tt_coord);
      historyB0Ref.current.push(b0_coord);

      if (historyTTRef.current.length > 250) {
        historyTTRef.current.shift();
        historyB0Ref.current.shift();
      }

      const ttSrc = map.getSource('tt-track') as maplibregl.GeoJSONSource;
      if (ttSrc) {
        ttSrc.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: historyTTRef.current }
        });
      }

      const b0Src = map.getSource('b0-track') as maplibregl.GeoJSONSource;
      if (b0Src) {
        b0Src.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: historyB0Ref.current }
        });
      }
    }

    // Update 3-sigma Covariance Ellipse Polygon
    if (tt_coord) {
      const ellipsePolygon = computeEllipsePolygon(
        tt_coord[0],
        tt_coord[1],
        cov_major || 1.8,
        cov_minor || 0.9,
        heading || 0
      );

      const covSrc = map.getSource('cov-ellipse') as maplibregl.GeoJSONSource;
      if (covSrc) {
        covSrc.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [ellipsePolygon] }
        });
      }
    }
  }, [telemetry]);

  function computeEllipsePolygon(centerLng: number, centerLat: number, majorM: number, minorM: number, headingDeg: number) {
    const points = 24;
    const coords: [number, number][] = [];
    const radHeading = (headingDeg * Math.PI) / 180.0;
    const cosH = Math.cos(radHeading);
    const sinH = Math.sin(radHeading);

    const latMeters = 111132.95;
    const lngMeters = 111132.95 * Math.cos((centerLat * Math.PI) / 180.0);

    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * 2 * Math.PI;
      const x = (majorM * 2.0) * Math.cos(theta); // 3-sigma visual scale
      const y = (minorM * 2.0) * Math.sin(theta);

      const rotE = x * sinH + y * cosH;
      const rotN = x * cosH - y * sinH;

      const pLng = centerLng + rotE / lngMeters;
      const pLat = centerLat + rotN / latMeters;
      coords.push([pLng, pLat]);
    }
    return coords;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Full-Bleed Map Canvas */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Blackout Vignette Alert Overlay */}
      {isBlackout && (
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(245,158,11,0.18)] transition-all duration-700" />
      )}

      {/* Observability Map Legend Overlay */}
      {isObservabilityVisible && (
        <div className="pointer-events-none absolute top-20 right-6 rounded-lg border border-sky-500/30 bg-[#0e121b]/90 p-2.5 text-[11px] backdrop-blur-md">
          <div className="font-semibold text-sky-300">N2 Observability Metric I(e)</div>
          <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px]">
            <span className="h-2 w-5 rounded bg-emerald-400" /> High Curvature Reset
            <span className="h-2 w-5 rounded bg-amber-400 ml-2" /> Straightaway Tangent
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="pointer-events-none absolute bottom-24 left-6 flex items-center gap-4 rounded-lg border border-white/10 bg-[#0e121b]/90 px-3.5 py-1.5 text-[11px] font-medium text-slate-300 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span>TrueTrack v2 (ES-EKF + TCN)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-amber-400 bg-amber-500/40" />
          <span>Baseline B0 (Hold)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-sm bg-sky-400/20 border border-sky-400/40" />
          <span>3σ Covariance</span>
        </div>
      </div>
    </div>
  );
};
