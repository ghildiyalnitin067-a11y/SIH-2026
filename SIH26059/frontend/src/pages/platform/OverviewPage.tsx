import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Ship, 
  Snowflake,
  Mountain,
  CheckCircle2, 
  ArrowRight,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useApiData } from "../../hooks/useApiData";
import PolarMap from '../../components/map/PolarMap';
import { useFleet } from '../../context/FleetContext';
import { cn } from '../../utils/cn';

export const OverviewPage: React.FC = () => {
  const [layers, setLayers] = useState({
    vessel: true,
    route: true,
    seaIce: true,
    icebergs: true,
    historicalVessels: false,
  });
  useApiData();

  const {
    fleet,
    selectedVesselId,
    selectedVessel,
    setSelectedVesselId,
    stations,
    selectedDestinationId,
    selectedDestination,
    setSelectedDestinationId,
    routes,
    activeRouteId,
    setActiveRouteId,
    activeRoute,
    selectedIcebergId,
    setSelectedIcebergId,
    selectedHorizon,
    setSelectedHorizon,
    activeHorizonLabel
  } = useFleet();

  const currentRoute = activeRoute || routes[0] || {
    id: 'route-b',
    name: 'ROUTE B (OPTIMAL)',
    distance: 4120,
    eta: '32h 05m',
    rioScore: '+8.4'
  };

  const horizonOptions: { hours: 0 | 6 | 12 | 24 | 48; label: 'NOW' | '+6H' | '+12H' | '+24H' | '+48H' }[] = [
    { hours: 0, label: 'NOW' },
    { hours: 6, label: '+6H' },
    { hours: 12, label: '+12H' },
    { hours: 24, label: '+24H' },
    { hours: 48, label: '+48H' },
  ];

  return (
    <AppShell
      title="OVERVIEW"
      subtitle="Antarctic operational summary and regional situational awareness"
      actions={
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Horizon Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xs p-0.5">
            {horizonOptions.map((h) => (
              <button
                key={h.hours}
                type="button"
                onClick={() => setSelectedHorizon(h.hours)}
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[10px] font-mono transition-colors cursor-pointer",
                  selectedHorizon === h.hours
                    ? "bg-slate-800 text-sky-300 font-bold border border-slate-700"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400 text-[10px]">STATUS:</span>
            <span className="text-slate-100 font-semibold text-[11px]">OPERATIONAL</span>
          </div>

          <Link
            to="/navigation"
            className="flex items-center gap-1.5 bg-[#12283e] hover:bg-[#1a3856] text-sky-300 border border-[#214972] px-3 py-1 rounded-xs text-xs font-mono font-bold tracking-wider uppercase transition-colors"
          >
            <span>Live Navigation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      }
    >
      <div className="h-full overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-5 space-y-3 bg-[#040B14] text-slate-200">
        
        {/* ========================================================================= */}
        {/* 1. OPERATIONAL STATUS — 4 CLEAN CARDS                                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
          
          {/* Card 1: Sea Ice */}
          <div className="bg-[#06111e] border border-slate-800 p-3 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 uppercase font-bold text-slate-300">
                  <Snowflake className="w-3.5 h-3.5 text-sky-400" />
                  Sea Ice
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-slate-900 text-slate-300 border border-slate-800">
                  NOAA CDR
                </span>
              </div>
              <div className="text-lg font-bold text-slate-100 mt-1">
                64.2% <span className="text-xs font-normal text-slate-400">Mean SIC</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Marginal Ice Zone / Pack corridor with 0.31 m/s drift.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>Thickness: 0.8 - 1.4 m</span>
              <span className="text-emerald-400">Passable</span>
            </div>
          </div>

          {/* Card 2: Iceberg Alerts */}
          <div className="bg-[#06111e] border border-slate-800 p-3 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 uppercase font-bold text-slate-300">
                  <Mountain className="w-3.5 h-3.5 text-sky-400" />
                  Iceberg Alerts
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-amber-950/40 text-amber-300 border border-amber-800">
                  2 CAUTION
                </span>
              </div>
              <div className="text-lg font-bold text-slate-100 mt-1">
                85 <span className="text-xs font-normal text-slate-400">Tracked Targets</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                2 charted bergs within 18 km corridor CPA buffer.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>Source: US NIC + S1 SAR</span>
              <span className="text-amber-400">Monitored</span>
            </div>
          </div>

          {/* Card 3: Route Risk */}
          <div className="bg-[#06111e] border border-slate-800 p-3 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 uppercase font-bold text-slate-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                  Route Risk
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-emerald-950/40 text-emerald-300 border border-emerald-800">
                  SAFE
                </span>
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                RIO {currentRoute.rioScore || '+8.4'}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                IMO POLARIS compliant for {selectedVessel.polar_class ? selectedVessel.polar_class.split(' ')[0] : 'PC5'} ice class.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>Active: {currentRoute.name?.split(' ')[0] || 'Route B'}</span>
              <span className="text-slate-300">{currentRoute.distance} km</span>
            </div>
          </div>

          {/* Card 4: Vessel Status */}
          <div className="bg-[#06111e] border border-slate-800 p-3 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1.5 uppercase font-bold text-slate-300">
                  <Ship className="w-3.5 h-3.5 text-sky-400" />
                  Vessel Status
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-slate-900 text-slate-300 border border-slate-800">
                  {selectedVessel.data_status === 'LIVE' ? 'LIVE AIS' : 'SIMULATION'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-100 truncate mt-1">
                {selectedVessel.name}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {Math.abs(selectedVessel.latitude || 0).toFixed(2)}°S, {Math.abs(selectedVessel.longitude || 0).toFixed(2)}°{(selectedVessel.longitude || 0) >= 0 ? 'E' : 'W'}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>Speed: {selectedVessel.speed || selectedVessel.sog || 12.0} kn</span>
              <span className="text-slate-300">Hdg: {selectedVessel.heading || 180}°T</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. OPERATIONAL MAP / REGIONAL OVERVIEW                                   */}
        {/* ========================================================================= */}
        <div className="bg-[#06111e] border border-slate-800 rounded-xs overflow-hidden flex flex-col">
          {/* Map Sub-Header & Controls */}
          <div className="px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-100 font-bold tracking-wider uppercase">Regional Operational Map</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-[11px]">Queen Maud Land to Bharati Station Corridor</span>
            </div>

            {/* Quick Map Layer Toggles */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase">Layers:</span>
              <button
                type="button"
                onClick={() => setLayers(l => ({ ...l, seaIce: !l.seaIce }))}
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[10px] font-mono border transition-colors cursor-pointer",
                  layers.seaIce ? "bg-[#12283e] text-sky-300 border-[#214972] font-semibold" : "text-slate-400 border-slate-800 hover:text-white"
                )}
              >
                Sea Ice
              </button>
              <button
                type="button"
                onClick={() => setLayers(l => ({ ...l, icebergs: !l.icebergs }))}
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[10px] font-mono border transition-colors cursor-pointer",
                  layers.icebergs ? "bg-[#12283e] text-sky-300 border-[#214972] font-semibold" : "text-slate-400 border-slate-800 hover:text-white"
                )}
              >
                85 Icebergs
              </button>
              <button
                type="button"
                onClick={() => setLayers(l => ({ ...l, route: !l.route }))}
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[10px] font-mono border transition-colors cursor-pointer",
                  layers.route ? "bg-[#12283e] text-sky-300 border-[#214972] font-semibold" : "text-slate-400 border-slate-800 hover:text-white"
                )}
              >
                Corridor
              </button>
            </div>
          </div>

          {/* Map Viewport */}
          <div className="relative w-full h-[460px] lg:h-[520px] bg-[#040B14]">
            <PolarMap
              section="overview"
              activeHorizon={activeHorizonLabel}
              selectedIcebergId={selectedIcebergId}
              onSelectIceberg={(id) => setSelectedIcebergId(id)}
              selectedVesselId={selectedVesselId}
              onSelectVessel={(id) => setSelectedVesselId(id)}
              destinationMarker={{
                latitude: selectedDestination.latitude,
                longitude: selectedDestination.longitude,
                name: selectedDestination.name
              }}
              vesselInfo={
                selectedVessel.latitude !== undefined && selectedVessel.longitude !== undefined
                  ? {
                      name: selectedVessel.name,
                      latitude: selectedVessel.latitude,
                      longitude: selectedVessel.longitude,
                      speed: selectedVessel.speed,
                      heading: selectedVessel.heading
                    }
                  : null
              }
              allRoutes={routes}
              showVessel={layers.vessel}
              showRoute={layers.route}
              showSeaIce={layers.seaIce}
              showIcebergs={layers.icebergs}
              showRouteOptimization={true}
              activeRouteId={activeRouteId}
              onSelectRoute={(rId) => setActiveRouteId(rId)}
              showHistoricalVessels={layers.historicalVessels}
            />
          </div>

          {/* Quick Mission Selector Strip */}
          <div className="px-3 sm:px-4 py-2 bg-slate-950/80 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">Vessel</span>
              <select
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xs px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-slate-700 cursor-pointer"
              >
                {fleet.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.flag} {v.name} ({v.speed || v.sog} kn)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">Destination</span>
              <select
                value={selectedDestinationId}
                onChange={(e) => setSelectedDestinationId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xs px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-slate-700 cursor-pointer"
              >
                {stations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({Math.abs(s.latitude).toFixed(1)}°S)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">Selected Corridor</span>
              <div className="text-xs text-slate-100 font-semibold py-1">
                {currentRoute.name || 'Route B (Optimal)'} ({currentRoute.distance} km)
              </div>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">POLARIS Evaluation</span>
              <div className="text-xs text-emerald-400 font-semibold py-1">
                RIO {currentRoute.rioScore || '+8.4'} · Safe to Navigate
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. OPERATIONAL LOGS & SYSTEM STATUS — 3 CLEAN PANELS                      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono text-xs">
          
          {/* Panel 1: Recent Alerts */}
          <div className="bg-[#06111e] border border-slate-800 rounded-xs p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Recent Alerts
                </span>
                <span className="text-[10px] text-slate-400">2 Unacknowledged</span>
              </div>
              <div className="space-y-1.5">
                <div className="p-2 bg-slate-950 border border-amber-600/40 rounded-xs">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-amber-300 font-bold">CAUTION · ICEBERG PROXIMITY</span>
                    <span className="text-slate-400">14:12 UTC</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1 font-sans">
                    Tracked berg A-84C drifted within 14.8 km of corridor waypoint 04. CPA clearance confirmed safe.
                  </p>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 font-bold">INFO · SEA ICE THICKNESS</span>
                    <span className="text-slate-400">13:45 UTC</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1 font-sans">
                    Marginal Ice Zone concentration updated to 64% via latest NOAA CDR pass.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/alerts"
              className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-sky-400 hover:text-white flex items-center justify-between transition-colors"
            >
              <span>View all operational alerts</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Panel 2: Recent Events */}
          <div className="bg-[#06111e] border border-slate-800 rounded-xs p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  Recent Events
                </span>
                <span className="text-[10px] text-slate-400">Chronological</span>
              </div>
              <div className="space-y-1.5">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 font-semibold">WAYPOINT TRANSIT</span>
                    <span className="text-slate-400">14:20 UTC</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5 font-sans">
                    {selectedVessel.name} cleared Waypoint 03 (64.2°S, 38.4°E) at 12.4 kn SOG.
                  </p>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xs">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300 font-semibold">SAR RADAR INGESTION</span>
                    <span className="text-slate-400">12:00 UTC</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5 font-sans">
                    Sentinel-1 GeoTIFF scene processed with 6 verified CFAR detections.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/intelligence"
              className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-sky-400 hover:text-white flex items-center justify-between transition-colors"
            >
              <span>View intelligence logs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Panel 3: System Status & Data Integrity */}
          <div className="bg-[#06111e] border border-slate-800 rounded-xs p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  System Status
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">ALL SERVICES HEALTHY</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between items-center p-1.5 bg-slate-950 border border-slate-800 rounded-xs">
                  <span className="text-slate-300">NOAA CDR Sea Ice Grid:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ONLINE (25 km)
                  </span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-slate-950 border border-slate-800 rounded-xs">
                  <span className="text-slate-300">US NIC 85 Iceberg Dataset:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    SYNCHRONIZED
                  </span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-slate-950 border border-slate-800 rounded-xs">
                  <span className="text-slate-300">Sentinel-1 SAR Planetary:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ACTIVE C-BAND
                  </span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-slate-950 border border-slate-800 rounded-xs">
                  <span className="text-slate-300">IMO POLARIS Risk Engine:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    PC5 CALIBRATED
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
              <span>FastAPI Backend: 8000</span>
              <span>Vite Frontend: 3000</span>
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
};

export default OverviewPage;
