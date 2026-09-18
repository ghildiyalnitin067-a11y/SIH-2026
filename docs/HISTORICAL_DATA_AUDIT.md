# POLARNAV // Historical Data, ML Training & Offline Backtesting Audit

**Project**: POLARNAV — Intelligent Antarctic Polar Navigation, Multi-Objective Routing & Decision Support (SIH PS 26059)  
**Date**: September 2026  
**Status**: AUDIT COMPLETE  

---

## Executive Summary

This audit evaluates the readiness of the existing PolarNav repository for transition to an end-to-end, real historical-data-driven machine learning (ML) training and offline route backtesting pipeline.

The repository possesses a well-structured backend with authentic NetCDF satellite, bathymetric, and hydrodynamic data layers. Core modules for environmental spatio-temporal matching, 32-feature extraction, chronological voyage partitioning, and offline counterfactual replay are already implemented in code. This document outlines the existing architecture, identifies reusable components, catalogs data sources and synthetic gaps, and specifies the roadmap for historical ingestion without altering production navigation or the user-facing UI.

---

## 1. Current System Architecture

```
                                  [OFFLINE RESEARCH & VALIDATION PIPELINE]
  Real Historical Datasets (AAD, PANGAEA, NOAA CDR, ETOPO, BYU Icebergs, Copernicus GLO12, ERA5)
                                             │
                                             ▼
                             src/environmental_replay/
                             (EnvironmentalMatcher: t ≤ t₀)
                                             │
                                             ▼
                                   src/ml_dataset/
                             (FeatureExtractor: 32 Feats)
                             (VoyageSplitter: Leak-Free)
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
                 src/ml_training/                        src/historical_backtest/
            (XGBoost & Random Forest)                 (HistoricalVoyageReplayEngine)
            • Risk Regressor [0.0, 1.0]               (RouteSafetyComparator)
            • Movement Classifier (0/1)               • 4-Way Baseline Benchmarking
                        │                                         │
                        ▼                                         ▼
            backend/models/historical/                 Verification Reports (JSON)
            (Trained & Validated Binaries)             (No Production UI Dependency)
                        │
════════════════════════╪═══════════════════════════════════════════════════════════════════════════════
                        │                      [LIVE PRODUCTION ECDIS]
                        ▼
            Current Vessel & Environmental Conditions (AMSR2, NIC Icebergs, GEBCO, Open-Meteo)
                                             │
                                             ▼
                                src/optimization/
                             (PolarRoutingEngine)
                             • Metric CRS: EPSG:3031
                             • Geodesic A* Search
                             • Multi-Objective Pareto Corridor
                             • Admiralty + Lindqvist Fuel Model
                                             │
                                             ▼
                                    backend/app/server.py
                                   (FastAPI REST Endpoints)
                                             │
                                             ▼
                                    SIH26059/frontend/
                          (Operational ECDIS Console: React 19)
```

---

## 2. Inventory of the 15 Repository Subsystems

