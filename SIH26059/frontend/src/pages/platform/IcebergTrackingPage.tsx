import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Mountain, Search, X
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useApiData } from "../../hooks/useApiData";
import { useFleet } from '../../context/FleetContext';
import PolarMap from '../../components/map/PolarMap';
import { api } from '../../services/api';
import { cn } from '../../utils/cn';

interface IcebergForecastPoint {
  horizon: 'NOW' | '+6H' | '+12H' | '+24H' | '+48H';
  timeLabel: string;
  coordinates: [number, number];
  displacementKm: number;
  speedKn: number;
}

interface Iceberg {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  velocity: number;
  direction: string;
  movementTrend: string;
  size: number;
  areaKm2: number;
  draftEstimate: number;
  confidence: number;
  risk: string;
  distanceFromVessel: string;
  lastObserved: string;
  sensorSource: string;
  status?: string;
  region?: string;
  historicalTrajectory?: [number, number][];
  predictedTrajectory?: [number, number][];
  forecastPoints?: IcebergForecastPoint[];
}

export const IcebergTrackingPage: React.FC = () => {
  const { 
    selectedVesselId, 
    selectedVessel, 
    setSelectedVesselId,
    selectedIcebergId,
    setSelectedIcebergId,
    selectedDestination,
    routes,
    activeRouteId,
    setActiveRouteId,
    selectedHorizon,
    setSelectedHorizon,
    activeHorizonLabel
  } = useFleet();

  const [icebergs, setIcebergs] = useState<Iceberg[]>([]);
  const [mapFocusTarget, setMapFocusTarget] = useState<[number, number] | null>(null);

  // Filters
  const [filterId, setFilterId] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useApiData();

  // Fetch authentic icebergs from backend (85 BYU/US NIC records)
  const fetchIcebergs = useCallback(async () => {
    try {
      const res = await api.icebergs(activeHorizonLabel);
      if (res?.icebergs?.length) {
        setIcebergs(res.icebergs);
      }
    } catch (e) {
      console.error('[IcebergPage] fetch error:', e);
    }
  }, [activeHorizonLabel]);

  useEffect(() => {
    fetchIcebergs();
  }, [fetchIcebergs]);

  // Enrich with region and realistic distance to vessel / route
  const enrichedIcebergs = useMemo(() => {
    const vLat = selectedVessel.latitude || -54.2;
    const vLon = selectedVessel.longitude || 68.4;
    return icebergs.map(ib => {
      const dLat = (ib.latitude - vLat) * 111.0;
      const dLon = (ib.longitude - vLon) * 111.0 * Math.cos((vLat * Math.PI) / 180);
      const dist = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));

      // Classify region based on longitude
      let region = 'Weddell Sea';
      if (ib.longitude > 60 && ib.longitude <= 150) region = 'Prydz Bay / Amery';
      else if (ib.longitude > 150 || ib.longitude <= -130) region = 'Ross Sea';
      else if (ib.longitude > -130 && ib.longitude <= -60) region = 'Bellingshausen';
      else if (ib.longitude > -60 && ib.longitude <= 20) region = 'Weddell Sea';
      else region = 'Queen Maud Shelf';

      return {
        ...ib,
        region,
        status: ib.velocity > 0.4 ? 'Moving' : ib.velocity > 0 ? 'Drifting' : 'Stationary',
        distanceKm: dist,
        distanceToRoute: `${dist} km`
      };
    });
  }, [icebergs, selectedVessel]);

  // Filtered dataset
  const filteredIcebergs = useMemo(() => {
    return enrichedIcebergs.filter(ib => {
      if (filterId && !ib.id.toLowerCase().includes(filterId.toLowerCase()) && !ib.name.toLowerCase().includes(filterId.toLowerCase())) {
        return false;
      }
      if (filterRisk !== 'ALL' && ib.risk !== filterRisk) {
        return false;
      }
      if (filterRegion !== 'ALL' && ib.region !== filterRegion) {
        return false;
      }
      if (filterStatus !== 'ALL' && ib.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [enrichedIcebergs, filterId, filterRisk, filterRegion, filterStatus]);

  const selectedIceberg: any = selectedIcebergId 
    ? enrichedIcebergs.find(i => i.id === selectedIcebergId) 
    : undefined;

  const handleSelectRow = (ib: Iceberg) => {
    setSelectedIcebergId(ib.id);
    setMapFocusTarget([ib.latitude, ib.longitude]);
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
      title="ICEBERGS"
      subtitle="Tracked iceberg monitoring and risk assessment"
      actions={
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Horizon Selector */}
          <div className="flex items-center bg-[#06111e] border border-slate-800 rounded-xs p-0.5">
            {horizonOptions.map((h) => (
              <button
                key={h.hours}
                type="button"
                onClick={() => setSelectedHorizon(h.hours)}
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[10px] font-mono transition-colors",
                  selectedHorizon === h.hours
                    ? "bg-[#12283e] text-sky-300 font-bold border border-[#214972]"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#06111e] border border-slate-800 rounded-xs text-slate-300">
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">DATASET:</span>
            <span className="text-slate-200 font-semibold">{icebergs.length} RECORDS (US NIC)</span>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-3 bg-[#040B14] text-slate-200 font-mono">
        
        {/* ========================================================================= */}
        {/* 1. DOMINANT MAP (UPPER AREA) WITH SELECTED TARGET INSPECTOR               */}
        {/* ========================================================================= */}
        <div className="bg-[#06111e] border border-slate-800 rounded-xs overflow-hidden flex flex-col">
          
          <div className="px-3.5 py-2 bg-[#081524] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-200 font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-sky-400" />
                Tracked Iceberg Targets
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-[11px]">{filteredIcebergs.length} of {icebergs.length} Active in View</span>
            </div>

            {selectedIceberg && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px] uppercase">Selected:</span>
                <span className="text-sky-300 font-bold">{selectedIceberg.id} ({selectedIceberg.name})</span>
                <button
                  type="button"
                  onClick={() => setSelectedIcebergId(null)}
                  className="text-slate-400 hover:text-slate-200 p-0.5 rounded-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="relative w-full h-[380px] lg:h-[420px] bg-[#040B14]">
            <PolarMap
              section="icebergs"
              showRoute={true}
              selectedIcebergId={selectedIceberg?.id || null}
              onSelectIceberg={(id) => setSelectedIcebergId(id)}
              activeHorizon={activeHorizonLabel}
              icebergs={filteredIcebergs}
              focusTarget={mapFocusTarget}
              selectedVesselId={selectedVesselId}
              onSelectVessel={(id) => setSelectedVesselId(id)}
              destinationMarker={selectedDestination ? {
                latitude: selectedDestination.latitude,
                longitude: selectedDestination.longitude,
                name: selectedDestination.name
              } : undefined}
              allRoutes={routes}
              activeRouteId={activeRouteId}
              onSelectRoute={(rId) => setActiveRouteId(rId)}
            />

            {/* Selected Iceberg Floating Inspector Card */}
            {selectedIceberg && (
              <div className="absolute top-3 right-3 z-30 max-w-xs w-full bg-[#06111e] border border-slate-700 p-3 rounded-xs text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-100 font-bold">{selectedIceberg.id}</span>
                    <span className="text-slate-400 text-[10px] truncate max-w-[120px]">{selectedIceberg.name}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-xs font-semibold border",
                    selectedIceberg.risk === 'HIGH' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                    selectedIceberg.risk === 'CAUTION' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  )}>
                    {selectedIceberg.risk} RISK
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Position:</span>
                    <span className="text-slate-200">{Math.abs(selectedIceberg.latitude).toFixed(2)}°S, {Math.abs(selectedIceberg.longitude).toFixed(2)}°{selectedIceberg.longitude >= 0 ? 'E' : 'W'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Drift Velocity:</span>
                    <span className="text-sky-400 font-semibold">{selectedIceberg.velocity} kn {selectedIceberg.direction}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Area / Draft:</span>
                    <span className="text-slate-200">{selectedIceberg.areaKm2} km² · {selectedIceberg.draftEstimate}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Corridor Clearance:</span>
                    <span className="text-emerald-400 font-semibold">{selectedIceberg.distanceToRoute}</span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 pt-1.5 border-t border-slate-800 flex justify-between">
                  <span>Source: {selectedIceberg.sensorSource}</span>
                  <span>Trend: {selectedIceberg.movementTrend}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. FILTERS BAR: ID, Region, Risk, Status                                 */}
        {/* ========================================================================= */}
        <div className="bg-[#06111e] border border-slate-800 p-2.5 rounded-xs text-xs flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Filter by ID */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by Target ID / Name..."
                value={filterId}
                onChange={(e) => setFilterId(e.target.value)}
                className="w-full bg-[#040B14] border border-slate-800 rounded-xs pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-600"
              />
            </div>

            {/* Filter by Region */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase">Region:</span>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="bg-[#040B14] border border-slate-800 rounded-xs px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
              >
                <option value="ALL">All Regions</option>
                <option value="Weddell Sea">Weddell Sea</option>
                <option value="Ross Sea">Ross Sea</option>
                <option value="Prydz Bay / Amery">Prydz Bay / Amery</option>
                <option value="Queen Maud Shelf">Queen Maud Shelf</option>
                <option value="Bellingshausen">Bellingshausen</option>
              </select>
            </div>

            {/* Filter by Risk */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase">Risk:</span>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="bg-[#040B14] border border-slate-800 rounded-xs px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High</option>
                <option value="CAUTION">Caution</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#040B14] border border-slate-800 rounded-xs px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="Moving">Moving</option>
                <option value="Drifting">Drifting</option>
                <option value="Stationary">Stationary</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Showing <span className="text-slate-200 font-bold">{filteredIcebergs.length}</span> targets
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. CLEAN TABULAR LIST: ID, Lat, Lon, Timestamp, Risk, Distance, Status   */}
        {/* ========================================================================= */}
        <div className="bg-[#06111e] border border-slate-800 rounded-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#081524] border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 font-semibold">Iceberg ID</th>
                  <th className="py-2 px-3 font-semibold">Name / Class</th>
                  <th className="py-2 px-3 font-semibold">Latitude</th>
                  <th className="py-2 px-3 font-semibold">Longitude</th>
                  <th className="py-2 px-3 font-semibold">Timestamp / Observed</th>
                  <th className="py-2 px-3 font-semibold">Risk Level</th>
                  <th className="py-2 px-3 font-semibold">Distance to Route</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredIcebergs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500 text-xs">
                      No icebergs match the specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredIcebergs.map((ib) => {
                    const isSelected = selectedIcebergId === ib.id;
                    return (
                      <tr
                        key={ib.id}
                        onClick={() => handleSelectRow(ib)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected
                            ? "bg-[#12283e] text-slate-100 font-semibold"
                            : "hover:bg-[#0a1829] text-slate-300"
                        )}
                      >
                        <td className="py-1.5 px-3 text-slate-200 font-bold flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-xs inline-block rotate-45 shrink-0"
                            style={{
                              backgroundColor: ib.risk === 'HIGH' ? '#EF4444' : ib.risk === 'CAUTION' ? '#F59E0B' : '#06B6D4'
                            }}
                          />
                          {ib.id}
                        </td>
                        <td className="py-1.5 px-3 text-slate-300 truncate max-w-[140px]">{ib.name}</td>
                        <td className="py-1.5 px-3 text-slate-400">{Math.abs(ib.latitude).toFixed(2)}°S</td>
                        <td className="py-1.5 px-3 text-slate-400">{Math.abs(ib.longitude).toFixed(2)}°{ib.longitude >= 0 ? 'E' : 'W'}</td>
                        <td className="py-1.5 px-3 text-slate-400 text-[11px]">{ib.lastObserved || 'Daily 12:00 UTC'}</td>
                        <td className="py-1.5 px-3">
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-xs font-semibold border",
                            ib.risk === 'HIGH' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                            ib.risk === 'CAUTION' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                            "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          )}>
                            {ib.risk}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-sky-400 font-semibold">{ib.distanceToRoute}</td>
                        <td className="py-1.5 px-3 text-slate-400 text-[11px]">{ib.status}</td>
                        <td className="py-1.5 px-3 text-right">
                          <button
                            type="button"
                            className="text-[10px] text-sky-400 hover:text-slate-100 px-2 py-0.5 rounded-xs bg-[#081524] border border-slate-800 hover:border-slate-700"
                          >
                            Focus Target
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-3.5 py-1.5 bg-[#081524] border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>U.S. National Ice Center (US NIC) + BYU Antarctic Iceberg Database</span>
            <span>Hydrodynamic Drift Model: ERA5 Wind + Ocean Currents</span>
          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default IcebergTrackingPage;
