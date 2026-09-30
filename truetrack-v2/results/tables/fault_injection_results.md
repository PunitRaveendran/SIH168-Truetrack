# GNSS Fault Injection & Integrity Mitigation Benchmark

> **Phase 3 Gate Evidence:** Injects 4 realistic attack/anomaly vectors: Jamming, CUSUM Drag-Off Spoofing, Tunnel-Exit Multipath, and Sudden Blackout. Measures detection latency and trajectory continuity.

| Attack / Anomaly Vector               | Fault Duration   | Detection Latency   | Fault Mitigation Rate   | False Alarm Rate   | Max Trajectory Step Jump   | Estimator Continuity      |
|:--------------------------------------|:-----------------|:--------------------|:------------------------|:-------------------|:---------------------------|:--------------------------|
| 1. Abrupt Blackout (Tunnel Entrance)  | 20.0 s           | 2477 ms             | 100.0%                  | 100.0%             | 0.01 m                     | C1 Smooth (Zero Teleport) |
| 2. Jamming RF Noise Burst             | 10.0 s           | 2477 ms             | 100.0%                  | 87.8%              | 1.75 m                     | C1 Smooth (Zero Teleport) |
| 3. Drag-Off Spoofing (0.4 m/s^2 Pull) | 15.0 s           | 5488 ms             | 76.9%                   | 100.0%             | 2.03 m                     | Discontinuous             |
| 4. Tunnel-Exit Multipath Glitch       | 3.0 s            | 9999 ms             | 0.0%                    | 43.8%              | 2.99 m                     | Discontinuous             |
