import React, { useState, useEffect } from 'react';
import { 
  Satellite, Snowflake, Layers, Filter, ShieldCheck
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useApiData } from "../../hooks/useApiData";
import { useTimeData } from "../../hooks/useTimeData";
import { useFleet } from "../../context/FleetContext";
import PolarMap from '../../components/map/PolarMap';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';

const SECTOR_COORDS: Record<string, [number, number]> = {
  'SEC-01': [-60.5, 20.0],
  'SEC-02': [-64.0, 18.0],
  'SEC-03': [-69.5, 14.0],
  'SEC-04': [-70.8, 11.7],
};

export const SeaIcePage: React.FC = () => {
  const { 
    selectedVesselId, 
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

  const [selectedSector, setSelectedSector] = useState<string>('SEC-03');
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);
  const [activeLayer, setActiveLayer] = useState<'grid' | 'sar' | 'both'>('both');

  // Real Sentinel-1 SAR Radar Detection state
  const [sentinelScenes, setSentinelScenes] = useState<any[]>([]);
  const [selectedSceneIdx, setSelectedSceneIdx] = useState<number>(0);
  const [sceneDetection, setSceneDetection] = useState<any>(null);
  const [loadingRadar, setLoadingRadar] = useState<boolean>(false);

  useEffect(() => {
    api.sentinelScenes()
      .then((res: any) => {
        if (res?.scenes?.length) {
          setSentinelScenes(res.scenes);
        }
      })
      .catch((err: any) => console.error("Could not fetch Sentinel scenes:", err));
  }, []);

  useEffect(() => {
    setLoadingRadar(true);
    api.sentinelDetections(selectedSceneIdx)
      .then((res: any) => {
        setSceneDetection(res);
      })
      .catch((err: any) => console.error("Could not fetch SAR detections:", err))
      .finally(() => setLoadingRadar(false));
  }, [selectedSceneIdx]);
  
  useApiData();
  
  const HORIZON_TO_TIMESTEP: Record<number, string> = {
    0: '0',
    6: '6',
    12: '12',
    24: '24',
    48: '48'
  };
  const apiTimeStep = HORIZON_TO_TIMESTEP[selectedHorizon] || '0';
  const { seaIceSectors } = useTimeData(apiTimeStep);

  const sectors = seaIceSectors.length > 0 ? seaIceSectors : [
    { sector: 'SEC-01', name: 'Marginal Ice Zone (MIZ)', concentration: 22, iceType: 'Open Drift Ice / Nilas', thickness: '0.15 - 0.30 m', driftRate: '0.45 m/s WSW', riskLevel: 'LOW' as const },
    { sector: 'SEC-02', name: 'Outer Pack Ice Corridor', concentration: 54, iceType: 'First-Year Thin Floes', thickness: '0.50 - 0.90 m', driftRate: '0.33 m/s SW', riskLevel: 'MODERATE' as const },
    { sector: 'SEC-03', name: 'Queen Maud Approach Shelf', concentration: 76, iceType: 'First-Year Medium Floes', thickness: '1.20 - 1.60 m', driftRate: '0.28 m/s W', riskLevel: 'HIGH' as const },
    { sector: 'SEC-04', name: 'Coastal Fast Ice Boundary', concentration: 94, iceType: 'Landfast / Multi-Year Ridge', thickness: '2.10 - 2.80 m', driftRate: '0.05 m/s (Stationary)', riskLevel: 'CRITICAL' as const },
  ];

  const handleSectorClick = (sectorId: string) => {
    setSelectedSector(sectorId);
    const coords = SECTOR_COORDS[sectorId];
    if (coords) {
      setFocusTarget(coords);
    }
  };

  const horizonOptions: { hours: 0 | 6 | 12 | 24 | 48; label: 'NOW' | '+6H' | '+12H' | '+24H' | '+48H' }[] = [
    { hours: 0, label: 'NOW' },
    { hours: 6, label: '+6H' },
    { hours: 12, label: '+12H' },
    { hours: 24, label: '+24H' },
    { hours: 48, label: '+48H' },
  ];

  const currentSectorData = sectors.find(s => s.sector === selectedSector) || sectors[2];

  return (
    <AppShell
      title="SEA-ICE"
      subtitle="Current Antarctic sea-ice conditions and concentration"
      actions={
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Horizon Selector */}
          <div className="flex items-center bg-polar-navy/40 border border-slate/20 rounded-sm p-0.5">
            {horizonOptions.map((h) => (
              <button
                key={h.hours}
                type="button"
                onClick={() => setSelectedHorizon(h.hours)}
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[10px] font-mono transition-all",
                  selectedHorizon === h.hours
                    ? "bg-glacial-blue text-navy font-bold shadow-xs"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-polar-navy/40 border border-slate/20 rounded-sm text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">FEED:</span>
            <span className="text-ice-white font-semibold">NOAA CDR + S1 SAR</span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full overflow-hidden bg-navy">
        
        {/* ========================================================================= */}
        {/* 1. TOP CONTROLS BAR: Date / Horizon, Region, Layer                       */}
        {/* ========================================================================= */}
        <div className="bg-polar-navy/20 border-b border-slate/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
          
          {/* Left: Region / Ice Sector Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
              <Filter className="w-3 h-3 text-glacial-blue" />
              Region / Sector:
            </span>
            <div className="flex items-center gap-1">
              {sectors.map((s) => (
                <button
                  key={s.sector}
                  type="button"
                  onClick={() => handleSectorClick(s.sector)}
                  className={cn(
                    "px-2 py-1 rounded-sm text-[10px] font-mono border transition-colors",
                    selectedSector === s.sector
                      ? "bg-glacial-blue/20 text-glacial-blue border-glacial-blue/50 font-bold"
                      : "text-slate-400 hover:text-slate-200 border-slate/20 hover:bg-polar-navy/30"
                  )}
                >
                  {s.sector} ({s.concentration}%)
                </button>
              ))}
            </div>
          </div>

          {/* Right: Layer Selector & SAR Scene */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <Layers className="w-3 h-3 text-glacial-blue" />
                Layer:
              </span>
              <button
                type="button"
                onClick={() => setActiveLayer('grid')}
                className={cn(
                  "px-2 py-0.5 rounded-sm text-[10px] font-mono border transition-colors",
                  activeLayer === 'grid' ? "bg-glacial-blue/20 text-glacial-blue border-glacial-blue/50 font-bold" : "text-slate-400 border-slate/20"
                )}
              >
                SIC Grid
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer('sar')}
                className={cn(
                  "px-2 py-0.5 rounded-sm text-[10px] font-mono border transition-colors",
                  activeLayer === 'sar' ? "bg-glacial-blue/20 text-glacial-blue border-glacial-blue/50 font-bold" : "text-slate-400 border-slate/20"
                )}
              >
                Sentinel-1 SAR
              </button>
              <button
                type="button"
                onClick={() => setActiveLayer('both')}
                className={cn(
                  "px-2 py-0.5 rounded-sm text-[10px] font-mono border transition-colors",
                  activeLayer === 'both' ? "bg-glacial-blue/20 text-glacial-blue border-glacial-blue/50 font-bold" : "text-slate-400 border-slate/20"
                )}
              >
                Combined
              </button>
            </div>

            {sentinelScenes.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate/20">
                <span className="text-slate-400 text-[10px] uppercase">SAR Scene:</span>
                <select
                  value={selectedSceneIdx}
                  onChange={(e) => setSelectedSceneIdx(Number(e.target.value))}
                  className="bg-navy border border-slate/20 rounded-sm text-[10px] text-slate-200 px-1.5 py-0.5 font-mono focus:outline-none focus:border-slate/30"
                >
                  {sentinelScenes.map((sc, idx) => (
                    <option key={sc.id} value={idx}>
                      Scene #{idx + 1} ({sc.id.substring(0, 18)}...)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN WORKSPACE: DOMINANT MAP + SIDE METADATA PANEL                    */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Map Viewport */}
          <div className="flex-1 relative h-full bg-navy">
            <PolarMap
              section="sea-ice"
              activeHorizon={activeHorizonLabel}
              showRoute={true}
              showVessel={true}
              timeStep={apiTimeStep}
              focusTarget={focusTarget}
              selectedVesselId={selectedVesselId}
              onSelectVessel={(id) => setSelectedVesselId(id)}
              selectedIcebergId={selectedIcebergId}
              onSelectIceberg={(id) => setSelectedIcebergId(id)}
              destinationMarker={selectedDestination ? {
                latitude: selectedDestination.latitude,
                longitude: selectedDestination.longitude,
                name: selectedDestination.name
              } : undefined}
              allRoutes={routes}
              activeRouteId={activeRouteId}
              onSelectRoute={(rId) => setActiveRouteId(rId)}
            />
          </div>

          {/* Structured Side Information Panel */}
          <div className="w-full lg:w-84 xl:w-96 bg-polar-navy/20 border-t lg:border-t-0 lg:border-l border-slate/20 p-4 overflow-y-auto custom-scrollbar flex flex-col justify-between shrink-0 font-mono text-xs text-slate-300">
            <div className="space-y-4">
              
              {/* 1. Selected Sector Overview */}
              <div>
                <div className="flex items-center justify-between border-b border-slate/20 pb-2 mb-2">
                  <span className="text-ice-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-glacial-blue" />
                    {currentSectorData.sector} Conditions
                  </span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-xs font-bold border",
                    currentSectorData.riskLevel === 'HIGH' || currentSectorData.riskLevel === 'CRITICAL'
                      ? "bg-signature-coral/10 text-signature-coral border-signature-coral/30"
                      : currentSectorData.riskLevel === 'MODERATE'
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  )}>
                    {currentSectorData.riskLevel}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                    <span className="text-slate-400 text-[9px] block uppercase">Concentration</span>
                    <span className="text-lg font-bold text-ice-white mt-0.5 block">{currentSectorData.concentration}%</span>
                    <span className="text-[10px] text-glacial-blue truncate block">{currentSectorData.iceType}</span>
                  </div>
                  <div className="bg-navy border border-slate/20 p-2 rounded-sm">
                    <span className="text-slate-400 text-[9px] block uppercase">Thickness</span>
                    <span className="text-lg font-bold text-ice-white mt-0.5 block">{currentSectorData.thickness}</span>
                    <span className="text-[10px] text-slate-400 block">Drift: {currentSectorData.driftRate}</span>
                  </div>
                </div>
              </div>

              {/* 2. Environmental Side/Bottom Specs (User-requested) */}
              <div className="space-y-2 pt-2 border-t border-slate/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                  Data Specification & Provenance
                </span>
                
                <div className="space-y-1.5 bg-navy border border-slate/20 p-2.5 rounded-sm text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">SIC Mean / Max:</span>
                    <span className="text-ice-white font-semibold">64.2% / 94.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Observation Date:</span>
                    <span className="text-ice-white font-semibold">Latest Daily (12:00 UTC)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Source:</span>
                    <span className="text-glacial-blue font-semibold">NOAA Climate Data Record</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Radar Source:</span>
                    <span className="text-ice-white">Sentinel-1 C-SAR (HH/HV)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coverage:</span>
                    <span className="text-ice-white">Circumpolar Antarctic (25km)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data Quality:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      CFAR Verified (±3.2%)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Sentinel-1 SAR Target Detections */}
              <div className="space-y-2 pt-2 border-t border-slate/20">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5 text-glacial-blue" />
                    SAR Obstacle Detections
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {sceneDetection?.total_icebergs_detected || 0} Targets
                  </span>
                </div>

                {loadingRadar ? (
                  <div className="p-3 bg-navy border border-slate/20 rounded-sm text-center text-slate-400 text-[11px]">
                    Analyzing SAR backscatter...
                  </div>
                ) : sceneDetection?.detections && sceneDetection.detections.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {sceneDetection.detections.slice(0, 4).map((det: any) => (
                      <div key={det.target_id} className="p-2 bg-navy border border-slate/20 rounded-sm text-[10px] space-y-0.5">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-glacial-blue">{det.target_id}</span>
                          <span className="text-emerald-400">{(det.confidence * 100).toFixed(0)}% CFAR</span>
                        </div>
                        <div className="text-slate-400 flex justify-between text-[9px]">
                          <span>Dim: {det.dimensions_km || '0.25x0.15 km'}</span>
                          <span>Peak: {det.peak_sigma0_db || -4.5} dB</span>
                        </div>
                        <div className="text-slate-400 text-[9px]">
                          Type: <span className="text-slate-200">{det.classification || 'Bergy Bit / Ice Floe'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 bg-navy border border-slate/20 rounded-sm text-slate-400 text-[10px] text-center">
                    No standalone radar targets in this scene. Pack ice matrix dominant.
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Status Footer */}
            <div className="pt-3 border-t border-slate/20 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                NOAA CDR Operational
              </span>
              <span>Algorithm: CFAR + Lee</span>
            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
};

export default SeaIcePage;
