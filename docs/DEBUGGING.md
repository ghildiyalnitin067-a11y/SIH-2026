# POLARNAV — Master Debugging & Troubleshooting Guide

Welcome to the **PolarNav Debugging Guide**. Whether you are a beginner engineer, an SIH judge evaluating the system, or an operator troubleshooting an unexpected state, follow this systematic guide to isolate, diagnose, and resolve issues across the stack.

---

## 1. First Step — The Triage Trinity

Before touching any code, check these three operational telemetry windows:

```text
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   1. Browser Console   │      │   2. Terminal Logs     │      │   3. Network Tab       │
│  (F12 -> Console Tab)  │  ->  │  (Uvicorn/Vite Shell)  │  ->  │  (F12 -> Network Tab)  │
│  Check for JS errors,  │      │  Check Python traces,  │      │  Check status codes,   │
│  React state crashes   │      │  warnings & fallback   │      │  payloads & latencies  │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

1. **Browser Developer Tools (`F12` -> Console)**:
   * Red errors indicate React component crashes, unhandled promise rejections, or MapLibre shader issues.
   * Verify that no uncaught exceptions are halting the render cycle.
2. **Backend Terminal (Uvicorn / FastAPI)**:
   * Look for HTTP status codes (200 OK vs 404/422/500).
   * Check for Python exception stack traces and log messages tagged with `[DATA_LOAD]`, `[ROUTING]`, or `[FALLBACK]`.
3. **Network Tab (`F12` -> Network -> Fetch/XHR)**:
   * Filter by `api/`.
   * Check the HTTP response status, response headers, and response payload of failing requests.

---

## 2. UI & Frontend Rendering Issues

### Symptoms:
* A button click does nothing.
* The screen turns blank (React White Screen of Death).
* Telemetry cards show `--` or `NaN`.
* Route options don't update when clicking "Calculate Optimal Route".

### Where to Look:
* Main Pages: `frontend/src/pages/platform/`
  * Tactical Navigation: `NavigationPage.tsx`
  * Pareto Route Optimization: `RouteOptimizationPage.tsx`
  * Realtime Telemetry: `TelemetryPage.tsx`
  * Sea Ice Intelligence: `SeaIcePage.tsx`
  * Iceberg Tracking: `IcebergTrackingPage.tsx`
* Layout & Shell: `frontend/src/components/layout/AppShell.tsx`
* Central Fleet State: `frontend/src/context/FleetContext.tsx`
* API Client Service: `frontend/src/services/api.ts`

### Step-by-Step Fix:
1. **React State Inspection**: Open React DevTools to inspect `activeRoute`, `vesselInfo`, or `telemetry`.
2. **Missing Field Guards**: Ensure optional chaining (`?.`) is used when reading nested objects that arrive asynchronously from the backend (e.g., `activeRoute?.metrics?.distanceKm`).
3. **Reactivity**: Check if the component is listening to `useFleet()` updates or if a local `useState` is failing to synchronize with prop changes.

---

## 3. API & Backend Request Failures

### Symptoms:
* Endpoint returns `404 Not Found`.
* Endpoint returns `422 Unprocessable Entity`.
* Endpoint returns `500 Internal Server Error`.
* Requests hang indefinitely (>10 seconds).

### Where to Look:
* Server Entrypoint & Route Registry: `backend/app/server.py`
* Phase 6-7 Integration API: `backend/app/phase67_api.py`
* Vessel & Fleet Service: `backend/realtime/vessel/service.py`
* AI Copilot Service: `backend/services/copilot_service.py`
* Live AIS Service: `backend/services/ais_service.py`

### Step-by-Step Fix:
1. **Endpoint Exists**: Check `http://localhost:8000/docs` (Swagger UI) to confirm the exact path and HTTP method (`GET` vs `POST`).
2. **Input Validation (422)**: Pydantic validates all incoming JSON request bodies. Check `fastapi.exceptions.RequestValidationError` in the backend terminal to see which field failed validation (e.g. invalid latitude float or missing vessel ID).
3. **Timeout (>10s)**: Route calculations across 30x60 grids should finish in <2 seconds. If it takes longer, check if an external weather API call is timing out. Look at `backend/src/data/weather_service.py` to ensure the 1.5s timeout and local ERA5 fallback are active.

---

## 4. Environmental Data & Dataset Issues

### Symptoms:
* Sea Ice Concentration (SIC) shows 0% everywhere.
* Icebergs appear at [0, 0] or off the coast of Africa.
* Marine weather shows empty waves or zero wind.
* Ocean currents layer is blank.

### Where to Look:
* Dataset Directory: `backend/data/`
  * Raw NetCDF & CSVs: `backend/data/raw/`
  * Gridded Risk & SIC Forecasts: `backend/data/processed/`
  * Sentinel-1 SAR Scenes: `backend/data/cache/sentinel/`
* Ingestion Pipelines: `backend/src/data/`
  * Weather: `backend/src/data/weather_service.py`
  * Ocean Currents: `backend/src/data/ocean_service.py`
  * Sea Ice: `backend/src/sea_ice/`
  * Icebergs: `backend/src/iceberg/`

### Step-by-Step Fix:
1. **Coordinate Verification**: Antarctic latitudes must be negative ($-60.0^\circ$ to $-80.0^\circ$). If latitudes are positive, a sign flip occurred during ingestion.
2. **Grid Alignment**: Gridded NetCDF files (`navigation_risk_grid.nc`, `sic_forecast.nc`) must have dimensions `(latitude: 30, longitude: 60)`. Run `python backend/audit_probe.py` to verify grid bounds.
3. **External API Outages**: If Open-Meteo or Copernicus APIs are unreachable, check terminal logs for `[FALLBACK] Serving local ERA5/NetCDF reanalysis`. If fallback failed, verify that the local `.nc` files exist in `backend/data/raw/ocean/`.

