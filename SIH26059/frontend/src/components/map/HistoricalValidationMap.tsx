import React, { useEffect, useRef } from 'react';
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  ScaleControl,
  type StyleSpecification,
  type GeoJSONSource
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Crosshair } from 'lucide-react';

interface HistoricalValidationMapProps {
  actualCoords: [number, number][];      // [[lat, lon], ...]
  predictedCoords: [number, number][];   // [[lat, lon], ...]
  safetyCoords: [number, number][];      // [[lat, lon], ...]
  currentReplayCoord?: [number, number]; // [lat, lon]
  showActual: boolean;
  showPredicted: boolean;
  showSafety: boolean;
  vesselName?: string;
  departureName?: string;
  destinationName?: string;
  progressiveRevealPercent?: number;     // 0 to 100 for progressive reveal animation
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';

const DARK_BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#030910' }
    },
    {
      id: 'carto-base',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

const getBaseStyle = (): StyleSpecification | string => {
  if (MAPTILER_API_KEY) {
    return `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_API_KEY}`;
  }
  return DARK_BASE_STYLE;
};

export const HistoricalValidationMap: React.FC<HistoricalValidationMapProps> = ({
  actualCoords,
  predictedCoords,
  safetyCoords,
  currentReplayCoord,
  showActual,
  showPredicted,
  showSafety,
  vesselName = 'Aurora Australis',
  departureName = 'Hobart Port',
  destinationName = 'Casey Station',
  progressiveRevealPercent,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const replayMarker = useRef<MapLibreMarker | null>(null);
  const depMarker = useRef<MapLibreMarker | null>(null);
  const destMarker = useRef<MapLibreMarker | null>(null);

  // Convert [[lat, lon], ...] to GeoJSON [[lon, lat], ...]
  const toLngLat = (coords: [number, number][]): [number, number][] => {
    return coords.map(([lat, lon]) => [lon, lat]);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const instance = new MapLibreMap({
      container: mapContainer.current,
      style: getBaseStyle(),
      center: [110.0, -60.0],
      zoom: 3.2,
      attributionControl: false,
    });

    instance.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    instance.on('load', () => {
      // 1. Add Antarctic Reference Parallels (-60S to -80S)
      const parallelsGeojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [-60, -65, -70, -75, -80].map((lat) => ({
          type: 'Feature',
          properties: { label: `${Math.abs(lat)}°S` },
          geometry: {
            type: 'LineString',
            coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]),
          },
        })),
      };

      instance.addSource('polar-parallels', {
        type: 'geojson',
        data: parallelsGeojson,
      });

      instance.addLayer({
        id: 'polar-parallels-lines',
        type: 'line',
        source: 'polar-parallels',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1,
          'line-dasharray': [3, 4],
          'line-opacity': 0.35,
        },
      });

      // 2. Add Sources for the 3 routes
      instance.addSource('route-actual-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: toLngLat(actualCoords),
          },
        },
      });

      instance.addSource('route-predicted-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: toLngLat(predictedCoords),
          },
        },
      });

      instance.addSource('route-safety-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: toLngLat(safetyCoords),
          },
        },
      });

      // Layer Route A: Actual AIS Track (Amber/Gold)
      instance.addLayer({
        id: 'route-actual-layer',
        type: 'line',
        source: 'route-actual-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: showActual ? 'visible' : 'none',
        },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.85,
        },
      });

      // Layer Route C: Safety-Optimized Corridor (Marine Blue)
      instance.addLayer({
        id: 'route-safety-layer',
        type: 'line',
        source: 'route-safety-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: showSafety ? 'visible' : 'none',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3.5,
          'line-dasharray': [4, 2],
          'line-opacity': 0.85,
        },
      });

      // Layer Route B: Predicted Balanced Corridor (Emerald Green)
      instance.addLayer({
        id: 'route-predicted-layer',
        type: 'line',
        source: 'route-predicted-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: showPredicted ? 'visible' : 'none',
        },
        paint: {
          'line-color': '#10b981',
          'line-width': 4,
          'line-opacity': 0.95,
        },
      });

      // Fit bounds if coords exist
      if (actualCoords.length > 0 || predictedCoords.length > 0) {
        const all = [...actualCoords, ...predictedCoords];
        const minLat = Math.min(...all.map((c) => c[0]));
        const maxLat = Math.max(...all.map((c) => c[0]));
        const minLon = Math.min(...all.map((c) => c[1]));
        const maxLon = Math.max(...all.map((c) => c[1]));
        instance.fitBounds([[minLon - 5, minLat - 3], [maxLon + 5, maxLat + 3]], { padding: 40 });
      }
    });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  // Update Route Geometries
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    let effActual = actualCoords;
    let effPredicted = predictedCoords;
    if (progressiveRevealPercent !== undefined && progressiveRevealPercent >= 0 && progressiveRevealPercent <= 100) {
      const actCount = Math.max(2, Math.floor((actualCoords.length * progressiveRevealPercent) / 100));
      const predCount = Math.max(2, Math.floor((predictedCoords.length * progressiveRevealPercent) / 100));
      effActual = actualCoords.slice(0, actCount);
      effPredicted = predictedCoords.slice(0, predCount);
    }

    const sAct = map.current.getSource('route-actual-source') as GeoJSONSource;
    if (sAct) {
      sAct.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: toLngLat(effActual) },
      });
    }

    const sPred = map.current.getSource('route-predicted-source') as GeoJSONSource;
    if (sPred) {
      sPred.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: toLngLat(effPredicted) },
      });
    }

    const sSafe = map.current.getSource('route-safety-source') as GeoJSONSource;
    if (sSafe) {
      sSafe.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: toLngLat(safetyCoords) },
      });
    }
  }, [actualCoords, predictedCoords, safetyCoords, progressiveRevealPercent]);

  // Update Layer Visibilities
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    map.current.setLayoutProperty('route-actual-layer', 'visibility', showActual ? 'visible' : 'none');
    map.current.setLayoutProperty('route-predicted-layer', 'visibility', showPredicted ? 'visible' : 'none');
    map.current.setLayoutProperty('route-safety-layer', 'visibility', showSafety ? 'visible' : 'none');
  }, [showActual, showPredicted, showSafety]);

  // Update Departure & Destination Markers
  useEffect(() => {
    if (!map.current) return;

    if (depMarker.current) depMarker.current.remove();
    if (destMarker.current) destMarker.current.remove();

    if (actualCoords.length > 0) {
      const depEl = document.createElement('div');
      depEl.className = 'w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-lg cursor-pointer';
      depEl.title = `Departure: ${departureName}`;
      depMarker.current = new MapLibreMarker({ element: depEl })
        .setLngLat([actualCoords[0][1], actualCoords[0][0]])
        .addTo(map.current);

      const destEl = document.createElement('div');
      destEl.className = 'w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-lg cursor-pointer';
      destEl.title = `Destination: ${destinationName}`;
      destMarker.current = new MapLibreMarker({ element: destEl })
        .setLngLat([actualCoords[actualCoords.length - 1][1], actualCoords[actualCoords.length - 1][0]])
        .addTo(map.current);
    }
  }, [actualCoords, departureName, destinationName]);

  // Update Replay Vessel Marker
  useEffect(() => {
    if (!map.current) return;
    if (replayMarker.current) replayMarker.current.remove();

    if (currentReplayCoord) {
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center';
      el.innerHTML = `
        <div class="w-5 h-5 rounded-full bg-cyan-400 border-2 border-white animate-pulse shadow-cyan-400/50 shadow-md"></div>
        <div class="absolute -top-6 text-[10px] font-mono bg-black/80 px-1 py-0.5 rounded text-cyan-300 whitespace-nowrap">${vesselName} (Replay)</div>
      `;
      replayMarker.current = new MapLibreMarker({ element: el })
        .setLngLat([currentReplayCoord[1], currentReplayCoord[0]])
        .addTo(map.current);
    }
  }, [currentReplayCoord, vesselName]);

  return (
    <div className="relative w-full h-full bg-[#030910] overflow-hidden border border-slate-800/60 rounded-md">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Coordinate & Reference HUD */}
      <div className="absolute top-3 left-3 bg-[#0a1526]/90 backdrop-blur-sm border border-slate-700/50 rounded px-3 py-1.5 font-mono text-[11px] text-slate-300 z-10 flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Compass className="w-3.5 h-3.5" />
          <span>POLAR STEREOGRAPHIC (EPSG:3031 / WGS84)</span>
        </div>
        <div className="text-slate-500">|</div>
        <div>ANTARCTIC HIGH-LATITUDE NAVIGATION CORRIDOR</div>
      </div>

      {/* Recenter Button */}
      <button
        onClick={() => {
          if (!map.current) return;
          const all = [...actualCoords, ...predictedCoords];
          if (all.length > 0) {
            const minLat = Math.min(...all.map((c) => c[0]));
            const maxLat = Math.max(...all.map((c) => c[0]));
            const minLon = Math.min(...all.map((c) => c[1]));
            const maxLon = Math.max(...all.map((c) => c[1]));
            map.current.fitBounds([[minLon - 5, minLat - 3], [maxLon + 5, maxLat + 3]], { padding: 40 });
          }
        }}
        className="absolute top-3 right-3 bg-[#0a1526]/90 hover:bg-[#112240] text-slate-200 border border-slate-700/50 rounded px-2.5 py-1.5 font-mono text-xs z-10 flex items-center gap-1.5 transition-colors"
        title="Recenter corridor view"
      >
        <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
        <span>FIT EXTENTS</span>
      </button>
    </div>
  );
};
