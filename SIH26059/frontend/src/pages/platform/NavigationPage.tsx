import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ship, Compass, ShieldAlert,
  Clock, CheckCircle2,
  Activity, Play, Pause, RotateCcw, Gauge,
  Download, RefreshCw
} from 'lucide-react';

import { AppShell } from '../../components/layout/AppShell';
import { useApiData } from '../../hooks/useApiData';
import { useFleet, haversineDistKm, computeBearingDeg } from '../../context/FleetContext';
import { api } from '../../services/api';
import { cn } from '../../utils/cn';
import PolarMap from '../../components/map/PolarMap';
import { TacticalHazardBanner } from '../../components/TacticalHazardBanner';
import {
  useSimulatedKinematics,
  haversineKm,
  type ScenarioType
} from '../../hooks/useSimulatedKinematics';

interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromStart: number;
  eta: string;
  status: 'passed' | 'active' | 'upcoming';
  iceRisk: string;
  reason?: string;
}

const PRESET_ORIGINS = [
  { name: 'Cape Town Port (South Africa)', lat: -33.92, lon: 18.42 },
  { name: 'Mormugao Port (India) / Southern Transit', lat: -54.20, lon: 68.40 },
  { name: 'Hobart Port (Australia)', lat: -42.88, lon: 147.33 },
  { name: 'Punta Arenas (Chile)', lat: -53.16, lon: -70.91 },
  { name: 'Stanley Gateway Port (Falklands)', lat: -51.70, lon: -57.85 },
  { name: 'Fremantle (Australia)', lat: -32.05, lon: 115.74 },
  { name: 'Lyttelton Port (New Zealand)', lat: -43.60, lon: 172.72 },
];

// Interpolate vessel progression strictly along active corridor polyline
function interpolatePositionAlongPath(
  path: [number, number][],
  targetDistKm: number
): {
  latitude: number;
  longitude: number;
  heading: number;
  totalDistKm: number;
  progressPct: number;
  remainingKm: number;
} {
  if (!path || path.length === 0) {
    return { latitude: -65.0, longitude: 70.0, heading: 180, totalDistKm: 1, progressPct: 0, remainingKm: 1 };
  }
  if (path.length === 1) {
    return { latitude: path[0][0], longitude: path[0][1], heading: 180, totalDistKm: 0, progressPct: 100, remainingKm: 0 };
  }

  const segDists: number[] = [];
  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = haversineDistKm(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
    segDists.push(d);
    totalDist += d;
  }
  totalDist = Math.max(totalDist, 0.001);

  const clampedDist = Math.max(0, Math.min(targetDistKm, totalDist));
  const progressPct = Math.min(100, Math.round((clampedDist / totalDist) * 100));
  const remainingKm = Math.round(Math.max(0, totalDist - clampedDist));

  if (clampedDist <= 0) {
    return {
      latitude: path[0][0],
      longitude: path[0][1],
      heading: computeBearingDeg(path[0], path[1]),
      totalDistKm: Math.round(totalDist),
      progressPct: 0,
      remainingKm: Math.round(totalDist)
    };
  }

  if (clampedDist >= totalDist) {
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    return {
      latitude: last[0],
      longitude: last[1],
      heading: computeBearingDeg(prev, last),
      totalDistKm: Math.round(totalDist),
      progressPct: 100,
      remainingKm: 0
    };
  }

  let accum = 0;
  for (let i = 0; i < segDists.length; i++) {
    const sLen = segDists[i];
    if (accum + sLen >= clampedDist || i === segDists.length - 1) {
      const rem = clampedDist - accum;
      const frac = sLen > 0 ? Math.max(0, Math.min(1, rem / sLen)) : 0;
      const pA = path[i];
      const pB = path[i + 1];
      const lat = pA[0] + frac * (pB[0] - pA[0]);
      const lon = pA[1] + frac * (pB[1] - pA[1]);
      const heading = computeBearingDeg(pA, pB);
      return {
        latitude: lat,
        longitude: lon,
        heading,
        totalDistKm: Math.round(totalDist),
        progressPct,
        remainingKm
      };
    }
    accum += sLen;
  }

  const last = path[path.length - 1];
  return {
    latitude: last[0],
    longitude: last[1],
    heading: 180,
    totalDistKm: Math.round(totalDist),
    progressPct: 100,
    remainingKm: 0
  };
}

