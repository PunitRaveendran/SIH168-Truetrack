# SMART INDIA HACKATHON 2026 — IDEA SUBMISSION DECK
## TrueTrack: AI/ML-Based Intelligent Dead Reckoning System for Seamless Navigation

* **Problem Statement ID:** 26168
* **Problem Statement Title:** AI-ML based Intelligent Dead Reckoning system for seamless navigation
* **Theme:** Smart Vehicles | **PS Category:** Software
* **Team ID:** 155612 | **Team Name:** Yuvatech

---

## Slide 1: Title Page

### Presentation Header
* **Project Name:** TrueTrack v2
* **Subtitle:** High-Rate GNSS+INS Fusion & Intelligent Dead Reckoning Engine for Smartphones & Connected Vehicles
* **Team ID:** 155612
* **Team Name:** Yuvatech

### Tech Stack & Team Roles
* **Core Technologies:** Kotlin, Android SDK/NDK, PyTorch, ONNX Runtime Mobile, MapLibre GL (Vector 3D), C++ 16-State ES-EKF, OpenStreetMap Graph.
* **Team Roles:**
  * **Navigation & Estimation Lead:** 16-State Error-State EKF, Quaternion Kinematics & CUSUM Defense.
  * **Edge AI & Deep Learning Engineer:** Heteroscedastic 1D-TCN Speed Network, Gaussian NLL & ONNX Quantization.
  * **Android Systems Engineer:** High-rate 50 Hz Background Sensor Ingestion & Telemetry Service.
  * **Mapping & GIS Specialist:** Topological Road Manifold Extraction & HMM Viterbi Snapping.

---

## Slide 2: Problems, Proposed Solution & Novelty

### Problems Currently Faced
1. **GNSS Vulnerability in Urban Infrastructure:** Navigation apps freeze, jump erratically, or hallucinate paths when vehicles enter tunnels, flyovers, or urban canyons, severing satellite connectivity.
2. **Hardware Constraints in Indian Fleet:** The vast majority of Indian two-wheelers, auto-rickshaws, and logistics commercial vehicles lack OBD-II wheel-speed sensors. They rely solely on dashboard-mounted smartphones.
3. **The Inertial Navigation (INS) Trap:** Double-integrating noisy MEMS accelerometer data results in quadratic ($t^2$) position explosion (>14%–32% drift within 45 seconds). Road potholes, engine idling, and arbitrary phone tilts cause classical dead reckoning to fail.

### Proposed Solution: TrueTrack v2
1. **Hybrid Edge AI Architecture:** High-capacity model training on ground-truth vehicle datasets (IO-VNBD), deploying an ultra-lightweight **123 KB INT8 ONNX** model running 100% offline on smartphones.
2. **AI Speed & Uncertainty Network:** Heteroscedastic 1D-TCN predicts forward speed $\hat{v}$ and variance $\sigma_v^2$ directly from raw IMU vibrations, automatically downweighting pothole shocks.
3. **Continuous 16-State Error-State EKF:** Fuses neural velocity with physical Non-Holonomic Constraints (NHC) and GNSS fixes into an uninterrupted quaternion attitude and position filter.
4. **Offline Topological Map-Matching:** HMM Viterbi graph-traversal snaps the inertial trajectory to OpenStreetMap road vectors without cellular data.

### Novelty of the Solution
* **What is AI in the Fusion?**
  1. **Learned Speed:** 1D-TCN learns forward vehicle speed directly from multi-axis accelerometer and gyro spectral frequencies without wheel sensors.
  2. **Heteroscedastic Uncertainty ($\sigma_v^2$):** Neural network dynamically adjusts Kalman filter measurement covariance $R_v$, trusting the AI on smooth roads and distrusting it over speed bumps.
  3. **On-Device RLS Adaptation (N1):** Pre-tunnel GNSS continuously calibrates model scale/bias online, freezing instantly upon tunnel entry.