| # | System Component | Current Implementation & File Locations | Status | Reusability / Assessment |
|---|---|---|:---:|---|
| **1** | **Backend Architecture** | `backend/app/server.py`, `app/data_transformer.py`, `app/phase67_api.py`. FastAPI + Uvicorn service with thread-safe startup pre-warm. | **Production Ready** | Fully decoupled from historical datasets. File pipeline mode operates reliably with zero database dependency. |
| **2** | **Existing ML Models** | • `backend/models/historical/` (XGBoost/RF risk regressor & movement classifier)<br>• `backend/models/` (Sea-ice forecast, iceberg trajectory, Sentinel SAR detector). | **Functional** | Historical models predict continuous risk $[0.0, 1.0]$ and safety class; operational models handle short-term forecasting. |
| **3** | **Feature Engineering** | `backend/src/ml_dataset/feature_extractor.py`, `target_generator.py`, `feature_schema.json`. Standardized 32-feature vector extraction from co-located points. | **Complete & Validated** | Robust mathematical cyclical encodings and physical representations. **Must not be modified** to preserve compatibility. |
| **4** | **Routing Engine** | `backend/src/optimization/polar_routing_engine.py`, `cost_function.py`, `fuel_model.py`. Polar Stereographic (EPSG:3031) circumpolar A* pathfinding. | **Production Ready** | Evaluates Pareto routes (Balanced, Safest, Fastest) using live AMSR2 SIC, NIC icebergs, and ETOPO depth. Zero dependency on historical AIS. |
| **5** | **Sea Ice Service (SIC)** | `backend/src/data/real_sic_service.py`. Ingests NOAA/NSIDC CDR V4 NetCDF (`real_cdr_sic.nc`, `real_cdr_series_18m.nc`), transforms EPSG:3412 to EPSG:4326 via KDTree. | **Authentic Data** | High-performance spatial indexing (<10ms per batch lookup). 18-month historical time series available. |
| **6** | **Ocean & Weather Services** | • `backend/src/data/ocean_service.py` (Copernicus MERCATOR GLO12 currents $u_o, v_o$ and SST)<br>• `backend/src/data/weather_service.py` (Open-Meteo API + ERA5 Reanalysis NetCDF). | **Authentic Data** | Provides physical current drift assist, aerodynamic wind resistance, and sea surface temperature. |
| **7** | **Iceberg Service** | `backend/data/raw/iceberg/consolidated/` (522 CSV tracks from BYU/NIC Database), `backend/src/iceberg/` spatial lookup engine. | **Authentic Data** | Extensive coverage of Antarctic tabular bergs (A-23A, B-15 series, etc.). Evaluates Closest Point of Approach (CPA) and 15 km/25 km safety zones. |
| **8** | **Bathymetry Service** | `backend/src/data/bathymetry_service.py`. NOAA NGDC ETOPO 2022 Relief Model NetCDF (`etopo_antarctic.nc`, 1 arc-minute resolution). | **Authentic Data** | Bilinear depth interpolator in meters. Implements 20 m grounding hazard limit and 50 m caution zone. |
| **9** | **Vessel Models & Constraints** | IMO Polar Code classes (`PC1`–`PC7`, Non-Ice-Class) in `fuel_model.py` and `polar_routing_engine.py`. Admiralty power law + Lindqvist ice-breaking resistance. | **Validated Naval Physics** | Generalizes seamlessly to arbitrary unseen vessels via length, beam, draft, and service speed parameters. |
| **10** | **Backtesting Implementation** | `backend/src/historical_backtest/replay_engine.py`, `route_safety_comparator.py`, `run_offline_backtest.py`, `backtesting/run.py`. | **Complete Offline Capability** | Four-way baseline comparison (Actual AIS vs Geodesic Shortest Path vs PolarNav Balanced vs Safest). Anti-leakage ($t \le t_0$) enforced. |
| **11** | **Database & Storage** | File-based binary storage (`.nc`, `.geojson`, `.json`, `.joblib`). Optional PostgreSQL/PostGIS connection handling in `backend/app/db.py`. | **Operational** | File pipeline ensures portability across air-gapped or localized workstations without external DBMS requirements. |
| **12** | **Existing API Endpoints** | REST API in `server.py` exposing vessels, routes, sea-ice, icebergs, weather, ocean, and decision intelligence. | **Production Ready** | All 17 core regression and security contracts pass validation. |
| **13** | **Frontend Data Flow** | React 19 + TypeScript + Vite (`SIH26059/frontend/src/`). Pure operational navigation dashboard (Overview, Navigation, Routes, Sea-Ice, Icebergs). | **Clean & Reverted** | All historical replay UI components have been completely removed. Zero historical validation UI or synthetic playback workflows remain. |
| **14** | **Configuration & Environment** | `backend/.env`, `backend/.env.example` defining API keys (Copernicus Marine, Open-Meteo, OpenWaters), database URLs, and network ports. | **Standardized** | Gracefully handles missing API keys by falling back to local NetCDF archives. |
| **15** | **Dependencies** | `backend/requirements.txt`: FastAPI, Uvicorn, NumPy, Pandas, SciPy, Xarray, NetCDF4, Scikit-learn, XGBoost, Shapely, Pyproj. | **Complete** | All required scientific and machine learning dependencies are pinned and functional. |

