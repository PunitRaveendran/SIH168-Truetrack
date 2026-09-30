"""
GNSS Fault Injection and Integrity Benchmark.
Evaluates TrueTrack v2 against 4 synthetic & simulated GNSS attack vectors:
1. Jamming / High-Power Noise Bursts
2. Drag-off Spoofing (slow velocity pull-off)
3. Tunnel-Exit Multipath Spikes
4. Abrupt GNSS Blackout
Measures detection latency, gating reliability, and estimator trajectory continuity.
Outputs auto-generated to truetrack-v2/results/tables/fault_injection_results.md.
"""

import os
import sys
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from adapters.chennai_adapter import load_chennai_session
from integrity.gnss_integrity import GnssIntegrityMonitor, GnssIntegrityState
from estimators.es_ekf import ErrorStateEKF


def run_fault_injection_suite():
    print("=" * 70)
    print("TRUETRACK v2: RUNNING GNSS FAULT INJECTION BENCHMARK")
    print("=" * 70)

    # Load representative real highway drive (45_46)
    p = "c:/Users/Punit Raveendran/Desktop/Projects/IQOO/45_46-2026-09-25_10-54-49"
    session = load_chennai_session(p)
    df = session.df.iloc[1000:4000].reset_index(drop=True) # 50s segment (60 Hz IMU)

    t = df["t"].values
    dt = np.diff(t, prepend=t[0])
    dt[0] = 0.0

    scenarios = [
        ("1. Abrupt Blackout (Tunnel Entrance)", "blackout", 15.0, 35.0),
        ("2. Jamming RF Noise Burst", "jamming", 15.0, 25.0),
        ("3. Drag-Off Spoofing (0.4 m/s^2 Pull)", "spoofing", 15.0, 30.0),
        ("4. Tunnel-Exit Multipath Glitch", "multipath", 15.0, 18.0)
    ]

    suite_results = []

    for name, fault_type, t_start, t_end in scenarios:
        monitor = GnssIntegrityMonitor()
        ekf = ErrorStateEKF(
            init_pos=np.array([df["east"].iloc[0], df["north"].iloc[0], 0.0]),
            init_heading_rad=df["heading_true"].iloc[0]
        )

        detected_at = None
        max_pos_jump_m = 0.0
        prev_p = np.copy(ekf.p)

        gated_count = 0
        total_fault_epochs = 0
        normal_epochs = 0
        false_alarms = 0

        # Simulated GNSS updates at 1 Hz
        last_gnss_t = t[0]

        for i in range(len(t)):
            curr_t = t[i]
            # Predict step
            ekf.predict(df["ax"].iloc[i], df["ay"].iloc[i], df["az"].iloc[i],
                        df["gx"].iloc[i], df["gy"].iloc[i], df["gz"].iloc[i], dt[i])

            # Measure frame-to-frame position jump
            jump = np.linalg.norm(ekf.p[0:2] - prev_p[0:2])
            if jump > max_pos_jump_m:
                max_pos_jump_m = jump
            prev_p = np.copy(ekf.p)

            # GNSS arrival at ~1 Hz
            if curr_t - last_gnss_t >= 1.0:
                is_in_fault = (t_start <= curr_t <= t_end)
                gnss_valid = True
                meas_east = df["east"].iloc[i]
                meas_north = df["north"].iloc[i]
                meas_ve = df["v_true"].iloc[i] * np.sin(df["heading_true"].iloc[i])
                meas_vn = df["v_true"].iloc[i] * np.cos(df["heading_true"].iloc[i])
                accuracy = 3.0

                # Pre-lock initialization: first 10 seconds allow EKF to converge
                is_in_fault = (t_start <= curr_t <= t_end)
                gnss_valid = True
                meas_east = df["east"].iloc[i]
                meas_north = df["north"].iloc[i]
                meas_ve = df["v_true"].iloc[i] * np.sin(df["heading_true"].iloc[i])
                meas_vn = df["v_true"].iloc[i] * np.cos(df["heading_true"].iloc[i])
                accuracy = 2.5

                if is_in_fault:
                    total_fault_epochs += 1
                    if fault_type == "blackout":
                        gnss_valid = False
                    elif fault_type == "jamming":
                        meas_east += float(np.random.normal(0, 45.0))
                        meas_north += float(np.random.normal(0, 45.0))
                        accuracy = 35.0
                    elif fault_type == "spoofing":
                        drag_time = curr_t - t_start
                        meas_ve += 0.4 * (drag_time ** 1.5)
                        meas_east += 0.2 * (drag_time ** 2.5)
                    elif fault_type == "multipath":
                        meas_east += 35.0
                        meas_north += 25.0
                        accuracy = 18.0
                elif curr_t > 10.0:
                    normal_epochs += 1

                # Integrity Evaluation
                P_sub = np.eye(4) * 4.0
                rep = monitor.evaluate(
                    gnss_valid=gnss_valid,
                    east_meas=meas_east, north_meas=meas_north,
                    v_east_meas=meas_ve, v_north_meas=meas_vn,
                    accuracy_meas=accuracy,
                    est_east=ekf.p[0], est_north=ekf.p[1],
                    est_ve=ekf.v_fwd * np.sin(ekf.psi), est_vn=ekf.v_fwd * np.cos(ekf.psi),
                    P_cov_4x4=P_sub,
                    dt_since_last_gnss=curr_t - last_gnss_t
                )

                if is_in_fault:
                    if rep.is_gnss_gated or rep.state != GnssIntegrityState.HEALTHY_LOCK:
                        gated_count += 1
                        if detected_at is None:
                            detected_at = curr_t
                elif curr_t > 10.0:
                    if rep.is_gnss_gated:
                        false_alarms += 1

                # Apply GNSS to EKF if not gated
                if gnss_valid and not rep.is_gnss_gated:
                    ekf.update_gnss(meas_east, meas_north, meas_ve, meas_vn,
                                    pos_var=(accuracy * rep.r_inflation_factor)**2)

                last_gnss_t = curr_t

        latency_ms = (detected_at - t_start) * 1000.0 if detected_at is not None else 9999.0
        gating_rate = (gated_count / max(1, total_fault_epochs)) * 100.0
        fa_rate = (false_alarms / max(1, normal_epochs)) * 100.0

        suite_results.append({
            "Attack / Anomaly Vector": name,
            "Fault Duration": f"{t_end - t_start:.1f} s",
            "Detection Latency": f"{latency_ms:.0f} ms",
            "Fault Mitigation Rate": f"{gating_rate:.1f}%",
            "False Alarm Rate": f"{fa_rate:.1f}%",
            "Max Trajectory Step Jump": f"{max_pos_jump_m:.2f} m",
            "Estimator Continuity": "C1 Smooth (Zero Teleport)" if max_pos_jump_m < 2.0 else "Discontinuous"
        })

    df_suite = pd.DataFrame(suite_results)
    print("\n" + df_suite.to_string(index=False))

    out_dir = os.path.join(os.path.dirname(BASE_DIR), "results", "tables")
    os.makedirs(out_dir, exist_ok=True)
    md_path = os.path.join(out_dir, "fault_injection_results.md")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# GNSS Fault Injection & Integrity Mitigation Benchmark\n\n")
        f.write("> **Phase 3 Gate Evidence:** Injects 4 realistic attack/anomaly vectors: Jamming, CUSUM Drag-Off Spoofing, Tunnel-Exit Multipath, and Sudden Blackout. Measures detection latency and trajectory continuity.\n\n")
        f.write(df_suite.to_markdown(index=False))
        f.write("\n")

    print(f"\nSaved fault injection benchmark report to: {md_path}")
    return df_suite


if __name__ == "__main__":
    run_fault_injection_suite()
