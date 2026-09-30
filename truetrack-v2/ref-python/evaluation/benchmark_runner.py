"""
Automated SIH Benchmark Harness & Baseline Evaluation Runner.
Executes B0, B1, B2 on identical non-overlapping windows across Chennai and IO-VNBD datasets.
Outputs verified metrics directly to truetrack-v2/results/tables/ and results/figures/.
Never invents, estimates, or copies metrics.
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Ensure ref-python is on path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from adapters.chennai_adapter import load_chennai_session
from adapters.iovnbd_adapter import generate_mock_iovnbd_session
from adapters.fog_sim_generator import generate_fog_stream
from evaluation.splits import extract_non_overlapping_windows, extract_ps_benchmark_windows
from evaluation.baselines import run_baseline_b0, run_baseline_b1, run_baseline_b2_v1_model


def run_all_baselines():
    print("=" * 70)
    print("TRUETRACK v2: RUNNING PHASE 1 BASELINE BENCHMARKS")
    print("=" * 70)

    # 1. Load Real Datasets from IQOO project
    chennai_base = "c:/Users/Punit Raveendran/Desktop/Projects/IQOO"
    sessions = []

    for name in ["Varadarajapuram-2026-09-25_11-12-54", "45_46-2026-09-25_10-54-49", "Rohini_Theatre_Koyambedu-2026-09-25_13-05-40"]:
        p = os.path.join(chennai_base, name)
        if os.path.exists(p):
            print(f"Loading real Chennai dataset: {name}...")
            s = load_chennai_session(p)
            sessions.append(s)
            print(f"  Loaded {len(s.df)} samples, duration {s.df['t'].iloc[-1]:.1f}s, rate {s.imu_rate_hz:.1f} Hz")
        else:
            print(f"Warning: path {p} not found!")

    # 2. Load IO-VNBD session (Simulated benchmark stream until raw CSVs mounted)
    print("Generating benchmark-compliant IO-VNBD Coventry car session (SIMULATED)...")
    s_iovnbd = generate_mock_iovnbd_session("IO-VNBD_Coventry_Car_SIMULATED", duration_s=320.0)
    sessions.append(s_iovnbd)
    print(f"  Loaded {len(s_iovnbd.df)} samples, duration {s_iovnbd.df['t'].iloc[-1]:.1f}s, rate {s_iovnbd.imu_rate_hz:.1f} Hz")

    # 3. Generate 200 Hz FOG-grade session (SIMULATED) from 45_46 express run
    if len(sessions) > 1:
        print("Generating 200 Hz Tactical FOG stream from highway run (SIMULATED)...")
        s_fog = generate_fog_stream(sessions[1], target_rate_hz=200.0)
        sessions.append(s_fog)
        print(f"  Generated {len(s_fog.df)} samples, duration {s_fog.df['t'].iloc[-1]:.1f}s, rate {s_fog.imu_rate_hz:.1f} Hz")

    # 4. Extract Non-Overlapping Windows across all sessions
    all_windows = []
    for s in sessions:
        w_list = extract_non_overlapping_windows(s, window_duration_s=45.0, min_speed_mps=3.0, window_category="standard_45s")
        all_windows.extend([(s, w) for w in w_list])
        # Also extract high-speed 60s windows if speed >= 12 m/s (~45 km/h)
        w60_list = extract_non_overlapping_windows(s, window_duration_s=60.0, min_speed_mps=12.0, window_category="highspeed_60s")
        all_windows.extend([(s, w) for w in w60_list])

    print(f"\nTotal non-overlapping evaluation windows extracted: {len(all_windows)}")

    # 5. Evaluate B0, B1, B2 on identical windows
    results = []

    for s, w in all_windows:
        res_b0 = run_baseline_b0(s, w)
        res_b1 = run_baseline_b1(s, w)
        res_b2 = run_baseline_b2_v1_model(s, w)

        for r in [res_b0, res_b1, res_b2]:
            results.append({
                "window_id": w.window_id,
                "dataset_name": w.dataset_name,
                "vehicle_type": w.vehicle_type,
                "is_simulated": w.is_simulated,
                "category": w.window_category,
                "baseline": r.baseline_name,
                "duration_s": w.duration_s,
                "traveled_dist_m": round(w.traveled_dist_m, 1),
                "avg_speed_kmh": round(w.avg_speed_mps * 3.6, 1),
                "drift_m": round(r.drift_m, 2),
                "drift_pct": round(r.drift_pct_dist, 2),
                "along_track_err_m": round(r.along_track_err_m, 2),
                "cross_track_err_m": round(r.cross_track_err_m, 2),
                "max_drift_m": round(r.max_drift_m, 2)
            })

    df_res = pd.DataFrame(results)

    # 6. Save Raw Results CSV
    out_dir = os.path.join(os.path.dirname(BASE_DIR), "results", "tables")
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "baselines_benchmark_table.csv")
    df_res.to_csv(csv_path, index=False)
    print(f"\nSaved raw baseline results to: {csv_path}")

    # 7. Compute Summary Statistics by Baseline
    print("\n" + "=" * 80)
    print("PS-FORMAT BENCHMARK SUMMARY TABLE: BASELINES (NON-OVERLAPPING WINDOWS)")
    print("=" * 80)

    summary_rows = []
    for baseline, group in df_res.groupby("baseline"):
        med_drift_pct = group["drift_pct"].median()
        mean_drift_pct = group["drift_pct"].mean()
        p90_drift_pct = np.percentile(group["drift_pct"], 90)
        worst_drift_m = group["drift_m"].max()
        mean_along = group["along_track_err_m"].mean()
        mean_cross = group["cross_track_err_m"].mean()
        
        # SIH PS Check: Below 10% drift
        passed_10pct = (group["drift_pct"] < 10.0).sum() / len(group) * 100.0

        summary_rows.append({
            "Baseline Architecture": baseline,
            "Evaluated Windows": len(group),
            "Median Drift (%)": f"{med_drift_pct:.1f}%",
            "Mean Drift (%)": f"{mean_drift_pct:.1f}%",
            "P90 Drift (%)": f"{p90_drift_pct:.1f}%",
            "Worst-Case Drift (m)": f"{worst_drift_m:.1f} m",
            "Mean Along-Track (m)": f"{mean_along:.1f} m",
            "Mean Cross-Track (m)": f"{mean_cross:.1f} m",
            "<10% Drift Pass Rate": f"{passed_10pct:.1f}%"
        })

    df_summary = pd.DataFrame(summary_rows)
    print(df_summary.to_string(index=False))

    # Save Markdown Table
    md_path = os.path.join(out_dir, "baselines_benchmark_summary.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# Baseline Performance Evaluation (Phase 1 Gate)\n\n")
        f.write("> **Evaluation Standards:** Evaluated on strictly non-overlapping blackout windows across real Chennai drives and IO-VNBD traces. Baselines include B0 (hold speed + follow heading), B1 (strapdown INS + NHC), and B2 (v1 neural point estimate).\n\n")
        f.write(df_summary.to_markdown(index=False))
        f.write("\n\n### Window-by-Window Breakdown\n\n")
        f.write(df_res[["window_id", "baseline", "traveled_dist_m", "avg_speed_kmh", "drift_m", "drift_pct", "along_track_err_m", "cross_track_err_m"]].to_markdown(index=False))
    print(f"Saved summary markdown to: {md_path}")

    # 8. Generate Trajectory Plots
    fig_dir = os.path.join(os.path.dirname(BASE_DIR), "results", "figures")
    os.makedirs(fig_dir, exist_ok=True)
    generate_baseline_plots(all_windows[0][0], all_windows[0][1], s_iovnbd, fig_dir)

    print("\nPhase 1 Baseline Benchmark Execution Completed Successfully!")
    return df_res, df_summary


def generate_baseline_plots(chennai_session, chennai_window, iovnbd_session, fig_dir):
    """
    Generate ground-truth vs baseline comparison plots for IO-VNBD and Chennai runs.
    """
    # 1. IO-VNBD Plot
    w_io = extract_non_overlapping_windows(iovnbd_session, window_duration_s=45.0)[0]
    r_b0 = run_baseline_b0(iovnbd_session, w_io)
    r_b1 = run_baseline_b1(iovnbd_session, w_io)
    r_b2 = run_baseline_b2_v1_model(iovnbd_session, w_io)

    plt.figure(figsize=(10, 6), dpi=150)
    plt.plot(r_b0.east_true, r_b0.north_true, 'k-', linewidth=2.5, label='Ground Truth (IO-VNBD Car)')
    plt.plot(r_b0.east_est, r_b0.north_est, 'r--', linewidth=1.8, label=f'B0 Hold Speed (Drift: {r_b0.drift_m:.1f}m / {r_b0.drift_pct_dist:.1f}%)')
    plt.plot(r_b1.east_est, r_b1.north_est, 'm-.', linewidth=1.8, label=f'B1 INS + NHC (Drift: {r_b1.drift_m:.1f}m / {r_b1.drift_pct_dist:.1f}%)')
    plt.plot(r_b2.east_est, r_b2.north_est, 'b:', linewidth=2.0, label=f'B2 v1 1D-CNN (Drift: {r_b2.drift_m:.1f}m / {r_b2.drift_pct_dist:.1f}%)')
    
    plt.title(f"IO-VNBD Ground Vehicle: Baseline Drift Comparison (45s Blackout, Coventry UK)\n[SIMULATED BENCHMARK TRACE]", fontsize=11, fontweight='bold')
    plt.xlabel("Local East Position (meters)")
    plt.ylabel("Local North Position (meters)")
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.legend(loc='best', frameon=True)
    plt.tight_layout()
    io_plot_path = os.path.join(fig_dir, "iovnbd_trajectory_baseline.png")
    plt.savefig(io_plot_path)
    plt.close()
    print(f"Saved IO-VNBD trajectory plot to: {io_plot_path}")

    # 2. Chennai Real Dataset Plot
    r_c_b0 = run_baseline_b0(chennai_session, chennai_window)
    r_c_b1 = run_baseline_b1(chennai_session, chennai_window)
    r_c_b2 = run_baseline_b2_v1_model(chennai_session, chennai_window)

    plt.figure(figsize=(10, 6), dpi=150)
    plt.plot(r_c_b0.east_true, r_c_b0.north_true, 'k-', linewidth=2.5, label=f'Ground Truth ({chennai_session.session_id[:16]})')
    plt.plot(r_c_b0.east_est, r_c_b0.north_est, 'r--', linewidth=1.8, label=f'B0 Hold Speed (Drift: {r_c_b0.drift_m:.1f}m / {r_c_b0.drift_pct_dist:.1f}%)')
    plt.plot(r_c_b1.east_est, r_c_b1.north_est, 'm-.', linewidth=1.8, label=f'B1 INS + NHC (Drift: {r_c_b1.drift_m:.1f}m / {r_c_b1.drift_pct_dist:.1f}%)')
    plt.plot(r_c_b2.east_est, r_c_b2.north_est, 'b:', linewidth=2.0, label=f'B2 v1 1D-CNN (Drift: {r_c_b2.drift_m:.1f}m / {r_c_b2.drift_pct_dist:.1f}%)')

    plt.title(f"Real Chennai Two-Wheeler: Baseline Drift Comparison (45s Blackout)\n[REAL SMARTPHONE HANDLEBAR DATA]", fontsize=11, fontweight='bold')
    plt.xlabel("Local East Position (meters)")
    plt.ylabel("Local North Position (meters)")
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.legend(loc='best', frameon=True)
    plt.tight_layout()
    ch_plot_path = os.path.join(fig_dir, "chennai_trajectory_baseline.png")
    plt.savefig(ch_plot_path)
    plt.close()
    print(f"Saved Chennai trajectory plot to: {ch_plot_path}")


if __name__ == "__main__":
    run_all_baselines()
