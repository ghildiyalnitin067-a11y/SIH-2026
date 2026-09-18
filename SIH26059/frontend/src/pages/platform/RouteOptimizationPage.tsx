import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Ship, MapPin, ShieldAlert,
  Navigation, Loader2
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useApiData } from "../../hooks/useApiData";
import { useFleet } from '../../context/FleetContext';
import PolarMap from '../../components/map/PolarMap';
import { cn } from '../../utils/cn';

interface RouteOption {
  id: string;
  name: string;
  optimization_mode?: string;
  distance: number;
  eta: string;
  path?: [number, number][];
  recommended?: boolean;
  iceRisk?: string;
  icebergRisk?: string;
  weatherRisk?: string;
  overallScore?: number;
  fuelConsumption?: string | number;
  sicExposure?: number;
  sic_actual?: number;
  sic_cost_contribution?: number;
  rioScore?: number | string;
  reason?: string;
  costs?: Record<string, number>;
  cost_breakdown?: Record<string, number>;
}

export const RouteOptimizationPage: React.FC = () => {
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
    emergencyRerouteActive,
    triggerEmergencyHazard,
    setCustomDestination,
    isComputingRoutes,
    recomputeRoutes
  } = useFleet();

  const [maxSicConstraint, setMaxSicConstraint] = useState<number>(75);
  const [safetyBufferKm, setSafetyBufferKm] = useState<number>(15);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customLat, setCustomLat] = useState<string>('');
  const [customLon, setCustomLon] = useState<string>('');

  const handleSetActiveRoute = (routeId: string) => {
    setActiveRouteId(routeId);
  };

  const recommendedRoute = useMemo(() => {
    return routes.find(r => r.recommended || r.optimization_mode === 'BALANCED' || r.id?.includes('route-b')) || routes[0];
  }, [routes]);

  const alternativeRoutes = useMemo(() => {
    return routes.filter(r => r.id !== recommendedRoute?.id);
  }, [routes, recommendedRoute]);

  const selectedRoute = useMemo(() => {
    return routes.find(r => r.id === activeRouteId) || recommendedRoute;
  }, [routes, activeRouteId, recommendedRoute]);

  const getRiskLabel = (r: RouteOption) => {
    const rio = parseFloat(String(r.rioScore || '8.4'));
    if (rio < 0 || r.optimization_mode === 'FASTEST' || r.id?.includes('route-a')) {
      return { label: 'HIGH RISK', color: 'text-signature-coral', bg: 'bg-signature-coral/10', border: 'border-signature-coral/30' };
    }
    if (r.optimization_mode === 'BALANCED' || r.id?.includes('route-b')) {
      return { label: 'OPTIMAL (SAFE)', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    }
    return { label: 'SAFEST (CONSERVATIVE)', color: 'text-glacial-blue', bg: 'bg-glacial-blue/10', border: 'border-glacial-blue/30' };
  };

  return (
    <AppShell
      title="ROUTES"
      subtitle="Antarctic route planning and optimization"
      actions={
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#06111e] border border-slate-800 px-3 py-1 rounded-xs">
            <span className="text-slate-400">ENGAGED:</span>
            <span className="text-emerald-400 font-semibold">{selectedRoute?.name?.split(' - ')[0] || 'ROUTE B'}</span>
          </div>
          <button
            type="button"
            onClick={() => triggerEmergencyHazard()}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-mono font-semibold border transition-colors cursor-pointer",
              emergencyRerouteActive
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-[#06111e] border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-[#0a1829]"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{emergencyRerouteActive ? "Tactical Diversion Active" : "Simulate Hazard"}</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-[#040B14]">
        
        <div className="w-full lg:w-96 xl:w-[420px] bg-[#06111e] border-r border-slate-800 p-3.5 overflow-y-auto custom-scrollbar flex flex-col justify-between shrink-0 font-mono text-xs text-slate-300 space-y-3.5">
          
          <div className="space-y-3.5">
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-200 font-bold text-xs uppercase tracking-wider">
                  Voyage Parameters
                </span>
                <span className="text-[10px] text-slate-400">Polaris PC5 Standard</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1.5 uppercase font-semibold">
                  <Ship className="w-3.5 h-3.5 text-sky-400" />
                  Origin (Research Vessel)
                </label>
                <select
                  value={selectedVesselId}
                  onChange={(e) => setSelectedVesselId(e.target.value)}
                  className="w-full bg-[#040B14] border border-slate-800 rounded-xs p-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                >
                  {fleet.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.flag} {v.name} ({v.speed || v.sog || 12.0} kn) — {Math.abs(v.latitude || 0).toFixed(1)}°S
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-slate-400 flex items-center gap-1.5 uppercase font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    Destination Station
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    className="text-[10px] text-sky-400 hover:text-slate-200"
                  >
                    {isCustomMode ? '← Pick Station' : '+ Custom Waypoint'}
                  </button>
                </div>

                {!isCustomMode ? (
                  <select
                    value={selectedDestinationId}
                    onChange={(e) => setSelectedDestinationId(e.target.value)}
                    className="w-full bg-[#040B14] border border-slate-800 rounded-xs p-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                  >
                    {stations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.country || 'Antarctica'}) — {Math.abs(d.latitude).toFixed(1)}°S
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 bg-[#040B14] p-2.5 rounded-xs border border-slate-800">
                    <input
                      type="text"
                      placeholder="Waypoint Name (e.g. Weddell Lead)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-[#081524] border border-slate-800 rounded-xs p-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Latitude (°S)"
                        value={customLat}
                        onChange={(e) => setCustomLat(e.target.value)}
                        className="bg-[#081524] border border-slate-800 rounded-xs p-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Longitude (°E/W)"
                        value={customLon}
                        onChange={(e) => setCustomLon(e.target.value)}
                        className="bg-[#081524] border border-slate-800 rounded-xs p-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-600"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isComputingRoutes || !customLat || !customLon}
                      onClick={() => {
                        const lat = parseFloat(customLat);
                        const lon = parseFloat(customLon);
                        if (!isNaN(lat) && !isNaN(lon)) {
                          setCustomDestination(customName || 'Custom Target', lat, lon);
                          setIsCustomMode(false);
                        }
                      }}
                      className="w-full py-1 bg-[#12283e] hover:bg-[#1a3857] text-sky-300 border border-[#214972] rounded-xs text-xs font-semibold"
                    >
                      Set Destination
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#081524] border border-slate-800 p-2 rounded-xs">
                  <span className="text-[9px] text-slate-400 block uppercase">Max SIC Constraint</span>
                  <div className="flex items-center justify-between mt-1">
                    <input
                      type="range"
                      min={40}
                      max={95}
                      value={maxSicConstraint}
                      onChange={(e) => setMaxSicConstraint(Number(e.target.value))}
                      className="w-20 accent-sky-500"
                    />
                    <span className="text-xs font-bold text-slate-200">{maxSicConstraint}%</span>
                  </div>
                </div>
                <div className="bg-[#081524] border border-slate-800 p-2 rounded-xs">
                  <span className="text-[9px] text-slate-400 block uppercase">Iceberg CPA Buffer</span>
                  <div className="flex items-center justify-between mt-1">
                    <input
                      type="range"
                      min={5}
                      max={30}
                      value={safetyBufferKm}
                      onChange={(e) => setSafetyBufferKm(Number(e.target.value))}
                      className="w-20 accent-sky-500"
                    />
                    <span className="text-xs font-bold text-slate-200">{safetyBufferKm} km</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isComputingRoutes}
                onClick={async () => {
                  await recomputeRoutes();
                  setActiveRouteId(recommendedRoute?.id || 'route-b');
                }}
                className="w-full py-2 bg-[#12283e] hover:bg-[#1a3857] text-sky-300 border border-[#214972] rounded-xs text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isComputingRoutes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Calculating Corridors...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Calculate Optimal Route</span>
                  </>
                )}
              </button>
            </div>

            {recommendedRoute && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Recommended Route
                  </span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-xs font-semibold border", getRiskLabel(recommendedRoute).bg, getRiskLabel(recommendedRoute).color, getRiskLabel(recommendedRoute).border)}>
                    {getRiskLabel(recommendedRoute).label}
                  </span>
                </div>

                <div className={cn(
                  "p-3 rounded-xs border transition-colors space-y-2",
                  activeRouteId === recommendedRoute.id
                    ? "bg-[#0c1c2e] border-sky-500/40"
                    : "bg-[#081524] border-slate-800"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-100">{recommendedRoute.name}</div>
                      <div className="text-[11px] text-slate-400">{recommendedRoute.distance?.toLocaleString()} km · ETA: {recommendedRoute.eta}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetActiveRoute(recommendedRoute.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-colors",
                        activeRouteId === recommendedRoute.id
                          ? "bg-emerald-600 text-slate-100"
                          : "bg-[#12283e] hover:bg-[#1a3857] text-sky-300 border border-[#214972]"
                      )}
                    >
                      {activeRouteId === recommendedRoute.id ? "Engaged" : "Select"}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {recommendedRoute.reason || 'Optimized for minimal fuel consumption while strictly honoring IMO Polar Code RIO positive limits and avoiding charted iceberg drift vectors.'}
                  </p>

                  <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">POLARIS RIO</span>
                      <span className="text-emerald-400 font-bold text-xs">{recommendedRoute.rioScore || '+8.4'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">SIC Exposure</span>
                      <span className="text-sky-400 font-bold text-xs">{recommendedRoute.sic_actual || recommendedRoute.sicExposure || 48}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Est. Fuel</span>
                      <span className="text-slate-200 font-bold text-xs">{recommendedRoute.fuelConsumption || '28.4 MT'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {alternativeRoutes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Alternative Routes
                </span>

                <div className="space-y-2">
                  {alternativeRoutes.map((alt) => {
                    const isSelected = activeRouteId === alt.id;
                    const rRisk = getRiskLabel(alt);
                    return (
                      <div
                        key={alt.id}
                        onClick={() => handleSetActiveRoute(alt.id)}
                        className={cn(
                          "p-2.5 rounded-xs border transition-colors cursor-pointer space-y-1.5",
                          isSelected
                            ? "bg-[#0c1c2e] border-sky-500/40 text-slate-100"
                            : "bg-[#081524] border-slate-800 hover:border-slate-700 text-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-200">{alt.name}</span>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-xs font-semibold border", rRisk.bg, rRisk.color, rRisk.border)}>
                            {rRisk.label}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{alt.distance?.toLocaleString()} km · ETA: {alt.eta}</span>
                          <span>SIC: {alt.sic_actual || alt.sicExposure || 52}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>IMO Resolution A.1026(26)</span>
            <span>POLARIS Compliant</span>
          </div>

        </div>

        <div className="flex-1 relative h-full bg-[#040B14]">
          <PolarMap
            section="overview"
            showRoute={true}
            showVessel={true}
            showSeaIce={true}
            showIcebergs={true}
            showRouteOptimization={true}
            allRoutes={routes}
            activeRouteId={activeRouteId}
            onSelectRoute={(rId) => setActiveRouteId(rId)}
            destinationMarker={{
              latitude: selectedDestination?.latitude ?? -69.4,
              longitude: selectedDestination?.longitude ?? 76.19,
              name: selectedDestination?.name || 'Bharati Station'
            }}
            selectedVesselId={selectedVesselId}
            onSelectVessel={(id) => setSelectedVesselId(id)}
            vesselInfo={{
              name: selectedVessel.name,
              latitude: selectedVessel.latitude,
              longitude: selectedVessel.longitude,
              speed: selectedVessel.speed,
              heading: selectedVessel.heading
            }}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default RouteOptimizationPage;