---

## 5. Machine Learning & Model Inference Issues

### Symptoms:
* Model prediction fails with `ValueError: Feature names must match`.
* Iceberg trajectory jumps erratically or outputs `NaN`.
* SAR sea-ice classification returns uniform output.

### Where to Look:
* Serialized Model Weights: `backend/models/`
  * `sea_ice_model.joblib`
  * `iceberg_trajectory_model.joblib`
  * `sentinel_sar_detector.joblib`
* Feature Configurations:
  * `backend/models/sea_ice_feature_config.json`
  * `backend/models/iceberg_feature_config.json`
  * `backend/models/sentinel_feature_config.json`
* Inference Modules:
  * Sea Ice: `backend/src/sea_ice/predict.py`
  * Iceberg Drift: `backend/src/iceberg/predict.py`
  * SAR Detector: `backend/src/sentinel/preprocess.py`

### Step-by-Step Fix:
1. **Model Lock & Deserialization**: On Python 3.14, ensure `sklearn.ensemble._forest` is pre-imported to avoid module loader deadlocks during `joblib.load()`. (Handled globally in `backend/tests/conftest.py`).
2. **Feature Schema Match**: Compare the incoming pandas DataFrame columns against the keys in `*_feature_config.json`. Every required lag feature (`sic_lag_1`, `dt_hours`, `delta_lat`) must be present and non-null.
3. **Model Validation**: Run the standalone ML verification probe:
   ```powershell
   python backend/audit_probe.py
   ```
   This will test all three models independently and print MAE and R² metrics.

---

## 6. Navigation & Polar Pathfinding Issues

### Symptoms:
* Route cuts through mainland Antarctica (continental land breach).
* Calculated distance is wildly off (>20,000 km).
* Route B and Route C are identical.
* ETA is negative or unrealistic.

### Tracing the Route Pipeline:
```text
INPUT (Start / Dest / Speed / Risk Tolerance)
  │
  ▼
ENVIRONMENTAL COST SURFACE (7-factor composite manifold)
  │
  ▼
A* GRAPH SEARCH (Conformal EPSG:3031 polar stereographic)
  │
  ▼
IMO POLARIS RIO CHECK (Resolution MSC.385(94) compliance)
  │
  ▼
RESPONSE (GeoJSON waypoints, fuel burn, RIO safety score)
  │
  ▼
FRONTEND (MapLibre rendering on PolarMap canvas)
```

### Where to Look:
* Polar Routing Engine: `backend/src/optimization/polar_routing_engine.py`
* Decision Engine: `backend/src/optimization/decision_engine.py`
* Multi-Objective Cost Function: `backend/src/optimization/cost_function.py`
* POLARIS Safety Evaluator: `backend/src/optimization/polaris_evaluator.py`

### Step-by-Step Fix:
1. **Antimeridian Crossing (180°/-180°)**: When a vessel crosses the antimeridian, longitude jumps from $+179^\circ$ to $-179^\circ$. Check `splitAntimeridianLine()` in `PolarMap.tsx` and `backend/src/navigation/` to ensure lines are split into `MultiLineString` segments rather than drawing a horizontal line across the entire globe.
2. **Speed & Units**: Vessel speeds are in **knots** ($1\text{ kn} = 1.852\text{ km/h}$). Fuel calculations depend on transit hours. If ETA is wrong, ensure speed is not mistakenly treated as $\text{km/h}$ or $\text{m/s}$.
3. **Land Mask Check**: Ensure bathymetric elevation $>0$ is assigned infinite traversal cost ($\infty$) in the A* cost function.

---

## 7. Map & GIS Visualization Issues

### Symptoms:
* Map canvas is completely black or grey.
* Tiles fail to load.
* Ship icon doesn't move or points in the wrong direction.
* Map layer toggles don't toggle layers.

### Where to Look:
* Master Map Component: `frontend/src/components/map/PolarMap.tsx`
* MapTiler Config: `.env` (`VITE_MAPTILER_API_KEY`)
* GeoJSON Transformers: `frontend/src/services/api.ts`

### Step-by-Step Fix:
1. **MapTiler Key / Offline Tiles**: PolarNav uses an ESRI Dark Matter canvas fallback if MapTiler key is missing or quota is exceeded. Check `DARK_MATTER_STYLE` in `PolarMap.tsx`.
2. **Heading / Bearing**: If the ship icon rotates backwards or points away from the route, verify that heading is calculated using the geodesic forward azimuth:
   ```typescript
   computeBearingDeg(point1, point2)
   ```
   Do NOT use planar $\text{atan2}(\Delta \text{lon}, \Delta \text{lat})$, which is distorted by polar longitude convergence.
3. **MapLibre Layer IDs**: If a layer won't hide/show, check `map.setLayoutProperty(layerId, 'visibility', 'visible' | 'none')` in `PolarMap.tsx` to verify that the layer ID matches the GeoJSON source name.

---

## 8. Automated Verification Commands

Run these exact automated diagnostic suites whenever debugging:

```powershell
# 1. Full Backend Test Suite (259 tests across 24 suites)
python -m pytest backend/tests -v

# 2. Adversarial Edge-Case Benchmark
python backend/test_judge_adversarial.py

# 3. Security, Injection & Boundary Defense Audit
python backend/test_judge_api_security.py

# 4. Master 5-Phase End-to-End System Validation
python backend/final_system_validation.py

# 5. Offline Historical Voyage Backtest (R/V Aurora Australis)
python backend/run_offline_backtest.py

# 6. Frontend Type Check & Production Bundle Compilation
cd SIH26059\frontend
npm run build
npm run lint
```
