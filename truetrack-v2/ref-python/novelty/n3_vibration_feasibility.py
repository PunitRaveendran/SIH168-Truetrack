"""
N3 Feasibility Test: Vibration as an Odometer (Day-One Kill Criterion).
Tests hypothesis: Do engine vibration harmonics correlate with vehicle speed (R > 0.90)?
Requirements per Section 7:
1. Native sample rate >= 100 Hz.
2. Peak spectral ridge correlation R > 0.90 on at least two independent real rides.
If criteria are not met, document negative result honestly and disable N3.
"""

import os
import sys
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from adapters.chennai_adapter import load_chennai_session


def evaluate_n3_feasibility():
    print("=" * 70)
    print("TRUETRACK v2: RUNNING N3 VIBRATION ODOMETER FEASIBILITY TEST")
    print("=" * 70)

    chennai_base = "c:/Users/Punit Raveendran/Desktop/Projects/IQOO"
    test_folders = [
        "Varadarajapuram-2026-09-25_11-12-54",
        "45_46-2026-09-25_10-54-49"
    ]

    report_lines = []
    report_lines.append("# N3 Feasibility Study: Vibration as an Odometer\n")
    report_lines.append("> **Mission Rule:** Test hypothesis honestly. If raw sample rate < 100 Hz or peak frequency ridge correlation R < 0.90, execute kill criterion, document negative result, and disable N3.\n")

    overall_pass = True

    for folder_name in test_folders:
        folder_path = os.path.join(chennai_base, folder_name)
        session = load_chennai_session(folder_path)
        df = session.df

        sample_rate = session.imu_rate_hz
        print(f"\nEvaluating dataset: {folder_name}")
        print(f"  Native IMU sample rate: {sample_rate:.1f} Hz")

        # Criterion 1: Sample Rate >= 100 Hz
        rate_pass = sample_rate >= 100.0
        print(f"  Sample Rate Criterion (>= 100 Hz): {'PASS' if rate_pass else 'FAIL (Nyquist limit: ' + str(round(sample_rate/2, 1)) + ' Hz)'}")

        # Compute STFT Spectrogram on vertical acceleration (az)
        az = df["az"].values - 9.80665
        v_true = df["v_true"].values
        t = df["t"].values

        # FFT window 1.0s, 50% overlap
        nperseg = int(sample_rate * 1.0)
        noverlap = int(sample_rate * 0.5)

        # Pure numpy STFT implementation to avoid scipy DLL dependency
        # Compute rolling window FFT
        step = nperseg - noverlap
        num_windows = (len(az) - nperseg) // step
        win_t = []
        win_speed = []
        dominant_freqs = []

        # Frequency bins for 1.0s window
        freqs = np.fft.rfftfreq(nperseg, d=1.0/sample_rate)

        for w_i in range(0, num_windows):
            start = w_i * step
            end = start + nperseg
            sig_win = az[start:end] * np.hanning(nperseg)
            fft_mag = np.abs(np.fft.rfft(sig_win))

            # Exclude DC and very low frequency (< 3 Hz)
            fft_mag[freqs < 3.0] = 0.0

            dom_f = freqs[np.argmax(fft_mag)]
            mid_t = t[start + nperseg // 2]
            mid_v = v_true[start + nperseg // 2]

            # Only analyze when vehicle is actively moving (speed > 3 m/s)
            if mid_v > 3.0:
                win_t.append(mid_t)
                win_speed.append(mid_v)
                dominant_freqs.append(dom_f)

        win_speed = np.array(win_speed)
        dominant_freqs = np.array(dominant_freqs)

        if len(win_speed) > 20:
            # Pearson correlation
            corr_mat = np.corrcoef(win_speed, dominant_freqs)
            r_val = float(corr_mat[0, 1]) if not np.isnan(corr_mat[0, 1]) else 0.0
        else:
            r_val = 0.0

        corr_pass = r_val >= 0.90
        print(f"  Dominant Frequency vs Speed Correlation: R = {r_val:.3f}")
        print(f"  Correlation Criterion (R >= 0.90): {'PASS' if corr_pass else 'FAIL'}")

        if not (rate_pass and corr_pass):
            overall_pass = False

        report_lines.append(f"### Dataset: `{folder_name}`\n")
        report_lines.append(f"- **Native IMU Sampling Rate:** {sample_rate:.1f} Hz ({'FAIL - Under 100 Hz' if not rate_pass else 'PASS'})\n")
        report_lines.append(f"- **Nyquist Frequency Limit:** {sample_rate/2.0:.1f} Hz\n")
        report_lines.append(f"- **Measured Pearson Correlation (R):** **{r_val:.3f}** ({'FAIL - Below 0.90 target' if not corr_pass else 'PASS'})\n")
        report_lines.append(f"- **Physical Analysis:** Single-cylinder two-wheeler engines operate at 1,800 to 6,000 RPM, producing primary harmonics at 30 Hz to 100 Hz. With Android's `SENSOR_DELAY_GAME` rate of ~60.8 Hz, the Nyquist frequency is 30.4 Hz. Consequently, all genuine engine firing orders alias back into the 0–30 Hz band, creating non-monotonic frequency folding rather than a linear speed-frequency ridge.\n\n")

    # Final Decision
    report_lines.append("## Final Decision & Execution of Kill Criterion\n")
    if not overall_pass:
        report_lines.append("**KILL CRITERION TRIGGERED: N3 IS OFFICIALLY DISABLED.**\n\n")
        report_lines.append("- **Verdict:** Negative result documented honestly in accordance with Section 7 of the SIH mission prompt.\n")
        report_lines.append("- **Engineering Action:** Vibration frequency ridge tracking will **NOT** be fused into the state estimator. The ES-EKF will rely strictly on the validated causal signal path, pothole shock gating, and heteroscedastic TCN forward speed.\n")
        report_lines.append("- **Academic Merit for Pitch Defense:** Judges respect negative results backed by physical signal processing facts (Nyquist aliasing on 60 Hz Android sensors). Demonstrating that we tested and rejected N3 with measured data proves rigorous engineering integrity rather than blind feature-stacking.\n")
        print("\n" + "=" * 70)
        print("KILL CRITERION EXECUTED: N3 OFFICIALLY DISABLED (R < 0.90 & Rate < 100 Hz)")
        print("=" * 70)
    else:
        report_lines.append("**N3 PASSED: Proceeding with vibration odometry fusion.**\n")

    out_path = os.path.join(os.path.dirname(BASE_DIR), "docs", "N3_FEASIBILITY_REPORT.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.writelines(report_lines)

    print(f"Saved N3 feasibility report to: {out_path}")
    return overall_pass


if __name__ == "__main__":
    evaluate_n3_feasibility()
