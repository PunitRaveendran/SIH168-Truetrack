"""
Golden Vector Generator for Python-Kotlin Engine Conformance.
Generates deterministic input/output test vectors to guarantee that the production Kotlin engine
reproduces ref-python results within 1e-4 tolerance.
"""

import os
import sys
import json
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from estimators.es_ekf import ErrorStateEKF
from alignment.continuous_alignment import ContinuousAlignmentEngine, rotate_imu_to_vehicle


def generate_vectors(num_steps: int = 100, out_path: str = None):
    rng = np.random.default_rng(2026)

    ekf = ErrorStateEKF(init_pos=np.array([100.0, 200.0, 0.0]), init_heading_rad=0.5)
    align = ContinuousAlignmentEngine(imu_rate_hz=50.0)

    steps = []
    dt = 0.02 # 50 Hz

    for i in range(num_steps):
        # Synthetic kinematic input
        t = i * dt
        ax = float(rng.normal(0.2, 0.05))
        ay = float(rng.normal(1.0, 0.05))
        az = float(rng.normal(9.8, 0.1))
        gx = float(rng.normal(0.0, 0.002))
        gy = float(rng.normal(0.0, 0.002))
        gz = float(rng.normal(0.03, 0.005)) # steady turn

        align_state = align.update(ax, ay, az, gx, gy, gz, gnss_valid=(i < 20), gnss_speed=12.0)
        ax_v, ay_v, az_v, gx_v, gy_v, gz_v = rotate_imu_to_vehicle(ax, ay, az, gx, gy, gz, align_state.R_b_v)

        # Predict
        ekf.predict(ax_v, ay_v, az_v, gx_v, gy_v, gz_v, dt)

        # Measurements
        has_speed_upd = (i % 5 == 0)
        if has_speed_upd:
            ekf.update_neural_speed(speed_mps=12.5, var_speed=0.25)

        has_nhc_upd = (i % 2 == 0)
        if has_nhc_upd:
            ekf.update_nhc(var_lat=0.05, var_vert=0.2)

        has_gnss_upd = (i < 20 and i % 50 == 0)
        if has_gnss_upd:
            ekf.update_gnss(east=105.0, north=210.0, v_e=6.0, v_n=10.0)

        steps.append({
            "step": i,
            "inputs": {
                "ax": ax, "ay": ay, "az": az,
                "gx": gx, "gy": gy, "gz": gz,
                "dt": dt
            },
            "alignment": {
                "pitch_deg": align_state.pitch_deg,
                "roll_deg": align_state.roll_deg,
                "yaw_deg": align_state.yaw_deg
            },
            "outputs": {
                "east": float(ekf.p[0]),
                "north": float(ekf.p[1]),
                "v_fwd": float(ekf.v_fwd),
                "psi_rad": float(ekf.psi),
                "ba_fwd": float(ekf.ba_fwd),
                "bg_yaw": float(ekf.bg_yaw),
                "scale_v": float(ekf.scale_v)
            }
        })

    if out_path is None:
        out_path = os.path.join(os.path.dirname(BASE_DIR), "ref-python", "tests", "golden_vectors.json")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(steps, f, indent=2)

    print(f"Generated {len(steps)} golden vectors to: {out_path}")
    return steps


if __name__ == "__main__":
    generate_vectors()
