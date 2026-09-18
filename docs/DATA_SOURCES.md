# PolarNav — Authoritative Data Sources & Environmental Manifolds

This document provides a comprehensive technical catalog of all environmental, satellite, hydrodynamic, and maritime datasets consumed by the **PolarNav Navigation & Monitoring System (SIH26059)**.

---

## 1. Data Taxonomy Overview

PolarNav enforces strict classification across three distinct data regimes:

```text
┌────────────────────────────────┐  ┌────────────────────────────────┐  ┌────────────────────────────────┐
│         1. LIVE DATA           │  │       2. STATIC DATASETS       │  │      3. BENCHMARK / REPLAY     │
│   Real-time satellite & marine │  │   Authoritative baselines &    │  │   Historical research voyages  │
│   APIs with verified local     │  │   topographic boundaries       │  │   used for backtesting and     │
│   reanalysis fallbacks         │  │   (GEBCO, COMNAP, BYU/NIC)     │  │   efficiency validation        │
└────────────────────────────────┘  └────────────────────────────────┘  └────────────────────────────────┘
```

---

## 2. Master Dataset Catalog

| Dataset / Layer | Source Agency | Update Cadence | Native Format | Runtime Location | Fallback Protocol |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sentinel-1A/B SAR** | ESA Copernicus Open Access Hub | 1–3 days (polar orbit convergence) | Level-1 GRD NetCDF / SAFE | `backend/data/cache/sentinel/` | Local cached scenes + CFAR detector |
| **Sea Ice Concentration** | NOAA / NSIDC (G02202 & G02135) | Daily | NetCDF4 / CSV (25 km grid) | `backend/data/raw/sea_ice/` | Local spatial NetCDF climatology |
| **Iceberg Tracking** | BYU MERS / US National Ice Center | Multi-decade (1978–Present) | 522 individual CSVs | `backend/data/raw/iceberg/` | Local static database + RF kinematics |
| **Ocean Surface Currents** | E.U. Copernicus Marine Service (GLO12) | Daily analysis | NetCDF4 (1/12° resolution) | `backend/data/raw/ocean/` | Local NetCDF velocity fields ($u, v$) |
| **Sea Surface Temp (SST)** | Copernicus Marine OSTIA | Daily | NetCDF4 (0.05° grid) | `backend/data/raw/ocean/` | Local NetCDF thermal grid |
| **Marine Waves & Wind** | ECMWF ERA5 + Open-Meteo API | Hourly | REST JSON API / GRIB | `backend/data/processed/weather_cache.json` | 1.5s timeout $\to$ Local ERA5 reanalysis |
| **Bathymetry & Elevation** | GEBCO 2023 / NOAA ETOPO 2022 | Permanent baseline | NetCDF4 / KD-Tree | `backend/src/navigation/` | Built-in 500m depth hazard mask |
| **Antarctic Stations** | COMNAP (Council of Managers) | Annual audit | JSON / GeoJSON (112 stations) | `backend/data/processed/verification/` | Bundled station metadata catalog |
| **Historical Voyage AIS** | Australian Antarctic Division (AAD) | 2015/16 Expedition | GeoJSON / CSV (524 track pts) | `backend/data/processed/verification/` | Ground-truth benchmark JSON |

---

## 3. Detailed Data Pipeline Specifications

### 3.1. Copernicus Sentinel-1 Synthetic Aperture Radar (SAR)
* **Wavelength**: C-Band ($5.405\text{ GHz}$), capable of 100% penetration through polar night, blizzards, and cloud decks.
* **Resolution**: 10-meter spatial resolution in Extra-Wide (EW) and Interferometric Wide (IW) swath modes.
* **Processing**: Preprocessed through thermal noise removal, radiometric calibration ($\gamma^0, \sigma^0$), speckle filtering, and Constant False Alarm Rate (CFAR) peak detection to identify embedded icebergs and open-water fractures.

