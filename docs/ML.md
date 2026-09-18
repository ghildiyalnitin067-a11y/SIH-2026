# PolarNav — Machine Learning & Predictive Inference Pipeline

This document details the machine learning architectures, feature engineering manifolds, training protocols, and empirical validation metrics for the **PolarNav Antarctic Navigation System (SIH26059)**.

---

## 1. Machine Learning Architecture Overview

To guarantee deterministic, sub-second latency on shipboard embedded edge systems and cloud REST APIs, heavy model training is decoupled from production inference:

```text
┌─────────────────────────────────────────────────────────────┐
│                   OFFLINE TRAINING PIPELINE                 │
│  - Satellite CDR V4 / NSIDC NetCDF Data                     │
│  - BYU/NIC 522 Consolidated Iceberg Trajectories            │
│  - Copernicus Sentinel-1A SAR Dual-Pol GRD Scenes           │
│                            │                                │
│                            ▼                                │
│         Feature Extraction & Spatial K-Fold                 │
│                            │                                │
│                            ▼                                │
│        Model Training & Regularization Tuning               │
│                            │                                │
│                            ▼                                │
│     Serialized Artifacts (.joblib) + Feature Configs        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 PRODUCTION RUNTIME INFERENCE                │
│  - Fast memory-mapped loading with Joblib                   │
│  - Zero-latency vector evaluation (<50ms per step)          │
│  - Continuous multi-objective cost surface injection        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Production Model Registry

| Model Name | Artifact File | Architecture | Input Features | Empirical Metric | Operational Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sea Ice Predictor** | `sea_ice_model.joblib` | Random Forest Regressor | Lat, Lon, Month, DOY, Lag-1, Lag-2, Lag-3, 3M Mean | $R^2 = 0.8861$, $\text{MAE} = 0.0401$ | 1-month ahead gridded SIC forecasting |
| **Iceberg Kinematic Drift** | `iceberg_trajectory_model.joblib` | Random Forest Regressor | Current Lat/Lon, Speed, Bearing, Major/Minor Axes, $\Delta t$ | $\text{Median Error} = 0.61\text{ km}$, $\text{Mean} = 1.72\text{ km}$ | 0–48h dead-reckoning trajectory projection |
| **Sentinel-1 SAR Classifier** | `sentinel_sar_detector.joblib` | Regularized Random Forest + CFAR | Backscatter $\sigma_0$ (HH/HV), Local Variance, Radial Texture | $\text{Accuracy} = 98.47\%$ (Spatial GroupKFold) | Sub-kilometer iceberg detection & fracture detection |

---

## 3. Deep-Dive: Model Specifications

### 3.1. Sea Ice Concentration (SIC) Forecasting Engine
* **Target Variable**: Continuous fractional sea-ice concentration ($0.0 \dots 1.0$) across Antarctic meridional zones.
* **Temporal Horizons**: Immediate operational step ($T+0$), 24-hour tactical, and 30-day strategic climatological window.
* **Feature Schema** (`sea_ice_feature_config.json`):
  * Spatial: `latitude`, `longitude`
  * Temporal: `month`, `day_of_year`, `sin_doy`, `cos_doy`
  * Auto-regressive Memory: `sic_lag_1`, `sic_lag_2`, `sic_lag_3`, `sic_mean_3month`

### 3.2. Iceberg Drift Kinematics & CPA Projections
* **Physical Coupling Formulation**:
  $$\vec{v}_{\text{iceberg}} = \alpha \vec{v}_{\text{ocean}} + \beta \vec{v}_{\text{wind}} + \vec{v}_{\text{coriolis}}$$
  Where $\alpha \approx 0.70$ (deep keel hydrodynamic coupling) and $\beta \approx 0.02$ (atmospheric windage).
* **Uncertainty Ellipses**:
  Forecast steps ($T+6\text{h}, T+12\text{h}, T+24\text{h}, T+36\text{h}, T+48\text{h}$) generate dynamic radial Gaussian confidence buffers expanding at $1.2\text{ km/h}$, visualized as tactical standoff circles on the map.

### 3.3. Sentinel-1A Synthetic Aperture Radar (SAR) Classifier
* **Sensors**: Dual-polarization C-Band ($\text{HH} + \text{HV}$) Extra-Wide Swath.
* **Algorithm**: Two-stage Constant False Alarm Rate (CFAR) peak detection followed by tree-based validation to distinguish bright tabular iceberg specular reflection from sea clutter and high-compression sea-ice ridges.

---

## 4. Verification & Validation Protocol

To independently verify model weights and reproduce evaluation metrics:

```powershell
# Run the ML evaluation and inference test suite
python -m pytest backend/tests/test_historical_ml_training.py backend/tests/test_ml_dataset_generation.py -v

# Run the live model inference probe
python backend/audit_probe.py
```
