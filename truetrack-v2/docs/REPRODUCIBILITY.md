# TrueTrack v2: Reproducibility & Judging Guide

This guide ensures the Smart India Hackathon (SIH) judging panel can independently verify all claims, metrics, and models submitted.

## 1. Verifying Neural Odometry Benchmark
To prove the 1D-TCN model achieves the stated sub-5-meter drift:
1. Navigate to `truetrack-v2/ref-python/evaluation/`.
2. Run the IO-VNBD benchmark:
   ```bash
   python benchmark_runner.py --dataset iovnbd --model tcn_heteroscedastic
   ```
3. The script will output `results/tables/baselines_benchmark_summary.md` and generate the error distribution plots in `results/figures/`.

## 2. Verifying Edge Engine (Kotlin) Conformance
To prove the Kotlin engine behaves mathematically identically to the Python research code:
1. Navigate to the root directory.
2. Run the Gradle golden-vector tests:
   ```bash
   ./gradlew :engine-core:test
   ```
3. This injects synthetic IMU data and asserts that the 16-State ES-EKF matrix outputs match Python precision up to 1e-4.

## 3. Running the Edge CLI
To demonstrate edge deployment capabilities (200Hz FOG IMU):
1. Navigate to `truetrack-v2/edge-cli/`.
2. Execute the compiled CLI:
   ```bash
   ./gradlew run --args="--imu ../sensor-profiles/fog_simulated.json"
   ```

## 4. Demonstrating N1 (In-Vehicle Alignment)
The CUSUM mount-shift detector can be simulated via the fault injection script:
```bash
python ref-python/integrity/fault_injection_benchmark.py --fault mount_slip
```
Observe the covariance matrix reset and rapid re-alignment printed to standard out.
