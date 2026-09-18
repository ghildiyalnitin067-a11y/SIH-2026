import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Route as RouteIcon,
  CheckCircle2,
  Ship
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useApiData } from "../../hooks/useApiData";
import { useFleet } from "../../context/FleetContext";
import { api } from '../../services/api';
import { cn } from '../../utils/cn';

interface AlertItem {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'CAUTION' | 'RESOLVED' | 'INFO';
  timestamp: string;
  location: string;
  source: string;
  acknowledged: boolean;
  recommendedAction: string;
}

const FALLBACK_ALERTS: AlertItem[] = [
  {
    id: 'ALT-2026-001',
    type: 'ICEBERG_CPA_VIOLATION',
    title: 'Iceberg A-17 Within 15km CPA Threshold',
    description: 'Drift trajectory intersects planned route at WP-03 in 8.4 hours. Current separation: 14.2 km.',
    severity: 'HIGH',
    timestamp: '14:23 UTC',
    location: '67.8°S, 54.2°W',
    source: 'Radar & NIC Satellite Tracking',
    acknowledged: false,
    recommendedAction: 'Execute Route B deviation (+4.4% distance) to maintain 28km safe perimeter.'
  },
  {
    id: 'ALT-2026-002',
    type: 'SEA_ICE_COMPRESSION',
    title: 'Rapid Pack Ice Compaction in Sector SEC-03',
    description: 'Sustained 24 kn NE winds driving first-year floes against coastal fast ice boundary.',
    severity: 'CAUTION',
    timestamp: '12:05 UTC',
    location: '69.5°S, 14.0°E',
    source: 'Sentinel-1 SAR + ERA5 Wind Stress',
    acknowledged: false,
    recommendedAction: 'Reduce vessel transit speed to 8.5 kn. Engage Polar Class PC5 power boost.'
  }
];

export const AlertsPage: React.FC = () => {
  const { selectedVessel } = useFleet();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [alerts, setAlerts] = useState<AlertItem[]>(FALLBACK_ALERTS);
  useApiData();

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await api.alerts();
        if (res?.alerts?.length) {
          const normalized = res.alerts.map((a: any) => ({
            id: a.id || 'ALT-001',
            type: a.type || a.category || 'HAZARD',
            title: a.title || 'Navigation Alert',
            description: a.description || '',
            severity: a.severity || 'CAUTION',
            timestamp: a.timeRelative || (a.timestamp ? a.timestamp.slice(11, 16) + ' UTC' : 'Recent'),
            location: a.location || 'Current Sector',
            source: a.source || 'Polar Radar & Satellite Sensor Fusion',
            acknowledged: Boolean(a.acknowledged),
            recommendedAction: a.recommendedAction || a.mitigation || 'Maintain active radar watch and adjust heading as necessary.'
          }));
          setAlerts(normalized);
        }
      } catch (e) {
        console.error('Failed to load alerts:', e);
      }
    }
    loadAlerts();
  }, []);

  const toggleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: !a.acknowledged } : a));
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'ACTIVE') return !a.acknowledged && a.severity !== 'RESOLVED';
    return a.severity === filterSeverity;
  });

  const activeCriticalCount = alerts.filter(a => !a.acknowledged && (a.severity === 'HIGH' || a.severity === 'CAUTION')).length;

  return (
    <AppShell
      title="TACTICAL ALERTS"
      subtitle={`Real-Time Proximity Warnings & Incident Mitigation • Fleet Context: ${selectedVessel.name}`}
      actions={
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#06111e] border border-slate-800 rounded-xs text-slate-300">
            <Ship className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">VESSEL:</span>
            <span className="text-slate-200 font-semibold">{selectedVessel.name.split(' ')[0]}</span>
          </div>
          <span className="text-slate-400">STATUS:</span>
          <span className={cn("font-semibold", activeCriticalCount > 0 ? "text-red-400" : "text-emerald-400")}>
            {activeCriticalCount > 0 ? `${activeCriticalCount} ACTIVE THREATS` : "ALL HAZARDS MITIGATED"}
          </span>
        </div>
      }
    >
      <div className="h-full overflow-y-auto custom-scrollbar p-3 md:p-4 max-w-5xl mx-auto space-y-3 bg-[#040B14]">
        
        {/* Top Header & Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-200 font-mono uppercase tracking-wider">Active Navigation Hazards</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{activeCriticalCount > 0 ? `${activeCriticalCount} unacknowledged — immediate attention required` : 'All hazards acknowledged or resolved'}</p>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs bg-[#06111e] p-0.5 rounded-xs border border-slate-800">
            {(['ALL', 'ACTIVE', 'HIGH', 'CAUTION', 'RESOLVED'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={cn(
                  "px-2.5 py-1 rounded-xs text-[10px] transition-colors uppercase",
                  filterSeverity === sev
                    ? "bg-[#12283e] text-sky-300 border border-[#214972] font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Cards */}
        <div className="space-y-2.5 font-mono">
          {filteredAlerts.map((alert) => {
            const isHigh = alert.severity === 'HIGH';
            const isCaution = alert.severity === 'CAUTION';

            return (
              <div
                key={alert.id}
                className={cn(
                  "border rounded-xs p-3 space-y-2.5 transition-colors",
                  alert.acknowledged
                    ? "bg-[#06111e]/60 border-slate-800 opacity-60"
                    : isHigh
                    ? "bg-[#081524] border-red-500/30"
                    : isCaution
                    ? "bg-[#081524] border-amber-500/30"
                    : "bg-[#06111e] border-slate-800"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-xs mt-0.5 border",
                      isHigh ? "bg-red-500/10 text-red-400 border-red-500/30" : isCaution ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                    )}>
                      {isHigh ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{alert.id}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-xs text-[9px] font-semibold border",
                          isHigh ? "text-red-400 border-red-500/30 bg-red-500/10" : isCaution ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        )}>
                          {alert.severity}
                        </span>
                        {alert.acknowledged && (
                          <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> ACKNOWLEDGED
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-100 mt-1 font-sans">{alert.title}</h4>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed font-sans">{alert.description}</p>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 shrink-0">{alert.timestamp}</span>
                </div>

                <div className="bg-[#040B14] p-2.5 rounded-xs border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">RECOMMENDED MITIGATION:</div>
                    <div className="text-sky-400 font-sans text-xs">{alert.recommendedAction}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAcknowledge(alert.id)}
                      className="px-2.5 py-1 rounded-xs border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-[#081524] transition-colors text-xs"
                    >
                      {alert.acknowledged ? "Unmark" : "Acknowledge"}
                    </button>
                    <Link
                      to="/navigation"
                      className="flex items-center gap-1.5 bg-[#12283e] hover:bg-[#1a3857] text-sky-300 border border-[#214972] font-semibold px-3 py-1 rounded-xs text-xs transition-colors"
                    >
                      <RouteIcon className="w-3.5 h-3.5" />
                      <span>Mitigate Route</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AppShell>
  );
};

export default AlertsPage;
