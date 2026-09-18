# PolarNav Maritime & Environmental Data Directory

This directory houses the geospatial, satellite, hydrodynamic, and historical voyage datasets powering the **PolarNav Antarctic Navigation & Decision Support System (SIH26059)**.

---

## 🗺️ Dataset Architecture

```text
data/
├── README.md                                  # Dataset documentation & provenance catalog
└── processed/
    └── verification/                          # Ground-truth voyage backtest validation benchmarks
        ├── backtest_result_aad_2015_16.json   # AAD R/V Aurora Australis 2015/16 voyage track points & metrics
        └── three_way_comparison_aad_2015_16.json # 3-way comparative benchmark (Human vs Shortest vs PolarNav)

(Note: Runtime data feeds and caches are synchronized in `backend/data/` for high-throughput I/O)
backend/data/
├── cache/                                     # Fast local response caches
│   └── sentinel/                              # Sentinel-1 SAR scene metadata & detected obstacle GeoJSON
├── metadata/
│   └── download_manifest.json                 # Checksums, timestamps, and source URLs for all raw downloads
├── processed/                                 # Gridded netCDF manifolds, risk surfaces & verification JSON
│   ├── navigation_risk_grid.nc                # Multi-factor composite risk manifold (NetCDF4)
│   ├── sic_forecast.nc                        # 1-month predictive sea-ice concentration grid
│   ├── weather_cache.json                     # Open-Meteo & ERA5 atmospheric reanalysis cache
│   └── verification/                          # Antarctic research stations, tracks, and benchmark results
│       ├── all_vessels.json                   # Canonical Antarctic fleet telemetry
│       ├── comnap_antarctic_facilities.json   # 112 COMNAP research stations & emergency refuges
│       └── historical_vessels.json            # Multi-year circumpolar AIS vessel observation corridors
└── raw/                                       # Unmodified source observation files
    ├── iceberg/consolidated/consolidated/     # 522 BYU/NIC individual iceberg tracking CSVs (1978–present)
    ├── ocean/                                 # Copernicus Marine Service MERCATOR ocean currents & SST (NetCDF)
    └── sea_ice/                               # NOAA/NSIDC CDR V4 sea-ice extent & concentration (NetCDF/CSV)
```

---

## 📊 Dataset Catalog & Provenance

| Category | Dataset Name | Source Organization | Format | Coverage / Resolution | Runtime Mode |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sea Ice** | NOAA/NSIDC CDR V4 / G02135 | NOAA / National Snow and Ice Data Center | NetCDF4 / CSV | Daily, 1978–2026, 25 km grid | **Live Feed** (with local NetCDF fallback) |
| **Icebergs** | BYU/NIC Antarctic Iceberg Database | BYU MERS / U.S. National Ice Center | CSV (522 targets) | 1978–Present, >100K observations | **Static Ground Truth** + ML Kinematics |
| **Radar Obstacles**| Copernicus Sentinel-1A/B SAR | European Space Agency (ESA) Copernicus | NetCDF / GeoJSON | 10 m spatial resolution, C-Band | **Live Sentinel Ingestion** + SAR Classifier |
| **Ocean Currents** | Global Ocean Physics Analysis (GLO12) | Copernicus Marine Service (CMEMS) | NetCDF4 | 1/12° (~8 km), 3D velocities ($u, v$) | **Live API Ingestion** + Fallback NetCDF |
| **Meteorology** | ERA5 Reanalysis + GFS Global | ECMWF / Open-Meteo Marine API | JSON / NetCDF | 0.25° grid, hourly wind & waves | **Live Stream** (1.5s timeout fallback) |
| **Bathymetry** | GEBCO 2023 / NOAA ETOPO 2022 | IHO-IOC GEBCO / NOAA NCEI | NetCDF / JSON | 15 arc-second grid, Depth in meters | **Static Keel Hazard Mask** |
| **Stations** | COMNAP Antarctic Facilities List | Council of Managers of National Antarctic Programs | GeoJSON / JSON | All 112 bases, airfields & refuges | **Static Reference Layer** |
| **Vessel AIS** | Australian Antarctic Division (AAD) AIS | Australian Antarctic Data Centre / CCAMLR | JSON / GeoJSON | 2015/16 Research Voyage Track | **Historical Ground-Truth Benchmark** |

---

## 🔄 Live Ingestion vs. Static Fallback Protocol

To guarantee reliable navigation even under total Iridium satellite blackouts, PolarNav operates on a **zero-fabrication, resilient ingestion protocol**:

1. **Live Attempt**: System polls official APIs (Copernicus Marine, Open-Meteo, Sentinel-1 Scene Search).
2. **Deterministic Fallback**: If an API timeout (>1.5s) or HTTP 5xx error occurs, the server instantly serves verified, high-resolution NetCDF / GeoJSON datasets stored locally.
3. **Audit Trail**: Every fallback is logged with exact provenance tags, timestamps, and coordinate boundaries. No fake or randomly simulated data is ever masqueraded as live satellite observation.

---

## 📐 Coordinate Systems & Units

* **Geographic Representation**: WGS 84 (`EPSG:4326`) for all GeoJSON outputs, vessel telemetry, and API query coordinates.
* **Pathfinding Projection**: South Polar Stereographic (`EPSG:3031`, standard parallel 71°S) to eliminate polar coordinate singularity and longitudinal convergence distortion.
* **Velocity & Speed**: Knots ($\text{kn}$) for vessel speed; meters per second ($\text{m/s}$) for wind and ocean currents.
* **Distance**: Geodesic WGS84 Haversine / Vincenty in kilometers ($\text{km}$) or nautical miles ($\text{NM}$).
* **Sea Ice Concentration (SIC)**: Internal scale $0.0 \dots 1.0$ ($0\% \dots 100\%$ pack fraction).
* **IMO Risk Index Outcome (RIO)**: Unitless integer score complying with IMO MSC.1/Circ.1519.