---

## 3. Detailed ML Feature Schema Analysis

The ML feature representation is standardized in `backend/models/historical/feature_schema.json` and extracted by `backend/src/ml_dataset/feature_extractor.py`. It comprises **32 features**:

```
┌─────────────────────────┬──────────────────────────────────┬──────────────────────────────────────────────────────┐
│ Category                │ Feature Names                    │ Physical / Mathematical Purpose                      │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ 1. Kinematics (5)       │ speed_knots, course_deg,         │ Vessel dynamics; sine/cosine decomposition           │
│                         │ heading_deg, sin_course,         │ resolves the 0°/360° circular discontinuity.         │
│                         │ cos_course                       │                                                      │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ 2. Spatial CRS (6)      │ latitude, longitude,             │ Spherical coordinate representation and cyclical     │
│                         │ sin_lat, cos_lat,                │ projections for smooth trans-polar interpolation.    │
│                         │ sin_lon, cos_lon                 │                                                      │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ 3. Seasonal Temporal (5)│ month, day_of_year, hour,        │ Captures Antarctic freeze/thaw seasonality           │
│                         │ sin_day_of_year, cos_day_of_year │ (e.g., maximum pack ice extent in Sept/Oct vs min).  │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ 4. Sea Ice Regime (3)   │ sic, sic_percent, is_ice_covered │ Satellite passive microwave ice fraction [0.0–1.0],  │
│                         │                                  │ percentage [0–100%], and binary presence flag.       │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ 5. Iceberg Proximity (3)│ iceberg_distance_km,             │ Proximity to nearest tracked tabular berg,           │
│                         │ has_iceberg_within_50km,         │ tactical warning buffer (50 km), and collision CPA   │
│                         │ has_iceberg_within_15km          │ danger flag (15 km).                                 │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ 6. Topography & Depth(4)│ bathymetry_depth_m, is_shallow,  │ Water depth from ETOPO relief model, shallow shelf   │
│                         │ coastline_distance_km,           │ threshold (<20 m), distance to continent, and land   │
│                         │ is_on_land                       │ intersection flag.                                   │
├─────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ 7. Hydrodynamics &      │ ocean_current_speed_ms,          │ Zonal and meridional surface currents, sea surface   │
│    Atmosphere (6)       │ ocean_current_u_ms,              │ temperature (Copernicus), 10 m wind speed, and       │
│                         │ ocean_current_v_ms,              │ 2 m air temperature (ERA5 Reanalysis).               │
│                         │ sea_surface_temp_c,              │                                                      │
│                         │ wind_speed_ms, air_temp_c        │                                                      │
└─────────────────────────┴──────────────────────────────────┴──────────────────────────────────────────────────────┘
```

### Supervised Target Variables:
1. `target_risk_cost`: Continuous composite hazard cost $[0.0, 1.0]$, weighted across SIC ($50\%$), Iceberg proximity ($25\%$), Bathymetry ($15\%$), and Coastline distance ($10\%$).
2. `target_safe_movement`: Binary classification ($1 = \text{Safe navigation}$, $0 = \text{Hazardous corridor}$).
3. `target_risk_class`: Discrete WMO risk tier ($0 = \text{LOW}$, $1 = \text{MODERATE}$, $2 = \text{HIGH}$, $3 = \text{VERY HIGH}$).
4. `target_speed_efficiency`: Operational speed ratio ($\text{SOG} / 14\text{ knots}$).

---

## 4. Current Routing Engine Inputs & Constraints

The `PolarRoutingEngine` (`backend/src/optimization/polar_routing_engine.py`) ingests:
1. **Departure & Destination**: WGS84 Geographic coordinates ($\text{lat}, \text{lon}$).
2. **Vessel Parameters**: Polar Class (`PC1`–`PC7`), service speed, beam, length, and draft.
3. **Hard Exclusion Constraints**:
   - High-resolution polygon land boundaries (`antarctica_land_mask.geojson` via Shapely MultiPolygon).
   - Water depths shallower than vessel keel clearance threshold ($<20\text{ m}$).
