# N3 Feasibility Study: Vibration as an Odometer
> **Mission Rule:** Test hypothesis honestly. If raw sample rate < 100 Hz or peak frequency ridge correlation R < 0.90, execute kill criterion, document negative result, and disable N3.
### Dataset: `Varadarajapuram-2026-09-25_11-12-54`
- **Native IMU Sampling Rate:** 60.8 Hz (FAIL - Under 100 Hz)
- **Nyquist Frequency Limit:** 30.4 Hz
- **Measured Pearson Correlation (R):** **-0.001** (FAIL - Below 0.90 target)
- **Physical Analysis:** Single-cylinder two-wheeler engines operate at 1,800 to 6,000 RPM, producing primary harmonics at 30 Hz to 100 Hz. With Android's `SENSOR_DELAY_GAME` rate of ~60.8 Hz, the Nyquist frequency is 30.4 Hz. Consequently, all genuine engine firing orders alias back into the 0–30 Hz band, creating non-monotonic frequency folding rather than a linear speed-frequency ridge.

### Dataset: `45_46-2026-09-25_10-54-49`
- **Native IMU Sampling Rate:** 60.9 Hz (FAIL - Under 100 Hz)
- **Nyquist Frequency Limit:** 30.4 Hz
- **Measured Pearson Correlation (R):** **-0.114** (FAIL - Below 0.90 target)
- **Physical Analysis:** Single-cylinder two-wheeler engines operate at 1,800 to 6,000 RPM, producing primary harmonics at 30 Hz to 100 Hz. With Android's `SENSOR_DELAY_GAME` rate of ~60.8 Hz, the Nyquist frequency is 30.4 Hz. Consequently, all genuine engine firing orders alias back into the 0–30 Hz band, creating non-monotonic frequency folding rather than a linear speed-frequency ridge.

## Final Decision & Execution of Kill Criterion
**KILL CRITERION TRIGGERED: N3 IS OFFICIALLY DISABLED.**

- **Verdict:** Negative result documented honestly in accordance with Section 7 of the SIH mission prompt.
- **Engineering Action:** Vibration frequency ridge tracking will **NOT** be fused into the state estimator. The ES-EKF will rely strictly on the validated causal signal path, pothole shock gating, and heteroscedastic TCN forward speed.
- **Academic Merit for Pitch Defense:** Judges respect negative results backed by physical signal processing facts (Nyquist aliasing on 60 Hz Android sensors). Demonstrating that we tested and rejected N3 with measured data proves rigorous engineering integrity rather than blind feature-stacking.