### 3.2. NOAA / NSIDC Sea Ice Concentration (CDR V4)
* **Instruments**: Defense Meteorological Satellite Program (DMSP) SSMIS passive microwave sensors.
* **Algorithm**: NASA Team / Bootstrap hybrid providing fractional sea-ice concentration ($0.0 \dots 1.0$).
* **Usage**: Ingested to generate the primary ice resistance cost layer in the multi-objective A* engine and compute IMO POLARIS Risk Index Outcomes (RIO).

### 3.3. BYU/NIC Antarctic Iceberg Database
* **Coverage**: Tracks every tabular iceberg with major axis $>10\text{ nautical miles}$ recorded since 1978 across 522 tracked targets (including giants A23a, B15, C16, D15).
* **Kinematics**: Position time-series are ingested into a Random Forest Regressor to predict 0–48 hour drift coordinates ($\Delta\text{lat}, \Delta\text{lon}$) driven by localized wind and Coriolis vectors.

### 3.4. Ocean Currents & Hydrodynamics (CMEMS GLO12)
* **Model**: NEMO 3.1 ocean engine with 50 vertical depth levels.
* **Optimization Benefit**: By routing vessels through trailing current vectors rather than opposing flows, PolarNav minimizes hull hydrodynamic drag and engine load.

---

## 4. Coordinate Reference Systems (CRS)

Polar navigation requires rigorous mathematical handling to avoid polar coordinate singularity:

1. **WGS 84 (`EPSG:4326`)**:
   * Standard geodetic latitude/longitude in decimal degrees.
   * Used for all API query endpoints, GeoJSON outputs, and frontend MapLibre layer rendering.
2. **Antarctic Polar Stereographic (`EPSG:3031`)**:
   * Conformal projection centered on the South Pole ($-90^\circ\text{S}$, $0^\circ\text{E}$) with true scale at latitude $71^\circ\text{S}$.
   * Used for all internal graph search calculations, obstacle clearance buffers, and Euclidean distance transforms to eliminate longitudinal convergence distortion.
3. **Antimeridian ($180^\circ / -180^\circ$) Crossing**:
   * Continuous polylines crossing the antimeridian are dynamically detected and partitioned into `MultiLineString` segments via `splitAntimeridianLine()` to prevent wrap-around line distortion.

---

## 5. Zero-Fabrication & Scientific Integrity

PolarNav strictly adheres to the following production data integrity standards:
* **No Synthetic Mockups**: Unknown or missing observations default to conservative safety advisories rather than fabricated synthetic numbers.
* **Transparent Provenance**: Every telemetry payload returned by the API includes a `data_source` and `provenance` field indicating whether the value was `LIVE_API`, `LOCAL_REANALYSIS`, `HISTORICAL_BENCHMARK`, or `DETERMINISTIC_FALLBACK`.

---

## 6. Real Satellite Monitoring

PolarNav interfaces with the following Earth Observation (EO) catalogs for real satellite imagery:

| Provider | Infrastructure | Primary Collections |
| :--- | :--- | :--- |
| **ESA Copernicus Data Space** | ESA Open Access Hub | SENTINEL-1 GRD EW/IW, SENTINEL-2 L2A MSI |
| **Microsoft Planetary Computer** | Azure STAC v1.0.0 | Cloud-Optimized GeoTIFFs (COG) |
| **NOAA / NSIDC** | National Snow & Ice Data Center | G02202 AMSR2/SSMIS CDR v4 (12.5 km SIC) |

### Freshness Tiers
Every satellite observation is bound to an acquisition timestamp (UTC) and graded:
- LIVE � acquired < 6 hours ago
- RECENT � 6�24 hours
- STALE � 24�72 hours
- UNAVAILABLE � no coverage or acquisition failure

### Sensor Priority
1. **Priority 1**: Sentinel-1 SAR (all-weather, day/night C-Band active microwave)
2. **Priority 2**: Sentinel-2 MSI (daylight / low-cloud only; disabled during polar night)
3. **Priority 3**: Passive microwave SIC (AMSR2 / SSMIS 12.5 km grid)
