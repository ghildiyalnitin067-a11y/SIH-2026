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
