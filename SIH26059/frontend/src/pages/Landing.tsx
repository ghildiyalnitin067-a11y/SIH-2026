import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  Anchor, 
  LayoutGrid, 
  Compass, 
  Snowflake, 
  Target, 
  Activity, 
  Route as RouteIcon, 
  Bell, 
  FileText,
  ChevronDown,
  Menu,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils/cn';

const primaryNav = [
  { id: 'overview', path: '/overview', icon: LayoutGrid, label: 'Overview' },
  { id: 'navigation', path: '/navigation', icon: Compass, label: 'Navigation' },
  { id: 'sea-ice', path: '/sea-ice', icon: Snowflake, label: 'Sea-Ice' },
  { id: 'icebergs', path: '/icebergs', icon: Target, label: 'Icebergs' },
  { id: 'routes', path: '/routes', icon: RouteIcon, label: 'Routes' },
];

const secondaryNav = [
  { id: 'intelligence', path: '/intelligence', icon: Activity, label: 'Intelligence & Logs', desc: 'Decision explanation & provenance' },
  { id: 'analysis', path: '/analysis', icon: Activity, label: 'Risk Analysis', desc: 'Hydro-Ice simulation & hazard index' },
  { id: 'alerts', path: '/alerts', icon: Bell, label: 'Active Alerts', desc: 'Emergency proximity & ice warnings' },
  { id: 'reports', path: '/reports', icon: FileText, label: 'IMO Reports', desc: 'Polar Code compliance documentation' },
];

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#040B14] text-slate-100 font-sans selection:bg-sky-600 selection:text-white">
      {/* Streamlined Navbar */}
      <nav
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-200 border-b border-slate-800/60 bg-[#06111e]/90 backdrop-blur-md",
          scrolled 
            ? "py-2.5 shadow-sm" 
            : "py-3"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          {/* Brand */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:border-sky-500/50 transition-colors">
              <Anchor className="w-4 h-4 text-sky-400 group-hover:text-white transition-colors" />
            </div>
            <span className="font-bold tracking-wider text-sm sm:text-base text-slate-100 font-mono uppercase">
              POLAR<span className="text-sky-400">NAV</span>
            </span>
          </NavLink>

          {/* Desktop Streamlined Capsule Nav */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800/60">
            {primaryNav.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    isActive
                      ? "bg-sky-500/20 text-sky-300 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                  )
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Dropdown for Secondary Tools */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                  toolsDropdownOpen 
                    ? "bg-sky-500/20 text-sky-300 font-semibold" 
                    : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>More</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform opacity-70", toolsDropdownOpen && "rotate-180")} />
              </button>

              {toolsDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-[#06111e]/95 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in"
                  onMouseLeave={() => setToolsDropdownOpen(false)}
                >
                  <div className="px-3 pb-2 mb-1 border-b border-slate-800/60 text-[11px] text-slate-400 font-medium">
                    Analytical & Safety Modules
                  </div>
                  {secondaryNav.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setToolsDropdownOpen(false)}
                      className="flex items-start gap-3 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors group"
                    >
                      <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800 mt-0.5 group-hover:border-sky-500/40">
                        <item.icon className="w-3.5 h-3.5 text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-100">{item.label}</span>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Button */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/overview"
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800/60 bg-[#06111e] px-4 py-4 mt-3">
            <div className="text-xs text-slate-400 font-medium mb-2.5">
              Navigation Modules
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[...primaryNav, ...secondaryNav].map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/40 border border-slate-800/60 transition-colors"
                >
                  <item.icon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-between pt-24">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-antarctic-vessel.jpg"
            alt="Antarctic Research Vessel"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-hero-gradient" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full my-auto py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 text-sky-400 font-mono text-xs tracking-widest">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" /> DATA STREAM ACTIVE</span>
              <span>•</span>
              <span>68°18'S 12°28'E</span>
              <span>•</span>
              <span>{new Date().toISOString().split('T')[1].substring(0, 5)} UTC</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 leading-[1.1] text-white">
              POLAR<span className="text-sky-400">NAV</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl font-normal text-slate-300 mb-6 tracking-wide max-w-2xl">
              INTELLIGENT NAVIGATION & SAFETY
            </p>
            
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              AI-powered sea-ice monitoring, iceberg trajectory forecasting, environmental risk assessment, and navigation decision support for Antarctic operations.
            </p>
          </div>
        </div>

        {/* Hero Metrics */}
        <div className="relative z-10 w-full border-t border-slate-800/60 bg-[#06111e]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <p className="text-slate-400 text-xs font-mono mb-1 tracking-widest">SEA-ICE MONITORING</p>
              <p className="text-slate-100 font-semibold text-sm md:text-base">Continuous</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-mono mb-1 tracking-widest">ICEBERG FORECAST</p>
              <p className="text-slate-100 font-semibold text-sm md:text-base">24–48 H</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-mono mb-1 tracking-widest">RISK ANALYSIS</p>
              <p className="text-slate-100 font-semibold text-sm md:text-base">Multi-layer</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-mono mb-1 tracking-widest">ROUTE OPTIMIZATION</p>
              <p className="text-slate-100 font-semibold text-sm md:text-base">AI-assisted</p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Sections */}
      <section id="overview" className="py-24 border-b border-slate-800/50 relative overflow-hidden bg-[#040B14]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-xs font-mono text-sky-400 tracking-widest mb-3 uppercase">01 // OBSERVE</h2>
              <h3 className="text-3xl sm:text-4xl font-bold mb-6 text-white">Observe the Environment</h3>
              <p className="text-slate-300 text-base leading-relaxed mb-8">
                The system brings sea ice, iceberg, weather and ocean information into a unified view. Real-time satellite imagery combined with telemetry from the field forms a complete geospatial picture.
              </p>
              <div className="space-y-3 text-sm">
                {['Sea ice concentration', 'Iceberg locations', 'Wind and ocean current vectors', 'Temperature profiles'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-square md:aspect-[4/3] bg-[#06111e] rounded-xl overflow-hidden border border-slate-800/50 shadow-xs">
               <img
                 src="/images/observe-antarctica.jpg"
                 alt="Antarctic Sea Ice Observation"
                 className="w-full h-full object-cover"
               />
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="py-24 border-b border-slate-800/50 bg-[#06111e]/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center flex-row-reverse">
             <div className="order-2 md:order-1 relative aspect-square md:aspect-[4/3] bg-[#040B14] rounded-xl overflow-hidden border border-slate-800/50 p-6 sm:p-8 flex flex-col justify-end group shadow-xs">
                <div className="absolute inset-0 z-0">
                  <img
                    src="/images/icebreaker-channel.jpg"
                    alt="Antarctic Sea Ice and Vessel Channel"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-hero-gradient" />
                </div>
                <div className="bg-[#06111e]/95 backdrop-blur-md border border-slate-700/60 p-5 rounded-xl w-full sm:w-5/6 shadow-xl z-10 relative space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <h4 className="text-xs text-sky-400 font-semibold tracking-wide font-mono">ICEBERG A-17</h4>
                    <span className="text-[10px] bg-rose-500/15 text-rose-400 px-2.5 py-0.5 rounded-full font-medium">
                      CPA THREAT
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-200 font-mono">
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span className="text-slate-400">Velocity</span>
                      <span>0.42 knots</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span className="text-slate-400">Direction</span>
                      <span>NE</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span className="text-slate-400">24H Forecast</span>
                      <span className="text-amber-400 font-semibold">+18.4 km</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-400">Confidence</span>
                      <span className="text-sky-300 font-semibold">87%</span>
                    </div>
                  </div>
                </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-xs font-mono text-sky-400 tracking-widest mb-3 uppercase">02 // PREDICT</h2>
              <h3 className="text-3xl sm:text-4xl font-bold mb-6 text-white">Predict where the Ice is going</h3>
              <p className="text-slate-300 text-base leading-relaxed mb-6">
                Understand the trajectory. Our AI models analyze historical drift, current ocean conditions, and wind parameters to forecast the movement of hazardous icebergs over a 48-hour horizon.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                The prediction uncertainty corridor transparently represents the AI's confidence, ensuring operational safety without assuming perfect accuracy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="intelligence" className="py-24 bg-[#040B14]">
         <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-xs font-mono text-sky-400 tracking-widest mb-3 uppercase">03 // ASSESS & NAVIGATE</h2>
            <h3 className="text-3xl sm:text-4xl font-bold mb-6 text-white">From Observation to Decision</h3>
            <p className="text-slate-300 text-base leading-relaxed mb-12">
              The system does not simply visualize environmental data; it converts it into actionable navigation intelligence. Route recommendations balance minimal transit time with critical safety considerations.
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-left">
               <div className="bg-[#06111e]/90 border border-slate-800/50 p-5 rounded-xl shadow-xs">
                  <h4 className="font-semibold text-xs mb-2 text-slate-200">ROUTE A — Shortest</h4>
                  <p className="text-2xl font-mono mb-3 text-slate-100 font-bold">842 km</p>
                  <p className="text-rose-400 text-xs font-medium mb-2">HIGH RISK</p>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div className="w-4/5 h-full bg-rose-500 rounded-full" /></div>
               </div>
               <div className="bg-slate-900/80 border border-sky-500/40 p-5 rounded-xl transform md:-translate-y-2 shadow-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-xs text-sky-300">ROUTE B</h4>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-medium">RECOMMENDED</span>
                  </div>
                  <p className="text-2xl font-mono mb-3 text-white font-bold">879 km</p>
                  <p className="text-emerald-400 text-xs font-medium mb-2">OPTIMAL RISK</p>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div className="w-1/4 h-full bg-emerald-500 rounded-full" /></div>
                  <p className="text-xs text-slate-400 mt-4 border-t border-slate-800/60 pt-3">+4.4% distance → 52% lower ice-related risk.</p>
               </div>
               <div className="bg-[#06111e]/90 border border-slate-800/50 p-5 rounded-xl shadow-xs">
                  <h4 className="font-semibold text-xs mb-2 text-slate-200">ROUTE C — Conservative</h4>
                  <p className="text-2xl font-mono mb-3 text-slate-100 font-bold">925 km</p>
                  <p className="text-emerald-400 text-xs font-medium mb-2">VERY LOW RISK</p>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div className="w-1/6 h-full bg-emerald-500 rounded-full" /></div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer info section */}
      <footer className="py-16 border-t border-slate-800/50 bg-[#030910] text-center">
        <div className="max-w-3xl mx-auto px-6">
           <h2 className="text-xl md:text-2xl font-bold mb-3 text-slate-200 tracking-wide">KNOW WHAT LIES AHEAD.</h2>
           <p className="text-xs text-slate-400">Continuous environmental intelligence and autonomous decision support for polar mariners.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