* **Handover Latency:** **< 20 ms** transition from healthy GNSS to autonomous dead reckoning (1 IMU cycle at 50 Hz).
* **Live Video Demonstration:** [Watch TrueTrack Android Live Demo (YouTube)](https://youtu.be/truetrack-v2-demo)

---

## Slide 3: Technical Approach & Architecture

### 5-Block Horizontal Processing Pipeline (Readable at 14+ pt Font)

```text
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ 1. MULTI-RATE INPUTS   │ ───► │ 2. AI MOTION ESTIMATOR │ ───► │ 3. ALWAYS-ON FUSION    │ ───► │ 4. MAP CONSTRAINTS     │ ───► │ 5. NAVIGATION OUTPUT   │
│ • Phone MEMS (50-60 Hz)│      │ • Dynamic Alignment    │      │ • 16-State ES-EKF      │      │ • HMM Road Snapping    │      │ • < 20 ms Handover     │
│ • GNSS Doppler (1-10Hz)│      │ • 1D-TCN Speed v̂       │      │ • Kinematic NHC + ZUPT │      │ • Curvature Reset (N2) │      │ • 10-50 Hz Mobile HUD  │
│ • Offline OSM Graph    │      │ • Variance σ² Gating   │      │ • NIS χ² Spoof Defense │      │ • Tunnel Drift Budget  │      │ • 1.84% Verified Drift │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                                                            ▲                                │
                                                                            └────── One-Way Feedback ────────┘
```

#### Detailed Stage Breakdown:
1. **Multi-Rate Inputs:** Ingests raw acceleration, angular velocity, GNSS Doppler/pseudorange, and offline vector OSM geometry.
2. **AI Motion Estimation:** Gravity-levels arbitrary phone mounts (CUSUM shift detection in 120 ms). TCN infers forward velocity $\hat{v}$ and variance $\sigma_v^2$.
3. **Always-On Sensor Fusion:** 16-state ES-EKF executes continuous strapdown navigation at IMU rate, enforcing zero lateral slip ($v_{lat} \approx 0$) via NHC.
4. **Topological Map Constraints:** Snaps estimated trajectory to the most probable OSM road manifold using Viterbi emission/transition probabilities.
5. **Navigation Output:** Streams 10–50 Hz low-latency turn-by-turn guidance to the driver HUD with real-time confidence ellipses.

#### Novelty Legend:
* **N1 (On-Device RLS Adaptation):** Pre-tunnel GNSS Doppler adapts velocity head scale & bias; freezes instantly during blackouts.
* **N2 (Observability Drift Budget):** Road curvature bends break along-track unobservability and reset longitudinal drift.
* **N3 (Vibration Odometry — *EXPERIMENTAL*):** Explored engine RPM harmonic tracking from accelerometer power spectra; honestly documented and disabled on phone MEMS due to day-one kill criterion ($R < 0.90$).

---

## Slide 4: Feasibility, Viability & Empirical Performance

### Empirical Benchmark Table (Unified Canonical Metrics)

| Benchmark Metric | Baseline (B0 Hold Speed / SINS) | TrueTrack v2 (AI Fusion Engine) | Measured Gain | SIH Gate Status (<10%) |
| :--- | :---: | :---: | :---: | :---: |
| **Speed Estimation RMSE** | **3.84 m/s** (~13.8 km/h) | **0.72 m/s** (~2.6 km/h) | **5.3x lower error** | — |
| **Drift % on IO-VNBD Benchmark** | **14.82%** (20.7 m / 140 m) | **1.42%** (2.0 m / 140 m) | **10.4x reduction** | ✅ **PASSED** (7.0x margin) |
| **Drift % on Chennai Real MEMS (60.8 Hz)**| **14.82%** (20.9 m / 141 m) | **1.84%** (2.6 m / 141 m) | **8.1x reduction** | ✅ **PASSED** (5.4x margin) |
| **Drift % on FOG IMU (200 Hz Tactical)**| **8.40%** (11.8 m / 140 m) | **0.92%** (1.4 m / 140 m) | **9.1x reduction** | ✅ **PASSED** (10.8x margin) |

### Curved Route Demonstration: Chennai Koyambedu Flyover
* **The Scenario:** 45-second total GNSS blackout across a 400-meter sweeping curved arterial flyover.
* **Baseline B0 (Hold Speed):** Shoots straight tangent into the terrain, accumulating **14.82% drift** and violating lane boundaries.
* **TrueTrack v2:** Combines 1D-TCN forward speed, continuous heading integration, and non-holonomic constraints, tightly hugging the road curve with **1.84% drift (2.6 m)**.

### Measured Smartphone Hardware Footprint (iQOO Neo 7 — Dimensity 8200)
* **Model Footprint:** 123 KB INT8 ONNX quantized neural network.
* **Inference Latency:** **1.8 ms** per 50-sample window (under 20 ms budget for 50 Hz execution).
* **System Resource Usage:** **< 8% CPU load**, **45 MB RAM footprint**, and ~3.2%/hr battery consumption.
* **Handover Speed:** **< 20 ms** instant dead-reckoning takeover upon satellite deficit.

---

## Slide 5: Impact and Benefits

### Defensible Operational & Economic Impact
* **Logistics & Q-Commerce Fleet Efficiency:**
  * Eliminates missed flyover ramps and wrong turns in multi-tier intersections, saving **3–5 minutes per drop** in dense urban centers.
  * Sustains accurate delivery ETAs through multi-level underground parking and high-density commercial hubs.
* **Zero Additional Hardware Cost:**
  * Replaces expensive dedicated OBD-II / CAN-bus hardware dongles (₹15,000–₹50,000 per fleet vehicle) with a drop-in software SDK running on existing delivery driver smartphones.
* **Public Safety & Emergency Responders:**
  * Preserves unbroken route telemetry for ambulances and fire trucks traveling through sub-surface tunnels and urban underpasses where legacy GPS freezes.
* **RF-Interference & Electronic Warfare Resilience:**
  * High-resilience navigation: NIS $\chi^2$ innovation gating and CUSUM detectors isolate hostile or spoofed GNSS signals within **120–140 ms**, maintaining true physical trajectory.
* **Full Data Privacy & Compliance:**
  * 100% on-device local execution; zero telemetry or location coordinate transmission to cloud servers, ensuring complete DPDP compliance.

---

## Slide 6: Research and References

### Datasets and Empirical Evidence
1. **IO-VNBD Benchmark Dataset:** Standardized automotive inertial and wheel odometry benchmark from passenger car trials; used to benchmark and evaluate multi-rate kinematic constraints.
2. **Chennai Real-World Urban Drives:** 60.8 Hz smartphone MEMS data collected across complex urban corridors (Varadarajapuram, Koyambedu Flyover, Poonamallee High Road) establishing real-world phone viability under heavy multipath interference.

### Mathematical & Engineering Foundations
3. **Quaternion Error-State Extended Kalman Filter (ES-EKF):** Formulation following Sola (2017), tracking attitude errors, accelerometer biases, and gyroscope drift in a unified state vector.
4. **Heteroscedastic 1D Temporal Convolutional Networks (TCN):** Dilated causal convolution architecture trained with Gaussian Negative Log-Likelihood (NLL) loss (Kendall & Gal, 2017) to provide predictive uncertainty.
5. **Topological Hidden Markov Map-Matching:** Viterbi sequence decoding on OpenStreetMap road manifolds (Newson & Krumm, 2009).
6. **Cumulative Sum (CUSUM) Changepoint Detection:** Statistical quality control algorithm for sub-300ms phone mount displacement detection (Page, 1954).
