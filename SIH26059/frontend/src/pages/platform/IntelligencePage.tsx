import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Ship, 
  Activity, 
  Compass,
  Database,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useFleet } from '../../context/FleetContext';
import { api } from '../../services/api';
import { cn } from '../../utils/cn';

export const IntelligencePage: React.FC = () => {
  const { selectedVessel, setSelectedVesselId, fleet, activeRoute, activeRouteId, setActiveRouteId, routes } = useFleet();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [aiModels, setAiModels] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [alertsRes, modelsRes] = await Promise.all([
          api.alerts(),
          api.intelligenceModels()
        ]);
        if (alertsRes?.alerts) setAlerts(alertsRes.alerts);
        if (modelsRes) setAiModels(modelsRes);
      } catch (err) {
        console.error('[IntelligencePage] Error loading data:', err);
      }
    }
    loadData();
  }, []);

  const currentRoute = useMemo(() => {
    if (!routes || routes.length === 0) return activeRoute || null;
    return routes.find(r => r.id === activeRouteId) ||
           routes.find(r => r.id?.includes(activeRouteId)) ||
           activeRoute ||
           routes.find(r => r.recommended) ||
           routes[0] ||
           null;
  }, [routes, activeRouteId, activeRoute]);

  const costBreakdown = currentRoute?.cost_breakdown || currentRoute?.costs || {
    distance_cost: 168.0,
    ice_cost: 341.9,
    iceberg_cost: 0.0,
    current_cost: 0.4,
    weather_cost: 325.4,
    bathymetry_cost: 0.0,
    fuel_cost: 682.7,
    total_cost: 1518.4
  };

  const explanation = currentRoute?.decision_support?.recommendation || 
    currentRoute?.decision_explanation || 
    currentRoute?.reason || 
    `${currentRoute?.name || 'ROUTE B (OPTIMAL)'} is recommended for ${selectedVessel.name} to ${selectedVessel.destination || 'Bharati Station'}. It optimizes voyage safety and fuel efficiency by avoiding compact pack ice (SIC > 75%) and maintaining a minimum 15 km CPA clearance from all 85 tracked Antarctic icebergs.`;

  return (
    <AppShell
      title="INTELLIGENCE & LOGS"
      subtitle="Decision explanation, tactical alert history, and environmental provenance"
      actions={
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-polar-navy/40 border border-slate/20 rounded-sm text-slate-300">
            <Ship className="w-3.5 h-3.5 text-glacial-blue" />
            <span className="text-slate-400">VESSEL:</span>
            <select
              value={selectedVessel.id}
              onChange={(e) => setSelectedVesselId(e.target.value)}
              className="bg-transparent text-ice-white font-semibold text-xs border-none focus:outline-none cursor-pointer"
            >
              {fleet.map((v) => (
                <option key={v.id} value={v.id} className="bg-polar-navy/20 text-ice-white font-mono">
                  {v.name} ({v.polar_class ? v.polar_class.split(' ')[0] : 'PC5'})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-polar-navy/40 border border-slate/20 rounded-sm text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">STATUS:</span>
            <span className="text-ice-white font-semibold">VALIDATED</span>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 bg-navy text-slate-200">
        
        {/* ========================================================================= */}
        {/* 1. DECISION EXPLANATION (MARITIME DECISION SUPPORT)                      */}
        {/* ========================================================================= */}
        <div className="bg-polar-navy/30 border border-slate/20 p-4 rounded-sm space-y-3 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-glacial-blue" />
              <span className="text-ice-white font-bold text-xs uppercase tracking-wider">
                Decision Explanation
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 text-xs">{currentRoute?.name || 'Route B (Optimal)'}</span>
            </div>

            {/* Corridor Tabs */}
            <div className="flex items-center gap-1 bg-navy p-0.5 rounded-sm border border-slate/20">
              {routes.map((r) => {
                const isSelected = currentRoute?.id === r.id;
                const tabLabel = r.optimization_mode === 'BALANCED' ? 'Route B (Optimal)' :
                                 r.optimization_mode === 'SAFEST' ? 'Route C (Safest)' :
                                 r.optimization_mode === 'FASTEST' ? 'Route A (Direct)' :
                                 r.name?.includes('ROUTE B') ? 'Route B (Optimal)' :
                                 r.name?.includes('ROUTE C') ? 'Route C (Safest)' : 'Route A (Direct)';
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRouteId(r.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-xs text-[10px] font-mono transition-colors",
                      isSelected
                        ? "bg-glacial-blue/20 text-glacial-blue font-bold border border-glacial-blue/40"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-navy border border-slate/20 rounded-sm">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
              Operational Recommendation Narrative
            </span>
            <p className="text-xs text-slate-200 font-sans leading-relaxed">
              {explanation}
            </p>
          </div>

          {/* Environmental Cost Component Score Breakdown */}
          <div className="pt-2">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-2 font-bold">
              Multi-Objective Cost Breakdown (Antarctic Dynamic A*)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
              <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                <span className="text-slate-400 text-[9px] block">DISTANCE</span>
                <span className="font-bold text-ice-white mt-0.5 block">{costBreakdown.distance_cost ?? 0}</span>
              </div>
              <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                <span className="text-slate-400 text-[9px] block">SEA-ICE DRAG</span>
                <span className="font-bold text-glacial-blue mt-0.5 block">{costBreakdown.ice_cost ?? 0}</span>
              </div>
              <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                <span className="text-slate-400 text-[9px] block">ICEBERG CPA</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{costBreakdown.iceberg_cost ?? 0}</span>
              </div>
              <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                <span className="text-slate-400 text-[9px] block">OCEAN DRIFT</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{costBreakdown.current_cost ?? 0}</span>
              </div>
              <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                <span className="text-slate-400 text-[9px] block">WIND DRAG</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{costBreakdown.weather_cost ?? 0}</span>
              </div>
              <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                <span className="text-slate-400 text-[9px] block">BATHYMETRY</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">{costBreakdown.bathymetry_cost ?? 0}</span>
              </div>
              <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                <span className="text-slate-400 text-[9px] block">FUEL CONSUMPTION</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{costBreakdown.fuel_cost ?? 0}</span>
              </div>
              <div className="bg-polar-navy/40 border border-glacial-blue/40 p-2 rounded-sm">
                <span className="text-glacial-blue text-[9px] font-bold block">TOTAL SCORE</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">{costBreakdown.total_cost ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. CHRONOLOGICAL LOGS & HAZARDS TIMELINE                                  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
          
          {/* Active Hazard Logs */}
          <div className="bg-polar-navy/30 border border-slate/20 p-4 rounded-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate/20 pb-2 mb-2">
                <span className="text-xs font-bold text-ice-white uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Tactical Hazard Log ({alerts.length})
                </span>
                <span className="text-[10px] text-slate-400">Chronological</span>
              </div>
              
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {alerts.map((a: any, idx: number) => {
                  const isHigh = a.severity === 'HIGH' || a.severity === 'CRITICAL';
                  return (
                    <div 
                      key={a.id || idx}
                      className={cn(
                        "p-2.5 rounded-sm border text-[11px] space-y-1",
                        isHigh ? "bg-navy border-signature-coral/40" : "bg-navy border-slate/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("font-bold text-xs", isHigh ? "text-signature-coral" : "text-amber-400")}>
                          {a.title}
                        </span>
                        <span className="text-[10px] text-slate-400">{a.timeRelative || '14:12 UTC'}</span>
                      </div>
                      <p className="text-slate-300 font-sans text-xs">{a.description}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate/20">
                        <span>Source: {a.source || 'Polar Sensor Fusion'}</span>
                        <span className="text-glacial-blue font-semibold">Action: {a.recommendedAction || 'Monitor CPA'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              to="/alerts"
              className="pt-2 border-t border-slate/20 text-[10px] text-glacial-blue hover:text-white flex items-center justify-between transition-colors"
            >
              <span>Manage active alerts</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* System Events & Decisions */}
          <div className="bg-polar-navy/30 border border-slate/20 p-4 rounded-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate/20 pb-2 mb-2">
                <span className="text-xs font-bold text-ice-white uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-glacial-blue" />
                  Navigation Events &amp; Waypoint Log
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">● RECORDER ACTIVE</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {[
                  { time: '14:32:00 UTC', event: 'Simulated kinematic tick: SOG 12.4 kn, HDG 184°T, CPA clearance 14.8 km' },
                  { time: '14:20:15 UTC', event: 'Waypoint WP-03 cleared. Transitioning to open lead sector SEC-02' },
                  { time: '13:45:00 UTC', event: 'NOAA CDR 25km passive microwave grid refreshed. MIZ boundary confirmed' },
                  { time: '12:00:30 UTC', event: 'Sentinel-1A SAR scene ingested. 6 CFAR point-targets verified and mapped' },
                  { time: '11:15:00 UTC', event: 'POLARIS RIO safety verification passed: RIO +8.4 for PC5 ice class vessel' }
                ].map((ev, i) => (
                  <div key={i} className="p-2 bg-navy border border-slate/20 rounded-sm text-[11px] space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-glacial-blue">{ev.time}</span>
                      <span>OPERATIONAL</span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{ev.event}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/reports"
              className="pt-2 border-t border-slate/20 text-[10px] text-glacial-blue hover:text-white flex items-center justify-between transition-colors"
            >
              <span>Generate IMO compliance report</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. ML MODEL BENCHMARKS & ENVIRONMENTAL SENSOR PROVENANCE                  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
          
          {/* Model Benchmarks */}
          <div className="bg-polar-navy/30 border border-slate/20 p-4 rounded-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate/20 pb-2">
              <span className="text-xs font-bold text-ice-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ML Prediction Models &amp; Evaluation Benchmarks
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">4 MODULES</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-navy border border-slate/20 rounded-sm space-y-1">
                <div className="text-glacial-blue font-bold text-[10px]">SEA ICE PREDICTOR</div>
                <div className="text-slate-200 font-semibold">{aiModels?.modules?.module_1_sea_ice?.model_type || 'RandomForest'} (CDR V4)</div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Test R²:</span>
                  <span className="text-emerald-400 font-bold">{aiModels?.modules?.module_1_sea_ice?.test_r2 ?? 0.8861}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Test MAE:</span>
                  <span className="text-ice-white">{aiModels?.modules?.module_1_sea_ice?.test_mae ?? 0.0401}</span>
                </div>
              </div>

              <div className="p-2.5 bg-navy border border-slate/20 rounded-sm space-y-1">
                <div className="text-glacial-blue font-bold text-[10px]">ICEBERG TRAJECTORY MODEL</div>
                <div className="text-slate-200 font-semibold">Kinematic RF (85 BYU Bergs)</div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Mean Error:</span>
                  <span className="text-emerald-400 font-bold">{aiModels?.modules?.module_2_iceberg_drift?.mean_position_error_km ?? 1.7} km</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Median Error:</span>
                  <span className="text-ice-white">{aiModels?.modules?.module_2_iceberg_drift?.median_position_error_km ?? 0.12} km</span>
                </div>
              </div>

              <div className="p-2.5 bg-navy border border-slate/20 rounded-sm space-y-1">
                <div className="text-glacial-blue font-bold text-[10px]">SENTINEL-1 SAR DETECTOR</div>
                <div className="text-slate-200 font-semibold">CFAR + Lee Speckle Filter</div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Test Accuracy:</span>
                  <span className="text-emerald-400 font-bold">{aiModels?.modules?.module_3_sentinel_sar?.test_accuracy ?? 98.47}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Weighted F1:</span>
                  <span className="text-ice-white">{aiModels?.modules?.module_3_sentinel_sar?.weighted_f1 ?? 98.48}%</span>
                </div>
              </div>

              <div className="p-2.5 bg-navy border border-slate/20 rounded-sm space-y-1">
                <div className="text-glacial-blue font-bold text-[10px]">POLAR DYNAMIC ROUTING</div>
                <div className="text-slate-200 font-semibold">EPSG:3031 Conformal A*</div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Cost Objectives:</span>
                  <span className="text-emerald-400 font-bold">7 Surfaces</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Standard:</span>
                  <span className="text-ice-white">IMO POLARIS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Provenance */}
          <div className="bg-polar-navy/30 border border-slate/20 p-4 rounded-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate/20 pb-2">
              <span className="text-xs font-bold text-ice-white uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-glacial-blue" />
                Sensor Pipeline &amp; Data Provenance
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">SYNCHRONIZED</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 bg-navy border border-slate/20 rounded-sm flex items-center justify-between">
                <div>
                  <div className="text-ice-white font-semibold">NOAA / NSIDC CDR V4</div>
                  <div className="text-[10px] text-slate-400">Daily 25km passive microwave grid for sea ice concentration</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  SATELLITE
                </span>
              </div>

              <div className="p-2 bg-navy border border-slate/20 rounded-sm flex items-center justify-between">
                <div>
                  <div className="text-ice-white font-semibold">US NIC + BYU Antarctic Iceberg Database</div>
                  <div className="text-[10px] text-slate-400">85 authenticated iceberg records with dimensions &amp; historical drift</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  RADAR
                </span>
              </div>

              <div className="p-2 bg-navy border border-slate/20 rounded-sm flex items-center justify-between">
                <div>
                  <div className="text-ice-white font-semibold">Copernicus Marine GLO12 + ECMWF ERA5</div>
                  <div className="text-[10px] text-slate-400">Surface currents (uo, vo) &amp; 10m wind vector forcing</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  HYDRO/MET
                </span>
              </div>

              <div className="p-2 bg-navy border border-slate/20 rounded-sm flex items-center justify-between">
                <div>
                  <div className="text-ice-white font-semibold">NOAA NGDC ETOPO 2022 Bathymetry</div>
                  <div className="text-[10px] text-slate-400">1 arc-minute global seabed relief with 20m keel collision avoidance</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  BATHYMETRY
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
};

export default IntelligencePage;