// Generate realistic waypoints strictly along the active route line
const generateWaypointsForRoute = (routePath: [number, number][], routeType: string, _destName: string, speedKnots: number = 14.0): Waypoint[] => {
  if (!routePath || routePath.length <= 2) return [];
  
  const step = Math.max(1, Math.floor(routePath.length / 6));
  const selectedIdx = [0];
  for (let i = step; i < routePath.length - 1; i += step) {
    selectedIdx.push(i);
  }
  selectedIdx.push(routePath.length - 1);

  let cumDist = 0;
  const speed = Math.max(1, speedKnots);
  return selectedIdx.map((idx, i) => {
    const pt = routePath[idx];
    if (i > 0) {
      const prev = routePath[selectedIdx[i - 1]];
      cumDist += haversineKm(prev[0], prev[1], pt[0], pt[1]);
    }
    const isFirst = i === 0;
    const isLast = i === selectedIdx.length - 1;
    const wpNum = i;

    return {
      id: isFirst ? 'WP-ORIGIN' : isLast ? 'WP-BERTH' : `WP-${String(wpNum).padStart(2, '0')}`,
      name: isFirst ? 'VOYAGE DEPARTURE' : isLast ? 'STATION BERTH' : `CORRIDOR WAYPOINT ${wpNum}`,
      latitude: pt[0],
      longitude: pt[1],
      distanceFromStart: Math.round(cumDist),
      eta: isFirst ? '00:00' : `+${Math.round(cumDist / (speed * 1.852))}h`,
      status: isFirst ? 'passed' : i === 1 ? 'active' : 'upcoming',
      iceRisk: isFirst || isLast ? 'LOW' : routeType.includes('route-a') ? 'HIGH' : routeType.includes('route-c') ? 'LOW' : 'MODERATE',
      reason: isFirst ? 'Convoy departure point' : isLast ? 'Station approach' : 'Navigation turn point'
    };
  });
};

