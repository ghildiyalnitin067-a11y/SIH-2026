import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Anchor,
  LayoutGrid,
  Compass,
  Snowflake,
  Target,
  Route as RouteIcon,
  Layers,
  ChevronDown,
  Menu,
  X,
  Clock,
  Bell,
  Radio,
  FileText,
  Activity
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PRIMARY_NAV = [
  { id: 'overview', path: '/overview', icon: LayoutGrid, label: 'Overview' },
  { id: 'navigation', path: '/navigation', icon: Compass, label: 'Navigation' },
  { id: 'sea-ice', path: '/sea-ice', icon: Snowflake, label: 'Sea-Ice' },
  { id: 'icebergs', path: '/icebergs', icon: Target, label: 'Icebergs' },
  { id: 'routes', path: '/routes', icon: RouteIcon, label: 'Routes' },
];

const SECONDARY_NAV = [
  { id: 'intelligence', path: '/intelligence', icon: Layers, label: 'Model Intelligence', desc: 'Decision explanations & benchmarks' },
  { id: 'analysis', path: '/analysis', icon: Activity, label: 'Risk & POLARIS', desc: 'IMO Polar Code safety index' },
  { id: 'alerts', path: '/alerts', icon: Bell, label: 'Active Alerts', desc: 'Tactical warning logs' },
  { id: 'reports', path: '/reports', icon: FileText, label: 'Compliance Reports', desc: 'IMO voyage plans & documentation' },
];

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [intelDropdownOpen, setIntelDropdownOpen] = useState(false);
  const [provenanceModalOpen, setProvenanceModalOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [utcTime, setUtcTime] = useState('');
  const [activeAlertsCount, setActiveAlertsCount] = useState(2);
  const location = useLocation();

  const isIntelActive = ['/intelligence', '/analysis', '/alerts', '/reports'].some(p => location.pathname.startsWith(p));

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Fetch live alerts count
    api.alerts().then((res) => {
      if (res?.alerts) {
        const count = res.alerts.filter(
          (a: any) => !a.acknowledged && (a.severity === 'HIGH' || a.severity === 'CRITICAL' || a.severity === 'CAUTION')
        ).length;
        setActiveAlertsCount(count);
      }
    }).catch(() => {});

    // Fetch real-time health from backend
    fetch('/api/realtime/health')
      .then((r) => r.json())
      .then((data) => setSystemHealth(data))
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const isSystemHealthy = systemHealth?.overall_status === 'ONLINE' || systemHealth?.startup_ready;

  return (
    <div className="flex flex-col h-screen bg-navy text-ice-white font-sans overflow-hidden select-none">
      
      {/* ========================================================================= */}
      {/* 1. UNIFIED HORIZONTAL MARITIME NAVBAR                                    */}
      {/* ========================================================================= */}
      <header className="h-12 bg-polar-navy/20 border-b border-slate/20 flex items-center justify-between px-3 sm:px-5 z-40 shrink-0 font-mono text-xs">
        
        {/* LEFT: Brand + Primary Horizontal Navigation */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90"
            title="Return to PolarNav Landing Briefing"
          >
            <div className="w-6 h-6 rounded-sm bg-polar-navy/80 border border-glacial-blue/40 flex items-center justify-center group-hover:border-glacial-blue transition-colors">
              <Anchor className="w-3.5 h-3.5 text-glacial-blue" />
            </div>
            <span className="font-bold tracking-wider text-xs sm:text-sm text-ice-white font-mono uppercase">
              POLAR<span className="text-glacial-blue">NAV</span>
            </span>
          </Link>

          <span className="text-slate-700 hidden lg:inline">|</span>

          {/* DESKTOP HORIZONTAL MENU */}
          <nav className="hidden md:flex items-center gap-1 bg-polar-navy/40 p-1 rounded-sm border border-slate/20">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono transition-all",
                    isActive
                      ? "bg-glacial-blue/20 text-ice-blue font-semibold border border-glacial-blue/40"
                      : "text-slate-300 hover:text-white hover:bg-polar-navy/60"
                  )
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Intelligence & Logs Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIntelDropdownOpen(!intelDropdownOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono transition-all cursor-pointer",
                  isIntelActive || intelDropdownOpen
                    ? "bg-glacial-blue/20 text-ice-blue font-semibold border border-glacial-blue/40"
                    : "text-slate-300 hover:text-white hover:bg-polar-navy/60"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Intelligence &amp; Logs</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform opacity-70", intelDropdownOpen && "rotate-180")} />
              </button>

              {intelDropdownOpen && (
                <div 
                  className="absolute left-0 mt-1.5 w-60 bg-navy border border-slate/30 rounded-sm shadow-xl py-1.5 z-50 font-mono"
                  onMouseLeave={() => setIntelDropdownOpen(false)}
                >
                  <div className="px-3 py-1 border-b border-slate/20 text-[9px] text-glacial-blue uppercase font-bold tracking-wider">
                    Operational Intelligence
                  </div>
                  {SECONDARY_NAV.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setIntelDropdownOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-polar-navy/70",
                          isActive ? "text-ice-blue font-semibold bg-polar-navy/50" : "text-slate-300"
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* RIGHT: Status, UTC Clock, Alerts, Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono">
          
          {/* SYSTEM HEALTH */}
          <button
            type="button"
            onClick={() => setProvenanceModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-polar-navy/40 border border-slate/20 hover:border-glacial-blue/50 transition-colors cursor-pointer"
            title="System Provider & Sensor Health Audit"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold hidden sm:inline">SYSTEM:</span>
            <span className={cn('text-[10px] font-bold tracking-wider', isSystemHealthy ? 'text-emerald-400' : 'text-amber-400')}>
              {isSystemHealthy ? 'ONLINE' : 'DEGRADED'}
            </span>
          </button>

          {/* UTC CLOCK */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-polar-navy/40 border border-slate/20 text-slate-300 text-[11px]">
            <Clock className="w-3 h-3 text-glacial-blue" />
            <span className="font-semibold text-slate-200">
              {utcTime || 'UTC --:--:--'}
            </span>
          </div>

          {/* ACTIVE ALERTS */}
          <Link
            to="/alerts"
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer',
              activeAlertsCount > 0
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                : 'bg-polar-navy/40 border-slate/20 text-slate-400 hover:text-slate-200'
            )}
            title="Active Operational Warnings"
          >
            <Bell className={cn('w-3 h-3', activeAlertsCount > 0 ? 'text-amber-400' : 'text-slate-400')} />
            <span className="text-[10px] font-bold tracking-wider">
              ALERTS {String(activeAlertsCount).padStart(2, '0')}
            </span>
          </Link>

          {/* MOBILE TOGGLE */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 rounded bg-polar-navy border border-slate/30 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE DROPDOWN MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy border-b border-slate/20 p-3 space-y-1 z-50 font-mono text-xs animate-in fade-in">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-sm",
                  isActive ? "bg-glacial-blue/20 text-ice-blue font-semibold" : "text-slate-300 hover:text-white"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <div className="pt-2 border-t border-slate/20 text-[10px] text-slate-500 px-3 uppercase font-bold">
            Intelligence Modules
          </div>
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-sm",
                  isActive ? "bg-glacial-blue/20 text-ice-blue font-semibold" : "text-slate-300 hover:text-white"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STANDARDIZED PAGE HEADER BAR (If title is provided)                    */}
      {/* ========================================================================= */}
      {title && (
        <div className="h-10 bg-polar-navy/20 border-b border-slate/20 px-3 sm:px-5 flex items-center justify-between shrink-0 font-mono text-xs z-30">
          <div className="flex items-center gap-3 truncate">
            <h1 className="text-xs font-bold uppercase tracking-wider text-ice-white shrink-0">
              {title}
            </h1>
            {subtitle && (
              <>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 text-[11px] truncate hidden sm:inline font-sans">
                  {subtitle}
                </span>
              </>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN APPLICATION WORKSPACE CONTENT                                    */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* DATA AUDIT & PROVENANCE MODAL */}
      {provenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
          <div className="bg-polar-navy/30 border border-slate/30 rounded-sm shadow-2xl max-w-lg w-full p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate/20">
              <span className="font-bold text-ice-white flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-glacial-blue" />
                SYSTEM &amp; SENSOR DATA AUDIT
              </span>
              <button
                type="button"
                onClick={() => setProvenanceModalOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-center justify-between p-2 bg-polar-navy/30 rounded border border-slate/20">
                <span className="text-slate-400">Tracked Icebergs</span>
                <span className="text-ice-white font-bold">85 Records (BYU MERS / US NIC)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-polar-navy/30 rounded border border-slate/20">
                <span className="text-slate-400">Sea Ice Concentration</span>
                <span className="text-ice-white font-bold">NOAA CoastWatch CDR V4 AMSR2</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-polar-navy/30 rounded border border-slate/20">
                <span className="text-slate-400">Radar Imagery</span>
                <span className="text-ice-white font-bold">ESA Sentinel-1 SAR C-Band</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-polar-navy/30 rounded border border-slate/20">
                <span className="text-slate-400">Marine Meteorological</span>
                <span className="text-ice-white font-bold">ECMWF ERA5 / Copernicus CMEMS</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-polar-navy/30 rounded border border-slate/20">
                <span className="text-slate-400">Polar Code Compliance</span>
                <span className="text-ice-white font-bold">IMO POLARIS Res. MSC.385(94)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate/20 flex justify-end">
              <button
                type="button"
                onClick={() => setProvenanceModalOpen(false)}
                className="px-3 py-1 bg-polar-navy hover:bg-polar-navy/80 text-ice-white rounded text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AppShell;
