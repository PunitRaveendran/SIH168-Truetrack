# TrueTrack v1 Repository Audit & Asset Classification Report

> **Project:** TrueTrack v2 for SIH (AI/ML-enhanced Intelligent Dead Reckoning with GNSS+INS Fusion)  
> **Author:** Antigravity Senior Navigation & ML Systems Engineering Team  
> **Date:** September 29, 2026  
> **Status:** APPROVED FOR PHASE 0 GATE

---

## 1. Executive Summary

An exhaustive audit of the existing TrueTrack codebase (`c:\Users\Punit Raveendran\Desktop\Projects\IQOO\`), its documentation (`TRUETRACK_MASTER_COMPLETE_SPECIFICATION.md`), and the supplied dataset archives (`IO-VNBD-master.zip`, Chennai drives) was conducted. 

### Key Findings:
1. **Critical Data Status:** 
   - The Chennai dataset folders (`45_46`, `Rohini_Theatre`, `Varadarajapuram`) contain genuine, high-quality, multi-sensor recordings (~60.8 Hz native accelerometer and gyroscope, GPS, uncalibrated IMU, and magnetometer) spanning 32.5 minutes across real urban corridors.
   - The provided `IO-VNBD-master.zip` archive contains 564 Git LFS pointers (~130 bytes each) rather than raw CSV data. Full raw files must be acquired via Git LFS / sparse download for the designated evaluation routes.
2. **Defect Rectification:** The 10 known defects of v1 (uncalibrated point estimates, non-causal zero-phase filtering, overlapping evaluation windows, hardcoded 15° fork snapping, sigmoid blending disguised as fusion, missing NHC, misreported parameter counts, single-mount overfitting) have been cataloged and targeted for elimination.
3. **Architecture Shift:** All feature-stacked, non-PS components (ride party sharing, on-device Dijkstra routing, synthetic batch physics generator) are discarded. Development of **TrueTrack v2** will occur in a clean, modular monorepo (`truetrack-v2/`) anchored on a unified Error-State EKF (ES-EKF) and calibrated Neural Odometry.

---

## 2. Complete Asset Classification: KEEP / REWRITE / DISCARD

| Component / File Path | Status | Justification |
| :--- | :---: | :--- |
| **Datasets & Preprocessing** | | |
| `IQOO/45_46-2026-09-25_10-54-49/` | **KEEP** | Genuine 60.8 Hz IMU + GPS Chennai highway express dataset (744.1s). |
| `IQOO/Rohini_Theatre_Koyambedu.../` | **KEEP** | Genuine 60.8 Hz IMU + GPS Chennai dense urban flyover dataset (55.0s). |
| `IQOO/Varadarajapuram.../` | **KEEP** | Genuine 60.8 Hz IMU + GPS Chennai arterial stop-and-go dataset (1153.8s). |
| `IQOO/ml_engine/convert_all_real_datasets.py` | **KEEP** | Clean sensor synchronization and interpolation logic; keep file parser, discard synthetic drift generation. |
| `IQOO/ml_engine/synthetic_batch/` | **DISCARD** | Synthetic in-silico trajectories; replace with real vehicle datasets and domain randomization. |
| `IQOO/ml_engine/synthetic_data_generator.py` | **DISCARD** | Artificial physics generator prone to simulator-to-reality gap. |
| `IQOO/ml_engine/physics_grounded_generator.py`| **DISCARD** | Synthetic data generation; superseded by real IO-VNBD and Chennai data. |
| `IQOO/ml_engine/norm_stats.json` | **DISCARD** | Hardcoded phone-specific z-score normalization constants; replace with physical-unit normalization. |
| Non-causal 12 Hz Butterworth (`filtfilt`) | **DISCARD** | Acquired future samples (non-causal) and aliases 25–120 Hz engine harmonics at 60 Hz sampling. |
| **Neural Network & Odometry** | | |
| `IQOO/ml_engine/truetrack_model.py` | **REWRITE** | Replace point-estimate 1D-CNN with heteroscedastic TCN predicting mean speed and log-variance. |
| `IQOO/ml_engine/train_and_export_model.py` | **REWRITE** | Update training pipeline with rotation augmentation, sensor-noise randomization, and NLL loss. |
| `IQOO/ml_engine/truetrack_1dcnn.pth` | **DISCARD** | Trained on synthetic trajectories; replace with newly trained multi-vehicle model. |
| `IQOO/ml_engine/truetrack_model.onnx` | **DISCARD** | Superseded by the v2 calibrated ONNX model with variance outputs. |
| `IQOO/ml_engine/npu_model_spec.json` | **REWRITE** | Benchmark latency honestly on a named device; do not inherit unverified claims. |
| **State Estimation & Fusion** | | |
| `IQOO/android_app/.../ImuCalibration.kt` | **REWRITE** | Current one-shot 3s calibration requires forward acceleration; rewrite as continuous multi-stage alignment. |
| Classical Naive SINS Integration | **DISCARD** | Straw-man comparison ($t^2$ divergence); replace with standard B0 and B1 baselines. |
| Sigmoid Trajectory Reconciliation | **DISCARD** | Display post-processing hack masquerading as estimator fusion; replace with RTS smoothing on GNSS recovery. |
| Hard 15-degree fork snapping | **DISCARD** | Irreversible heuristic snapping; replace with HMM maintaining posterior distribution across branches. |
| Zero-Velocity Update (ZUPT) Principle | **KEEP** | Fundamental physical constraint; rewrite detection logic and derive thresholds statistically from data. |
| Single Error-State EKF (ES-EKF) | **REWRITE** | Build single continuous 16-state filter (position, velocity, attitude error, biases, scale, mount angles). |
| Non-Holonomic Constraints (NHC) | **REWRITE** | Add lateral/vertical velocity zero-constraints ($v_y \approx 0, v_z \approx 0$) with adaptive covariance. |
| **Map Matching & Constraints** | | |
| `IQOO/web_app/data/hitec_corridor.geojson` | **DISCARD** | Hardcoded single-corridor mock; replace with automated OSM graph builder. |
| `maps/` Graph Generator & HMM Matcher | **REWRITE** | Build general offline OSM topological graph parser and HMM matcher over (edge, arc-length). |
| **Android Application** | | |
| `IQOO/android_app/.../SensorCollector.kt` | **KEEP** | Reliable Android hardware SensorManager listener at `SENSOR_DELAY_GAME`. |
| `IQOO/android_app/.../AudioCueManager.kt` | **KEEP** | Fully functional edge-triggered TextToSpeech audio alert engine. |
| `IQOO/android_app/.../TelemetryStreamServer.kt`| **KEEP** | Efficient WebSocket server on port 8765 for live dual-screen cockpit bridging. |
| Osmdroid Offline SQLite Tiles | **KEEP** | Functional offline raster tile caching and map rendering pipeline. |
| `IQOO/android_app/.../PartyManager.kt` | **DISCARD** | Non-PS feature (group ride sharing). |
| `IQOO/android_app/.../Router.kt` | **DISCARD** | Non-PS feature (on-device Dijkstra route search). |
| `IQOO/android_app/.../RerouteStateMachine.kt`| **DISCARD** | Non-PS feature. |
| `IQOO/android_app/.../MainActivity.kt` | **REWRITE** | Clean up 108 KB bloat; delegate state estimation to pure Kotlin `engine-core` library. |
| **Web Simulation Cockpit** | | |
| `IQOO/web_app/lib/maplibre-gl.js` & CSS | **KEEP** | 100% offline, zero-CDN WebGL vector map rendering engine. |
| HUD Layout & Dark Glassmorphism CSS | **KEEP** | Clean visual presentation shell. |
| `IQOO/web_app/js/app.js` | **REWRITE** | Replace hardcoded Mindspace sim logic with dynamic route replay, B0 vs v2 split, and SIMULATED labels. |
| **Benchmarking & Documentation** | | |
| `IQOO/ml_engine/benchmark_drift.py` | **DISCARD** | Overlapping evaluation windows, unstandardized baselines, and synthetic runs. |
| `ref-python/` Evaluation Suite | **REWRITE** | Complete research harness: non-overlapping splits, B0/B1/B2 baselines, ablation ladder, auto-generated results. |
| `TRUETRACK_MASTER_COMPLETE_SPECIFICATION.md`| **KEEP** | Comprehensive technical background and mathematical baseline reference. |

---

## 3. Analysis of v1 Defects and Remediation Plan

| Defect # | v1 Flaw | v2 Engineering Remediation |
| :---: | :--- | :--- |
| **1** | Overfitting to 1 phone, 1 mount, two-wheeler only; zero IO-VNBD tests. | Ingest multi-vehicle ground data (IO-VNBD cars + Chennai 2-wheelers + simulated FOG) with sensor profiles. |
| **2** | Model takes unaligned phone-frame IMU with hardcoded z-scores. | Continuously rotate IMU into gravity-aligned vehicle frame before feeding neural network; use physical units. |
| **3** | 3-second one-shot alignment requiring forward acceleration. | Continuous multi-stage alignment: low-pass gravity + gyro turn refinement + GNSS COG yaw + mount-shift CUSUM detector. |
| **4** | 12 Hz non-causal Butterworth filter (`filtfilt`); engine harmonics aliased. | Strictly causal digital filtering; pothole detector; spectral feature extraction on high-rate data (N3 feasibility). |
| **5** | Network outputs uncalibrated point estimates $(\hat{v}, \hat{\omega})$. | Heteroscedastic TCN predicting mean forward speed and log-variance $\sigma_v^2$; trained via Gaussian NLL. |
| **6** | No Non-Holonomic Constraints (NHC); sigmoid blend is display trick. | Real-time NHC updates in EKF ($v_y=0, v_z=0$); RTS smoothing on GNSS recovery; separate UI presentation smoother. |
| **7** | Straw-man comparison (naive double integration only). | Standard competitive baselines: **B0** (hold last speed + follow road) and **B1** (gravity INS + NHC). |
| **8** | Overlapping evaluation windows; ablation tiers on mismatched data. | Strict leave-one-route-out splits with non-overlapping 45s/60s blackout windows; all ablations evaluated on identical windows. |
| **9** | "Lane-accurate" claim unsupported by OSM centerline geometry. | Explicitly report "road-level" accuracy unless sub-lane ground truth and lane-level geometry are demonstrated. |
| **10** | Misreported parameter counts (quoted 25,804 vs actual 26,114 or 69k). | Exact parameter calculation via `sum(p.numel() for p in model.parameters())` directly embedded in build scripts. |

---

## 4. Hardware and Environment Audit

- **Operating System:** Windows 11 (PowerShell environment).
- **Python Environment:** Python 3.13.15 with CUDA-enabled PyTorch (`torch 2.11.0+cu128`), `onnx 1.23.0`, `scipy 1.18.1`, `pandas 3.0.5`, `numpy 2.5.3`, `scikit-learn 1.9.0`, `matplotlib 3.11.1`.
- **Git & Git LFS:** `git-lfs/3.7.1` verified functional.
- **Android Toolchain:** Gradle wrapper and Android SDK available in `android_app`.
- **Measured Native Sensor Rates:**
  - `45_46-2026-09-25_10-54-49`: 60.8 Hz IMU, 1.0 Hz GNSS, duration 744.1s.
  - `Rohini_Theatre_Koyambedu`: 60.8 Hz IMU, 1.0 Hz GNSS, duration 55.0s.
  - `Varadarajapuram`: 60.8 Hz IMU, 1.0 Hz GNSS, duration 1153.8s.
  - Total real Chennai ride time: 1952.9 seconds = 32.55 minutes.

---

## 5. Phase 0 Gate Recommendation

The audit is complete. All assets have been categorized with strict justifications. The foundation for building `truetrack-v2/` is clean and free of legacy baggage.

**Decision:** PROCEED TO IMPLEMENTATION PLAN.