4. **Dynamic Cost Surface**:
   - Satellite sea ice concentration lookups (AMSR2 / NOAA CDR KDTree).
   - Dynamic 0–48h predicted iceberg positions (BYU/NIC database).
   - Ocean current vectors (Copernicus MERCATOR GLO12).
   - Atmospheric wind fields (ERA5 / Open-Meteo).
5. **Optimization Heuristic**:
   - Geodesic circumpolar distance in Antarctic Polar Stereographic projection (EPSG:3031).
   - Multi-objective weights: Distance ($1.0$), Sea Ice ($2.5$), Icebergs ($3.5$), Bathymetry ($4.0$), Weather ($1.2$), Fuel ($1.5$).
   - Kinematic turning angle constraints and Chaikin path smoothing.

---

## 5. Offline Backtesting Capabilities & Verification

The offline backtesting suite (`backend/run_offline_backtest.py` and `backend/backtesting/run.py`):
- **Prevents Lookahead Bias**: Enforces strict historical temporal cutoff ($t \le t_0$). Future satellite passes, future iceberg drift, and future ship positions are masked out during corridor generation.
- **Provides 4-Way Baseline Comparison**:
  - **Baseline A**: Actual Historical AIS Track (human captain real-world operational benchmark).
  - **Baseline B**: Naive Geodesic Shortest Path (pure distance minimization, revealing severe ice/bathymetry hazard exposure).
  - **Candidate C**: PolarNav Multi-Objective Balanced Corridor.
  - **Candidate D**: PolarNav Conservative Safest Corridor.
- **Evaluates 13 Decoupled Performance Metrics**: Path length, distance delta %, mean cross-track error, Hausdorff divergence, transit ETA, fuel burn, average SIC exposure, peak SIC encountered, high-risk ice exposure ($>40\%$), iceberg clearance violations ($<15\text{ km}$), bathymetry clearance violations ($<20\text{ m}$), landmass intersections, and Composite Safety Index (CSI).
- **Supports Unseen Vessels**: Accepts arbitrary vessel dimensions (`--vessel-name`, `--polar-class`, `--length`, `--beam`, `--draft`, `--speed`) to verify generalizability to vessels not present in training data.

---

## 6. What Already Works vs. What Is Mock/Synthetic vs. Missing

### A. What Already Works (Production Ready)
- Polar Stereographic A* routing engine with Multi-Objective Pareto outputs.
- Real NetCDF readers for NOAA ETOPO bathymetry, NOAA CDR sea ice, and Copernicus GLO12 ocean currents.
- 522 consolidated historical iceberg tracks from BYU/NIC.
- 32-feature extraction pipeline and chronological voyage partitioner.
- XGBoost and Random Forest training, hyperparameter tuning, and evaluation scripts.
- Terminal-based offline backtesting runner supporting 4-way baseline comparison and unseen vessels.
- Operational React 19 frontend displaying live situational awareness without historical replay clutter.

### B. What Is Currently Mock / Synthetic / Fallback
1. **Weather Fallback**: `backend/src/data/weather_service.py` encounters a missing `import os` in its Open-Meteo API query logic, causing it to regularly fall back to the static `era5_antarctic_real.nc` file.
2. **Sentinel SAR Detector**: The model `backend/models/sentinel_sar_detector.joblib` was trained on a small synthetic sample rather than full multi-gigabyte calibrated Sentinel-1 GRD imagery.
3. **Demo JSON Snapshots**: In `backend/data/processed/verification/`, static JSON caches (`phase2_sic.json`, `phase3_icebergs.json`) are used as offline fallbacks when NetCDF or live network feeds are unavailable.

### C. What Is Incomplete / Requires Real Historical Data Expansion
1. **Historical AIS Ingestion Scope**: Real AIS data currently loaded in `loader.py` includes 5 Australian Antarctic Division (AAD) voyages (*Aurora Australis*). Additional international vessel tracks (*Polarstern* PANGAEA tracks, *Nathaniel B. Palmer* USAP tracks) exist in `backend/data/raw/vessels_historical/` as raw CSVs but have not been unified into the automated `vessel_tracks/` ingestion pipeline.
2. **Multi-Year Temporal NetCDF Stack**: `real_cdr_series_18m.nc` covers an 18-month window. Historical voyages spanning older years (e.g., 2008, 2010) require multi-year daily NetCDF files for complete temporal co-location without relying on climatological monthly averages.
3. **Automated Offline Ingestion Script**: A reproducible, resumable offline download script for NOAA CDR NetCDF archives and PANGAEA vessel repositories with checksum verification.

