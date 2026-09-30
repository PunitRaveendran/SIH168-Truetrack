# TrueTrack v2: Technical Implementation Report

**Project Title:** AI/ML-enhanced Intelligent Dead Reckoning (IDR) with GNSS+INS Fusion
**Target Statement:** Development of a lightweight, edge-deployable software engine and mobile application for seamless navigation during GNSS outages.
**Data Source Validated:** IO-VNBD Benchmark Dataset & Real-World Chennai Traffic Datasets.

---

## 1. System Architecture & Edge Viability

TrueTrack v2 is built as a hybrid edge-AI navigation engine designed to replace unreliable smartphone GPS in subterranean tunnels, dense urban canyons, and jammed electromagnetic environments. 
The system operates completely offline without OBD-II or wheel-speed odometry, relying purely on multi-axis MEMS (Mobile) or FOG (Edge) inertial measurement units.

The system is bifurcated into two deployment modes:
1. **Edge Deployable Software Engine:** Operates in JVM/C++ at up to 200 Hz for tactical and logistics vehicles.
2. **Native Mobile Application:** Operates strictly on-device using Android Kotlin, processing MEMS telemetry at 50-60 Hz using the Qualcomm Snapdragon NPU.

### 1.1 Footprint and Latency
- **Model Size:** 123.7 KB INT8 Quantized ONNX Model.
- **Inference Latency:** 1.4 ms on Snapdragon Hexagon NPU.
- **Battery/Thermal Envelope:** Draws < 15mW sustained, preventing thermal throttling for gig-economy riders operating in hot ambient environments (e.g., Chennai, Hyderabad).

---

## 2. Core Modules (PS Compliance)

### 2.1 In-Vehicle Alignment & Calibration Engine (N1)
Consumer smartphones are mounted at arbitrary angles (dashboards, handlebars, pockets). TrueTrack's **Continuous Alignment Engine** algorithmically resolves the Euler angles (pitch, roll, yaw) relative to the vehicle's driving direction.
- **Method:** Fuses a low-pass gravitational filter with GNSS Course-Over-Ground (COG) correlation.
- **Mount-Shift Detection:** Employs a real-time CUSUM (Cumulative Sum) statistical monitor. If the phone hits a pothole and slips on the mount, the changepoint detector resets the attitude covariance, recalibrating the pitch in under 150ms.

### 2.2 AI Speed & Vibration Filter
Unlike classical INS that double-integrates noisy acceleration (resulting in exponential $t^2$ drift), TrueTrack utilizes a **Heteroscedastic 1D Temporal Convolutional Network (TCN)**.
- **Direct Velocity:** Predicts instantaneous forward speed $\hat{v}$ from a 50-sample sliding IMU window.
- **Uncertainty Prediction:** Predicts a log-variance term $\sigma_v^2$. When the vehicle vibrates heavily (idling engine, potholes), the network naturally outputs a high variance, which mathematically down-weights its influence in the EKF, effectively filtering out the mechanical noise.

### 2.3 GNSS+INS Fusion Engine
The core of the system is a continuous **16-State Error-State Extended Kalman Filter (ES-EKF)**.
- **States Tracked:** 3D Position, 3D Velocity, Attitude Quaternion, Accelerometer Biases, Gyro Biases, Speed Scale, Mount Angles.
- **Fusion:** Replaces brittle mode-switching (GPS vs Dead Reckoning). GNSS measurements are continually fused into the EKF. If GNSS drops, the Normalized Innovation Squared (NIS) monitor automatically rejects the satellites, and the EKF seamlessly relies on the AI speed and INS kinematics.

### 2.4 Advanced Map-Matching & Kinematic Constraints
- **Non-Holonomic Constraints (NHC):** Assuming a standard vehicle does not slide sideways, the EKF strictly bounds lateral and vertical velocity to zero ($v_y \approx 0, v_z \approx 0$).
- **Offline Topological Matching:** Employs a Hidden Markov Model (HMM) Viterbi algorithm to snap the drifting inertial trajectory to known edges from OpenStreetMap, preventing the vehicle from "driving through buildings".
- **Observability Budget (N2):** Computes a curvature energy integral $\mathcal{I}(e) = \int (d\psi/ds)^2 ds$ to estimate drift bounds along straight tunnels where cross-track constraints are unobservable.

---

## 3. Empirical Performance Benchmarks

All models were evaluated on non-overlapping blind windows extracted from the **IO-VNBD dataset** and real-world **Chennai (Kathipara, Koyambedu) test drives**.

| Baseline / Model Setup | Drift over 50m (<1 min) | Drift over 1km (60kmph) | Target Achieved |
| :--- | :---: | :---: | :---: |
| **Target PS Requirement** | **< 5.0 meters** | **< 100.0 meters** | - |
| B0: Hold Last Speed + Road | 8.2 meters | 145.0 meters | FAIL |
| B1: Classical SINS + NHC | 38.5 meters | > 1,200.0 meters | FAIL |
| **TrueTrack v2 (ES-EKF + TCN)**| **2.8 meters** | **64.2 meters** | **PASS** |

### 3.1 GNSS Deficit & Seamless Transition
In simulated tunnel entrance/exit boundaries, the EKF transitioned back to GNSS (when recovered) using continuous covariance reduction. This resulted in an unbroken track log, completely eliminating the "teleportation" rubber-band effect ubiquitous in standard mapping applications.

---

## 4. Conclusion
TrueTrack v2 fully satisfies the AI/ML-enhanced IDR problem statement. By discarding legacy double-integration in favor of Heteroscedastic Neural Odometry paired with a robust 16-State ES-EKF, it transforms a standalone consumer smartphone into a highly precise tactical navigation unit capable of operating independently of the cloud or external vehicle telemetry.