export const NavigationPage: React.FC = () => {
  useApiData();
  const {
    fleet,
    selectedVesselId,
    selectedVessel,
    setSelectedVesselId,
    selectedIcebergId,
    setSelectedIcebergId,
    selectedDestination,
    activeHorizonLabel,
    routes,
    activeRouteId,
    setActiveRouteId,
    activeRoute: contextActiveRoute,
    emergencyRerouteActive,
    triggerEmergencyHazard,
    recomputeRoutes,
    isComputingRoutes
  } = useFleet();

  // Simulation State (Phase 3 & 5)
  const [simRunning, setSimRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(5);
  const [simDistanceKm, setSimDistanceKm] = useState<number>(450); // Start with initial progress
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('NORMAL');
  const [isScenarioRerouting, setIsScenarioRerouting] = useState(false);

  // Raw BYU MERS / US NIC 85 Iceberg Records
  const [rawIcebergs, setRawIcebergs] = useState<any[]>([]);
  useEffect(() => {
    api.icebergs().then((res) => {
      if (res?.icebergs?.length) setRawIcebergs(res.icebergs);
    }).catch(() => {});
  }, []);

  const activeRoute = useMemo(() => {
    if (!routes || routes.length === 0) return contextActiveRoute || null;
    return routes.find(r => r.id === activeRouteId) ||
           routes.find(r => r.id?.includes(activeRouteId)) ||
           contextActiveRoute ||
           routes.find(r => r.recommended) ||
           routes[0] ||
           null;
  }, [routes, activeRouteId, contextActiveRoute]);

  const totalDistKm = useMemo(() => {
    return activeRoute?.distance || 3500;
  }, [activeRoute?.distance]);

  const cruisingSpeed = Math.round(selectedVessel?.speed || selectedVessel?.sog || 13.5);
  const polarClass = selectedVessel?.polar_class || 'PC5';

  // Active polyline corridor path
  const corridorPath = useMemo<[number, number][]>(() => {
    if (activeRoute?.path && activeRoute.path.length >= 2) {
      return activeRoute.path;
    }
    const startLat = selectedVessel?.latitude ?? -65.0;
    const startLon = selectedVessel?.longitude ?? 70.0;
    const endLat = selectedDestination?.latitude ?? -69.4;
    const endLon = selectedDestination?.longitude ?? 76.2;
    return [[startLat, startLon], [endLat, endLon]];
  }, [activeRoute?.path, selectedVessel?.latitude, selectedVessel?.longitude, selectedDestination?.latitude, selectedDestination?.longitude]);

  // Vessel position interpolated strictly along active corridor
  const simulatedVoyage = useMemo(() => {
    return interpolatePositionAlongPath(corridorPath, simDistanceKm);
  }, [corridorPath, simDistanceKm]);

  // Reusable Kinematics Hook (Simulated Physics, 85 Iceberg Drift, Climatic Load, Events)
  const {
    currentSimUtcStr,
    climaticConditions,
    vesselKinematics,
    dynamicIcebergs,
    nearestIceberg,
    events
  } = useSimulatedKinematics({
    simDistanceKm,
    totalDistanceKm: totalDistKm,
    cruisingSpeedKnots: cruisingSpeed,
    shipLat: simulatedVoyage.latitude,
    shipLon: simulatedVoyage.longitude,
    shipHeading: simulatedVoyage.heading,
    rawIcebergs,
    polarClass,
    routePath: corridorPath,
    activeScenario
  });

  // Active vessel telemetry object for PolarMap
  const activeVesselTelemetry = useMemo(() => {
    return {
      name: selectedVessel?.name || 'Vessel Telemetry',
      latitude: simulatedVoyage.latitude,
      longitude: simulatedVoyage.longitude,
      speed: vesselKinematics.sogKnots,
      heading: simulatedVoyage.heading
    };
  }, [selectedVessel?.name, simulatedVoyage.latitude, simulatedVoyage.longitude, simulatedVoyage.heading, vesselKinematics.sogKnots]);

  // Simulation ticker: advances smoothly at 4 Hz (250ms)
  useEffect(() => {
    if (!simRunning) return;

    const interval = setInterval(() => {
      setSimDistanceKm((prev) => {
        const speedKmh = vesselKinematics.sogKnots * 1.852;
        const stepKm = (speedKmh * 0.25 / 3600) * simSpeed;
        const total = totalDistKm || 3500;
        const next = prev + stepKm;
        return next >= total ? total : next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [simRunning, vesselKinematics.sogKnots, simSpeed, totalDistKm]);

  // Handle Scenario Selector (Phase 13: Judge Demonstration Mode)
  const handleSelectScenario = useCallback((scenario: ScenarioType) => {
    setActiveScenario(scenario);
    if (scenario === 'NORMAL') {
      setSimDistanceKm(totalDistKm * 0.18);
      setSimRunning(true);
      if (emergencyRerouteActive) {
        triggerEmergencyHazard(); // Toggle off
      }
    } else if (scenario === 'ICEBERG_ENCOUNTER') {
      setSimDistanceKm(totalDistKm * 0.48);
      setSimRunning(true);
      triggerEmergencyHazard(0.48);
    } else if (scenario === 'RADAR_OBSTACLE') {
      setSimDistanceKm(totalDistKm * 0.58);
      setSimRunning(true);
      triggerEmergencyHazard(0.58);
    } else if (scenario === 'HIGH_SEA_ICE') {
      setSimDistanceKm(totalDistKm * 0.72);
      setSimRunning(true);
    } else if (scenario === 'MULTI_HAZARD') {
      setSimDistanceKm(totalDistKm * 0.65);
      setSimRunning(true);
      triggerEmergencyHazard(0.65);
    }
  }, [totalDistKm, emergencyRerouteActive, triggerEmergencyHazard]);

  // Handle Tactical Reroute switch (Phase 9: Automatic Rerouting)
  const handleAcceptReroute = useCallback(async () => {
    setIsScenarioRerouting(true);
    try {
      // Find safest route or tactical detour
      const safest = routes.find(r => r.id.includes('route-c') || r.optimization_mode === 'SAFEST') || routes[1] || routes[0];
      if (safest && safest.id !== activeRouteId) {
        setActiveRouteId(safest.id);
      }
    } finally {
      setIsScenarioRerouting(false);
    }
  }, [routes, activeRouteId, setActiveRouteId]);

  // Waypoints along corridor
  const waypoints = useMemo<Waypoint[]>(() => {
    if (activeRoute?.waypoints && activeRoute.waypoints.length > 0) {
      return activeRoute.waypoints.map((wp: any, idx: number) => ({
        id: wp.id || `WP-${String(idx + 1).padStart(2, '0')}`,
        name: wp.name || `Waypoint ${idx + 1}`,
        latitude: wp.latitude ?? (wp as any).lat,
        longitude: wp.longitude ?? (wp as any).lon,
        distanceFromStart: wp.distance_from_start_km ?? wp.distanceFromStart ?? Math.round(((idx + 1) / ((activeRoute.waypoints?.length ?? 1) + 1)) * (activeRoute.distance || 3800)),
        eta: wp.eta ?? `T+${(idx + 1) * 6}h`,
        status: (idx === 0 ? 'active' : 'upcoming') as 'passed' | 'active' | 'upcoming',
        iceRisk: wp.risk_score || wp.iceRisk || activeRoute.iceRisk || 'MODERATE',
        reason: wp.reason || 'Course alteration along optimal corridor'
      }));
    }
    if (!activeRoute || !activeRoute.path) return [];
    return generateWaypointsForRoute(activeRoute.path, activeRoute.id || activeRouteId, selectedDestination.name, cruisingSpeed);
  }, [activeRoute, activeRouteId, selectedDestination.name, cruisingSpeed]);

  // Destination Marker
  const destMarker = useMemo(() => ({
    latitude: selectedDestination.latitude ?? (selectedDestination as any).lat ?? -69.41,
    longitude: selectedDestination.longitude ?? (selectedDestination as any).lon ?? 76.19,
    name: selectedDestination.name || 'Antarctic Station'
  }), [selectedDestination]);

  // Alternative route for comparison in Reroute Advisory
  const alternativeRoute = useMemo(() => {
    return routes.find(r => r.id !== activeRoute?.id && (r.id.includes('route-c') || r.optimization_mode === 'SAFEST')) || routes.find(r => r.id !== activeRoute?.id) || null;
  }, [routes, activeRoute?.id]);

  // Export Polar Voyage Plan
  const handleExportPlan = () => {
    const plan = {
      exportTime: new Date().toISOString(),
      simUtcTime: currentSimUtcStr,
      vessel: selectedVessel?.name || 'R/V Sagar Nidhi',
      polarClass,
      origin: PRESET_ORIGINS[0],
      destination: selectedDestination,
      activeCorridor: activeRoute,
      kinematics: vesselKinematics,
      climaticConditions,
      nearestIceberg: nearestIceberg ? {
        id: nearestIceberg.id,
        name: nearestIceberg.name,
        distanceKm: nearestIceberg.distanceToShipKm,
        cpaNm: nearestIceberg.cpaDistanceNm,
        threat: nearestIceberg.threatLevel
      } : null,
      eventHistory: events
    };
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polar_voyage_plan_${selectedVessel.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tab state for collateral data below map
  const [activeBottomTab, setActiveBottomTab] = useState<'METRICS' | 'WAYPOINTS' | 'EVENTS'>('METRICS');

  return (
    <AppShell
      title="Navigation"
      subtitle="Antarctic vessel route planning and operational monitoring"
      actions={
        <div className="flex items-center gap-2 text-xs">
          {/* Active Vessel Selector */}
          <select
            value={selectedVesselId}
            onChange={(e) => setSelectedVesselId(e.target.value)}
            className="bg-[#071322] border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-sans focus:outline-none focus:border-slate-600 max-w-[210px] truncate cursor-pointer"
          >
            {fleet.map(v => (
              <option key={v.id} value={v.id} className="bg-[#06111e] text-slate-100">
                {v.flag} {v.name.replace(' - DEMO', '')} ({v.speed || v.sog} kn · {v.polar_class})
              </option>
            ))}
          </select>

          {/* SIMULATION CLOCK */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#071322] border border-slate-800 rounded font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400 text-[10px]">SIM:</span>
            <span className="text-slate-100 font-semibold text-[11px]">{currentSimUtcStr}</span>
          </div>

          {/* SIMULATION STATUS BADGE */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#071322] border border-slate-800 rounded font-sans">
            <span className={cn("w-1.5 h-1.5 rounded-full", simRunning ? "bg-emerald-400" : "bg-amber-400")} />
            <span className={cn("font-medium text-[11px]", simRunning ? "text-emerald-400" : "text-amber-400")}>
              {simRunning ? "SIMULATION" : "PAUSED"}
            </span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full bg-[#040B14] text-slate-100 font-sans select-none overflow-y-auto custom-scrollbar">
        
        {/* ========================================================================= */}
        {/* 1. TOP SIMULATION & VOYAGE CONTROLS BAR                                    */}
        {/* ========================================================================= */}
        <div className="bg-[#06111e] border-b border-slate-800/80 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs z-20">
          
          {/* SIMULATION TRANSPORT & SPEED */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              SIMULATION:
            </span>

            <div className="flex items-center gap-1 bg-[#071322] p-0.5 rounded border border-slate-800/80">
              <button
                type="button"
                onClick={() => setSimRunning(!simRunning)}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors",
                  simRunning
                    ? "bg-amber-950/40 text-amber-300 border border-amber-600/40"
                    : "bg-emerald-950/40 text-emerald-300 border border-emerald-600/40"
                )}
              >
                {simRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{simRunning ? 'Pause' : 'Start'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimDistanceKm(0);
                  setSimRunning(true);
                }}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                title="Reset voyage to departure point"
              >
                <RotateCcw className="w-3 h-3" />
              </button>

              <span className="text-slate-700 px-0.5">|</span>

              <span className="text-[10px] text-slate-400 px-1 font-sans">Speed:</span>
              {([1, 2, 5, 10] as const).map(mult => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setSimSpeed(mult)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer",
                    simSpeed === mult
                      ? "bg-[#13283f] text-sky-300 font-bold border border-[#214368]"
                      : "text-slate-400 hover:text-white border border-transparent"
                  )}
                >
                  {mult}×
                </button>
              ))}
            </div>
          </div>

          {/* SCENARIO SELECTOR */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
              SCENARIO:
            </span>

            <div className="flex items-center gap-1 bg-[#071322] p-0.5 rounded border border-slate-800/80">
              {([
                { id: 'NORMAL', label: 'Normal Voyage' },
                { id: 'ICEBERG_ENCOUNTER', label: 'Iceberg Encounter' },
                { id: 'RADAR_OBSTACLE', label: 'Emergency Obstacle' },
                { id: 'HIGH_SEA_ICE', label: 'High Sea Ice' },
                { id: 'MULTI_HAZARD', label: 'Multi-Hazard' },
              ] as const).map(scen => (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => handleSelectScenario(scen.id)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-sans transition-colors shrink-0 cursor-pointer border",
                    activeScenario === scen.id
                      ? "bg-[#13283f] text-sky-300 border-[#214368] font-medium"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent"
                  )}
                >
                  {scen.label}
                </button>
              ))}
            </div>
          </div>

          {/* CORRIDOR ROUTE SELECTOR */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider hidden xl:inline">
              ROUTE:
            </span>
            <div className="flex items-center gap-1 bg-[#071322] p-0.5 rounded border border-slate-800/80">
              {routes.map(r => {
                const isSelected = activeRoute?.id === r.id;
                const label = r.optimization_mode === 'FASTEST' ? 'Fastest' :
                              r.optimization_mode === 'SAFEST' ? 'Safest' : 'Optimal';
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRouteId(r.id)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-sans transition-colors border cursor-pointer",
                      isSelected
                        ? "bg-[#13283f] text-sky-300 border-[#214368] font-medium"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent"
                    )}
                  >
                    {label} <span className="font-mono text-[11px] text-slate-400">({r.distance} km)</span>
                  </button>
                );
              })}
              
              <button
                type="button"
                onClick={() => recomputeRoutes && recomputeRoutes()}
                disabled={isComputingRoutes}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
                title="Recalculate route corridors"
              >
                <RefreshCw className={cn("w-3 h-3 text-slate-300", isComputingRoutes && "animate-spin")} />
              </button>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. OPERATIONAL WARNING BANNER (Emergency Event / Collision Alert)          */}
        {/* ========================================================================= */}
        {(emergencyRerouteActive || nearestIceberg?.threatLevel === 'COLLISION_ALERT' || vesselKinematics.polarCodeStatus === 'OPERATION_SUSPENDED') && (
          <div className="bg-amber-950/30 border-b border-amber-600/50 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 mr-2">⚠ NAVIGATION WARNING:</span>
                <span className="text-slate-200">
                  {nearestIceberg?.threatLevel === 'COLLISION_ALERT'
                    ? `Iceberg ${nearestIceberg.name} is approaching the planned route. Distance to route: ${nearestIceberg.distanceToRouteKm} km (CPA ${nearestIceberg.cpaDistanceNm} NM). Risk: HIGH.`
                    : vesselKinematics.polarCodeStatus === 'OPERATION_SUSPENDED'
                    ? `Severe pack ice encountered (SIC ${climaticConditions.sicPct}%). Hull stress limit exceeded. Risk: CRITICAL.`
                    : 'Tactical emergency hazard detected along route. Risk: HIGH.'}
                </span>
                <span className="text-slate-400 ml-2">Recommended action: Review alternative route.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {nearestIceberg && (
                <button
                  type="button"
                  onClick={() => setSelectedIcebergId(nearestIceberg.id)}
                  className="px-2.5 py-1 rounded bg-[#071322] border border-slate-700 text-slate-200 hover:text-white text-xs font-medium cursor-pointer"
                >
                  View Hazard
                </button>
              )}
              <button
                type="button"
                disabled={isScenarioRerouting}
                onClick={handleAcceptReroute}
                className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-600"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isScenarioRerouting ? 'Recalculating...' : 'Recalculate Route'}</span>
              </button>
            </div>
          </div>
        )}

        {/* OPERATIONAL ROUTE UPDATED BANNER */}
        {activeRouteId.includes('route-c') && (
          <div className="bg-emerald-950/30 border-b border-emerald-600/50 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-emerald-300 mr-2">ROUTE UPDATED:</span>
                <span className="text-slate-200">
                  Reason: Iceberg hazard avoidance • Previous risk: HIGH • New risk: LOW • Distance: +18.4 NM (+34 km) • ETA: +1h 12m
                </span>
              </div>
            </div>
            <span className="text-emerald-300 font-mono text-xs font-bold">
              {alternativeRoute?.name || 'ROUTE C (SAFEST)'} ACTIVE
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. DOMINANT POLAR MAP CONTAINER (70–80% of View Area)                     */}
        {/* ========================================================================= */}
        <div className="relative w-full h-[calc(100vh-260px)] min-h-[480px] bg-[#040B14] shrink-0 border-b border-slate-800 overflow-hidden">
          
          {/* Tactical Hazard Banner from Fleet Context if active */}
          <TacticalHazardBanner className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-xl w-full px-3 pointer-events-auto" />

          {/* Interactive Polar Map Component */}
          <PolarMap
            section="navigation"
            activeHorizon={activeHorizonLabel}
            destinationMarker={destMarker}
            activeRouteId={activeRoute?.id || activeRouteId}
            onSelectRoute={(rId) => setActiveRouteId(rId)}
            customRoutePath={activeRoute?.path}
            allRoutes={routes}
            waypoints={waypoints}
            icebergs={dynamicIcebergs}
            selectedIcebergId={selectedIcebergId}
            onSelectIceberg={(id) => setSelectedIcebergId(id)}
            vesselInfo={activeVesselTelemetry}
            focusTarget={null}
            selectedVesselId={selectedVesselId}
            onSelectVessel={(id) => setSelectedVesselId(id)}
          />

          {/* Voyage Scrub Slider Overlay along Map Bottom */}
          <div className="absolute bottom-3 right-4 z-20 hidden md:flex items-center gap-3 bg-[#071322] border border-slate-800/80 px-3 py-1.5 rounded-md shadow-md text-xs font-sans">
            <span className="text-slate-400 text-[11px]">Route Progress:</span>
            <input
              type="range"
              min={0}
              max={totalDistKm || 3500}
              step={10}
              value={Math.round(simDistanceKm)}
              onChange={(e) => setSimDistanceKm(parseFloat(e.target.value))}
              className="w-32 lg:w-44 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
              title="Scrub vessel along corridor"
            />
            <span className="text-slate-200 font-bold font-mono text-[11px]">
              {simulatedVoyage.progressPct}% ({Math.round(simDistanceKm)} / {Math.round(totalDistKm)} km)
            </span>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 4. SUPPORTING OPERATIONAL INFORMATION (20–30% of View Area)               */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-4 space-y-3 bg-[#040B14]">
          
          {/* Navigation Data Panels: 4 Structured Operational Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs font-sans">
            
            {/* COLUMN 1: VESSEL STATUS */}
            <div className="border border-slate-800/80 rounded-md bg-[#071322] p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-semibold text-slate-200 tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Ship className="w-3.5 h-3.5 text-sky-400" />
                  <span>VESSEL STATUS</span>
                </span>
                <span className="text-emerald-400 text-[10px] font-mono font-medium">SIMULATED</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="text-slate-100 font-medium">{selectedVessel.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Position:</span>
                  <span className="text-slate-200 font-mono text-[11px]">
                    {Math.abs(simulatedVoyage.latitude).toFixed(2)}°S, {Math.abs(simulatedVoyage.longitude).toFixed(2)}°{simulatedVoyage.longitude >= 0 ? 'E' : 'W'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Speed (SOG / STW):</span>
                  <span className="text-slate-200 font-medium font-mono text-[11px]">{vesselKinematics.sogKnots} kn / {vesselKinematics.stwKnots} kn</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Heading:</span>
                  <span className="text-slate-200 font-mono text-[11px]">{vesselKinematics.headingDeg}°T</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ETA Destination:</span>
                  <span className="text-slate-100 font-medium">{currentSimUtcStr} (+{Math.max(1, Math.round(simulatedVoyage.remainingKm / (vesselKinematics.sogKnots * 1.852)))}h)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Polar Class:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{polarClass} (Hull limit: {vesselKinematics.hullStressLimitKn} kN)</span>
                </div>
              </div>
            </div>

            {/* COLUMN 2: ROUTE STATUS */}
            <div className="border border-slate-800/80 rounded-md bg-[#071322] p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-semibold text-slate-200 tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span>ROUTE STATUS</span>
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider",
                  activeRoute?.iceRisk === 'HIGH' || activeRoute?.iceRisk === 'CRITICAL' ? "bg-red-950/50 text-red-300 border border-red-800/60" :
                  activeRoute?.iceRisk === 'MODERATE' ? "bg-amber-950/50 text-amber-300 border border-amber-800/60" :
                  "bg-emerald-950/50 text-emerald-300 border border-emerald-800/60"
                )}>
                  {activeRoute?.iceRisk === 'HIGH' || activeRoute?.iceRisk === 'CRITICAL' ? 'WARNING' : activeRoute?.iceRisk === 'MODERATE' ? 'CAUTION' : 'SAFE'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active Corridor:</span>
                  <span className="text-slate-100 font-medium">{activeRoute?.name || 'ROUTE B'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Distance Remaining:</span>
                  <span className="text-slate-200 font-mono text-[11px]">{simulatedVoyage.remainingKm} km of {Math.round(totalDistKm)} km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="text-slate-200 truncate max-w-[140px] font-medium">{selectedDestination.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Next Hazard (CPA):</span>
                  <span className={cn(
                    "font-medium",
                    nearestIceberg?.threatLevel === 'COLLISION_ALERT' ? "text-red-400" : "text-amber-400"
                  )}>
                    {nearestIceberg ? `${nearestIceberg.name} (${nearestIceberg.cpaDistanceNm} NM)` : 'None (<25 NM)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Route Condition:</span>
                  <span className="text-emerald-400 font-medium">Nominal Lead Navigation</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fuel Consumed:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{vesselKinematics.cumulativeFuelTons} MT</span>
                </div>
              </div>
            </div>

            {/* COLUMN 3: ENVIRONMENT */}
            <div className="border border-slate-800/80 rounded-md bg-[#071322] p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-semibold text-slate-200 tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-sky-400" />
                  <span>ENVIRONMENT</span>
                </span>
                <span className="text-slate-500 text-[10px] font-mono">NOAA / GLO12</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sea Ice (SIC):</span>
                  <span className="text-slate-200 font-semibold font-mono text-[11px]">{climaticConditions.sicPct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ice Thickness:</span>
                  <span className="text-slate-200 font-mono text-[11px]">{climaticConditions.iceThicknessM} m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Wind Speed:</span>
                  <span className="text-slate-200 font-mono text-[11px]">{climaticConditions.windSpeedKnots} kn</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Significant Wave Ht:</span>
                  <span className="text-slate-200 font-mono text-[11px]">{climaticConditions.waveHeightM} m SWH</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Surface Current:</span>
                  <span className="text-slate-200 font-mono text-[11px]">{climaticConditions.currentSpeedKnots} kn @ {climaticConditions.currentDirectionDeg}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Air / Sea Temp:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{climaticConditions.seaSurfaceTempC}°C</span>
                </div>
              </div>
            </div>

            {/* COLUMN 4: AI / ML RISK PREDICTION */}
            <div className="border border-slate-800/80 rounded-md bg-[#071322] p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-semibold text-slate-200 tracking-wide">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>RISK PREDICTION</span>
                </span>
                <span className="text-slate-400 text-[10px] font-mono">XGBoost</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Model Architecture:</span>
                  <span className="text-slate-100 font-medium">XGBoost Ensemble</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Predicted Risk:</span>
                  <span className="text-slate-200 font-bold font-mono text-[11px]">
                    {activeRoute ? (
                      (activeRoute as any)?.overallScore !== undefined
                        ? (1 - ((activeRoute as any).overallScore / 100)).toFixed(2)
                        : (activeRoute as any)?.decision_support?.risk_score !== undefined
                          ? (activeRoute as any).decision_support.risk_score.toFixed(2)
                          : '0.18'
                    ) : '0.18'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="text-emerald-400 font-semibold font-mono text-[11px]">
                    {(activeRoute as any)?.validation?.confidence
                      ? `${(activeRoute as any).validation.confidence}%`
                      : '88.6%'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">IMO POLARIS Rating:</span>
                  <span className={cn(
                    "font-semibold font-mono text-[11px]",
                    vesselKinematics.rioScore > 0 ? "text-emerald-400" : "text-amber-400"
                  )}>
                    RIO: {vesselKinematics.rioScore > 0 ? `+${vesselKinematics.rioScore}` : vesselKinematics.rioScore} ({vesselKinematics.polarCodeStatus})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary Factors:</span>
                  <span className="text-slate-300 truncate max-w-[130px] font-medium">SIC, Berg CPA, Wind</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Hull Impact Stress:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{vesselKinematics.hullStressKn} / {vesselKinematics.hullStressLimitKn} kN</span>
                </div>
              </div>
            </div>

          </div>

          {/* Collateral Views Tab Selector (Waypoints Table & Chronological Event Log) */}
          <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">VIEW:</span>
              <button
                type="button"
                onClick={() => setActiveBottomTab(activeBottomTab === 'WAYPOINTS' ? 'METRICS' : 'WAYPOINTS')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-sans border cursor-pointer transition-colors",
                  activeBottomTab === 'WAYPOINTS'
                    ? "bg-[#13283f] text-sky-300 border-[#214368] font-medium"
                    : "bg-[#071322] text-slate-400 border-slate-800 hover:text-white"
                )}
              >
                Waypoints ({waypoints.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveBottomTab(activeBottomTab === 'EVENTS' ? 'METRICS' : 'EVENTS')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-sans border cursor-pointer transition-colors",
                  activeBottomTab === 'EVENTS'
                    ? "bg-[#13283f] text-sky-300 border-[#214368] font-medium"
                    : "bg-[#071322] text-slate-400 border-slate-800 hover:text-white"
                )}
              >
                Event Log ({events.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 hidden sm:block">
                US NIC • NOAA CDR • Sentinel-1 SAR
              </span>
              <button
                type="button"
                onClick={handleExportPlan}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#071322] border border-slate-800 text-slate-300 hover:text-white text-xs font-sans transition-colors cursor-pointer"
                title="Export full voyage JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Plan</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Collapsible Waypoints Table */}
          {activeBottomTab === 'WAYPOINTS' && (
            <div className="border border-slate-800/80 rounded-md bg-[#071322] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#06111e] border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between font-sans">
                <span>ACTIVE VOYAGE CORRIDOR WAYPOINTS</span>
                <button type="button" onClick={() => setActiveBottomTab('METRICS')} className="text-slate-400 hover:text-white cursor-pointer">✕ Close</button>
              </div>
              <div className="overflow-x-auto max-h-48 custom-scrollbar">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#050e18] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-1.5">ID</th>
                      <th className="px-3 py-1.5">Waypoint Name</th>
                      <th className="px-3 py-1.5">Coordinates</th>
                      <th className="px-3 py-1.5">Distance</th>
                      <th className="px-3 py-1.5">ETA</th>
                      <th className="px-3 py-1.5">Risk Level</th>
                      <th className="px-3 py-1.5">Operational Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {waypoints.map((wp) => (
                      <tr key={wp.id} className="hover:bg-slate-800/40">
                        <td className="px-3 py-1.5 text-sky-400 font-bold">{wp.id}</td>
                        <td className="px-3 py-1.5 text-slate-200 font-sans">{wp.name}</td>
                        <td className="px-3 py-1.5 text-slate-300 font-mono">
                          {Math.abs(wp.latitude).toFixed(2)}°S, {Math.abs(wp.longitude).toFixed(2)}°{wp.longitude >= 0 ? 'E' : 'W'}
                        </td>
                        <td className="px-3 py-1.5 text-slate-300">{wp.distanceFromStart} km</td>
                        <td className="px-3 py-1.5 text-slate-300">{wp.eta}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-semibold",
                            wp.iceRisk === 'HIGH' ? "bg-red-950/50 text-red-300 border border-red-800/60" :
                            wp.iceRisk === 'MODERATE' ? "bg-amber-950/50 text-amber-300 border border-amber-800/60" :
                            "bg-emerald-950/50 text-emerald-300 border border-emerald-800/60"
                          )}>
                            {wp.iceRisk}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-400 font-sans">{wp.reason || 'Nominal transit corridor'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Collapsible Events Log */}
          {activeBottomTab === 'EVENTS' && (
            <div className="border border-slate-800/80 rounded-md bg-[#071322] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#06111e] border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between font-sans">
                <span>CHRONOLOGICAL NAVIGATION &amp; HAZARD EVENTS</span>
                <button type="button" onClick={() => setActiveBottomTab('METRICS')} className="text-slate-400 hover:text-white cursor-pointer">✕ Close</button>
              </div>
              <div className="overflow-x-auto max-h-48 custom-scrollbar divide-y divide-slate-800/60 p-2 space-y-1 font-sans">
                {events.slice().reverse().map(ev => (
                  <div key={ev.id} className="p-2 bg-[#050e18] rounded flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[10px]">{ev.timeStr}</span>
                      <span className="font-medium text-slate-200">{ev.title}</span>
                      <span className="text-slate-400 text-xs hidden md:inline">— {ev.detail}</span>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-semibold text-[9px] shrink-0 font-sans tracking-wide",
                      ev.severity === 'CRITICAL' ? "bg-red-950/50 text-red-400 border border-red-800/60" :
                      ev.severity === 'WARNING' ? "bg-amber-950/50 text-amber-400 border border-amber-800/60" :
                      ev.severity === 'CAUTION' ? "bg-yellow-950/50 text-yellow-300 border border-yellow-800/60" :
                      "bg-slate-800 text-slate-300 border border-slate-700"
                    )}>
                      {ev.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </AppShell>

  );
};

export default NavigationPage;
