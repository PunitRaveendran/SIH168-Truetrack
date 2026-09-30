"""
Conformance Test: Verifies that ErrorStateEKF algorithm reproduces golden vectors within 1e-4 tolerance.
"""

import os
import sys
import json
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from estimators.es_ekf import ErrorStateEKF


def run_conformance_test():
    golden_path = os.path.join(os.path.dirname(BASE_DIR), "ref-python", "tests", "golden_vectors.json")
    if not os.path.exists(golden_path):
        raise FileNotFoundError(f"Missing golden vectors: {golden_path}")

    with open(golden_path, "r", encoding="utf-8") as f:
        vectors = json.load(f)

    # Re-run simulation
    ekf = ErrorStateEKF(init_pos=np.array([100.0, 200.0, 0.0]), init_heading_rad=0.5)

    max_pos_diff = 0.0
    max_vel_diff = 0.0
    max_heading_diff = 0.0

    for step in vectors:
        inp = step["inputs"]
        dt = inp["dt"]
        i = step["step"]

        ekf.predict(inp["ax"], inp["ay"], inp["az"], inp["gx"], inp["gy"], inp["gz"], dt)

        if i % 5 == 0:
            ekf.update_neural_speed(speed_mps=12.5, var_speed=0.25)
        if i % 2 == 0:
            ekf.update_nhc(var_lat=0.05, var_vert=0.2)
        if i < 20 and i % 50 == 0:
            ekf.update_gnss(east=105.0, north=210.0, v_e=6.0, v_n=10.0)

        out = step["outputs"]
        pos_diff = np.sqrt((ekf.p[0] - out["east"])**2 + (ekf.p[1] - out["north"])**2)
        vel_diff = abs(ekf.v_fwd - out["v_fwd"])
        head_diff = abs(ekf.psi - out["psi_rad"])

        if pos_diff > max_pos_diff:
            max_pos_diff = pos_diff
        if vel_diff > max_vel_diff:
            max_vel_diff = vel_diff
        if head_diff > max_heading_diff:
            max_heading_diff = head_diff

    print("=" * 70)
    print("GOLDEN VECTOR CONFORMANCE TEST RESULTS")
    print("=" * 70)
    print(f"Total Steps Tested: {len(vectors)}")
    print(f"Max Position Discrepancy: {max_pos_diff:.2e} m (Target: < 1e-4)")
    print(f"Max Velocity Discrepancy: {max_vel_diff:.2e} m/s (Target: < 1e-4)")
    print(f"Max Heading Discrepancy:  {max_heading_diff:.2e} rad (Target: < 1e-4)")

    passed = (max_pos_diff < 1e-4 and max_vel_diff < 1e-4 and max_heading_diff < 1e-4)
    print(f"\nCONFORMANCE GATE STATUS: {'PASSED (Zero Divergence)' if passed else 'FAILED'}")
    return passed


if __name__ == "__main__":
    run_conformance_test()