---

## 7. What Must Be Changed vs. What Must NOT Be Changed

### A. What Must Be Changed
- Fix the minor `import os` bug in `backend/src/data/weather_service.py` to ensure Open-Meteo live queries execute cleanly before falling back to ERA5.
- Extend `backend/src/vessel_tracking/loader.py` to standardize PANGAEA (*Polarstern*) and USAP (*Nathaniel B. Palmer*) raw CSV formats into the common `AISRecord` schema.
- Implement an automated, reproducible offline data acquisition script (`scripts/download_historical_data.py`) with strict Antarctic bounding-box filtering and checksum validation.

### B. What Must NOT Be Changed
- **DO NOT** rewrite the backend architecture or replace working NetCDF services.
- **DO NOT** modify the 32-feature ML schema (`feature_schema.json` / `feature_extractor.py`).
- **DO NOT** alter the core `PolarRoutingEngine` pathfinding or A* cost weights.
- **DO NOT** redesign the frontend or create any user-facing historical validation UI.
- **DO NOT** make the live navigation API depend on historical AIS datasets.

---

## 8. Recommended Implementation Order (Next Phases)

```
Phase 1: Bugfix & Ingestion Alignment (Weather Service fix, PANGAEA/USAP CSV loaders)
   │
Phase 2: Automated Offline Data Acquisition (Reproducible download script with checksums)
   │
Phase 3: Expanded Historical Environmental Co-Location (Temporal matching across full voyage corpus)
   │
Phase 4: Leak-Free Multi-Voyage ML Retraining (Retrain XGBoost/RF on expanded 10+ voyage dataset)
   │
Phase 5: Automated Offline Benchmark Reporting (Generate aggregate validation metrics across all voyages)
```

---

## 9. Final Audit Classification

### AUDIT COMPLETE

**REUSABLE:**
- `PolarRoutingEngine` (EPSG:3031 circumpolar A* solver and Pareto corridor generator)
- `BathymetryService` (NOAA ETOPO NetCDF depth reader)
- `RealSeaIceService` (NOAA/NSIDC CDR V4 sea ice NetCDF reader)
- `OceanCurrentsService` (Copernicus Marine GLO12 current vector reader)
- `FeatureExtractor` (Standardized 32-feature vector generator)
- `VoyageSplitter` (Chronological voyage-level partitioner preventing data leakage)
- `HistoricalMLTrainer` (XGBoost/RF training and validation-tuning framework)
- `HistoricalVoyageReplayEngine` & `RouteSafetyComparator` (4-way baseline backtesting engine)
- `run_offline_backtest.py` & `backend/backtesting/run.py` (Developer CLI tools)

**MISSING:**
- Unified multi-vessel loader supporting PANGAEA (*Polarstern*) and USAP (*Nathaniel B. Palmer*) CSV formats alongside AAD.
- Extended multi-year daily NetCDF temporal stack for historical SIC matching across pre-2015 voyages.
- Reproducible offline historical dataset acquisition script with checksum validation.

**MOCK/SYNTHETIC:**
- Sentinel-1 SAR iceberg/floe classifier model (trained on limited synthetic samples).
- Static fallback JSON snapshots in `backend/data/processed/verification/` (used only when NetCDF/APIs are offline).

**REQUIRES REAL DATA:**
- Additional multi-year NOAA/NSIDC CDR NetCDF series for exact date co-location of historical voyages prior to 2015.
- Real multi-institution Antarctic voyage telemetry (PANGAEA, USAP, AAD) for broader statistical validation.

**NEXT PHASE:**
- **Phase 1**: Fix weather service import and implement unified multi-source AIS loader for *Polarstern* and *Nathaniel B. Palmer* tracks.
