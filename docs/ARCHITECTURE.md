# PolarNav — System Architecture & Data Flow

## 1. Executive Overview
**PolarNav (SIH PS 26059)** is an operational, AI-enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System engineered for polar research and resupply vessels transiting the Southern Ocean.

---

## 2. End-to-End System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND PRESENTATION LAYER                              │
│         React 19 + TypeScript + Vite + Tailwind CSS + MapLibre GL               │
│                                                                                 │
│   ┌─────────────────────┐   ┌────────────────────────┐   ┌──────────────────┐   │
│   │ FleetContext (Hub)  │   │ PolarMap (EPSG:3031)   │   │ Copilot Drawer   │   │
│   │ Unified mission,    │   │ Bathymetry, Icebergs,  │   │ Natural Language │   │
│   │ vessel & route state│   │ Radar & Wave Overlays  │   │ Risk Guidance    │   │
│   └──────────┬──────────┘   └───────────┬────────────┘   └────────┬─────────┘   │
└──────────────┼──────────────────────────┼─────────────────────────┼─────────────┘
               │                          │                         │
               │ HTTP REST / WebSocket    │ GeoJSON Layers          │ Streaming
               ▼                          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND REST & ML ENGINE                               │
│                FastAPI + Uvicorn + SQLAlchemy 2.0 (Python 3.11+)                │
│                                                                                 │
│   ┌──────────────────────┐  ┌─────────────────────────┐  ┌──────────────────┐   │
│   │ /api/routes          │  │ /api/simulation/what-if │  │ /api/copilot     │   │
│   │ Conformal Polar A*   │  │ Tactical Diversion &    │  │ Gemini Grounded  │   │
│   │ 7-factor cost surface│  │ Calving Event Scenarios │  │ LLM Assistant    │   │
│   └──────────┬───────────┘  └───────────┬─────────────┘  └────────┬─────────┘   │
└──────────────┼──────────────────────────┼─────────────────────────┼─────────────┘
               │                          │                         │
               ▼                          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      DATA INGESTION & ENVIRONMENTAL PIPELINE                    │
│                                                                                 │
│   ┌──────────────────────┐  ┌─────────────────────────┐  ┌──────────────────┐   │
│   │ Live Satellite SAR   │  │ Hydrodynamic Marine     │  │ Ground-Truth     │   │
│   │ Sentinel-1 / AMSR2   │  │ Copernicus GLO12 / ERA5 │  │ NOAA ETOPO /     │   │
│   │ Radar obstacles      │  │ Ocean currents & waves  │  │ COMNAP Bases     │   │
│   └──────────────────────┘  └─────────────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Modules & Single Source of Truth

* **`frontend/src/context/FleetContext.tsx`**: Authoritative frontend state storing `selectedVessel`, `selectedDestination`, `activeRoute`, `whatIfScenario`, `emergencyRerouteActive`, and `missionType`.
* **`backend/src/optimization/polar_routing_engine.py`**: Authoritative pathfinding module calculating discrete 2D A* routes on EPSG:3031 stereographic coordinates, line-of-sight shortcutting string pulling, and antimeridian split segments.
* **`backend/app/server.py`**: Authoritative FastAPI layer serving `/api/routes`, `/api/simulation/what-if`, `/api/navigation/emergency`, `/api/copilot`, and telemetry grids.
* **`backend/services/copilot_service.py`**: Low-latency maritime explanation layer using `gemini-flash-lite-latest` with strict JSON-grounded explainability.
* **`backend/app/db.py`**: Database persistence layer integrating PostgreSQL / Supabase with automatic local file fallbacks.

---

## 4. Multi-Objective Cost Manifold Formulation

The optimal route $R^*$ minimizes a 7-factor composite traversal cost:

$$J(R) = \int_{R} \left( w_1 \cdot C_{\text{dist}} + w_2 \cdot C_{\text{ice}} + w_3 \cdot C_{\text{berg}} + w_4 \cdot C_{\text{current}} + w_5 \cdot C_{\text{wave}} + w_6 \cdot C_{\text{bathy}} + w_7 \cdot C_{\text{fuel}} \right) ds$$

Where:
* $C_{\text{ice}}$: Nonlinear exponential penalty for Sea Ice Concentration above vessel Polar Class threshold.
* $C_{\text{berg}}$: Radial Gaussian repulsion envelope around active and projected iceberg positions.
* $C_{\text{bathy}}$: Infinite barrier penalty for bathymetric depths shallower than the vessel's required keel clearance ($\text{draft} + 2.0\text{m}$).
* $C_{\text{current}}$: Dot-product hydrodynamic resistance ($-\vec{v}_{\text{vessel}} \cdot \vec{v}_{\text{current}}$).
* $C_{\text{fuel}}$: Specific fuel consumption function based on vessel speed through water and ice friction.

---

## 6. Routing Engine Cost Formulation

PolarNav uses a 7-factor conformal Polar Stereographic A* pathfinder (EPSG:3031):

### 6.1 Grid Mesh
- **50 km resolution** isotropic Cartesian grid over the Southern Ocean operating envelope.
- **8-directional** neighbor exploration with Euclidean heuristic.
- **Land as hard obstacle**: Antarctica + ice shelves indexed via shapely.prepared. Cost = 8 if land.

### 6.2 Multi-Objective Corridor Profiles
Three distinct corridors are generated per voyage:
1. **Route B � Balanced/Fastest**: Pareto-optimal corridor minimising clock transit time with safe iceberg clearance.
2. **Route C � Safest Ice Margin**: Maximum safety buffer skirting the Marginal Ice Zone (lowest ice exposure).
3. **Route A � Direct Baseline**: Geometrically shortest track through pack ice � serves as the comparative baseline.

### 6.3 Antimeridian Handling
At the API rendering boundary, split_antimeridian_segments detects longitude delta exceeding 180� and splits the polyline into clean MultiLineString segments, preventing horizontal wrap artefacts in MapLibre.

---

## 7. AI Navigation Copilot (Gemini)

Gemini operates strictly as an **Explanation and Advisory Layer** � it never independently computes routes or risk scores.

`
Real Data / Sensors / ML
        ?
  Polar Risk Engine
        ?
Polar A* Route Optimizer
        ?
Structured Decision Context JSON
        ?
   Gemini Copilot
        ?
Grounded Human Explanation
`

- **Model**: gemini-flash-lite-latest � benchmark latency 2.18 seconds.
- **Security**: GEMINI_API_KEY is stored only on the Render backend. The Vercel frontend has zero knowledge of the key.
- **Fallback**: FallbackProvider generates structured algorithmic explainability directly from the routing engine metrics if Gemini is unavailable.
