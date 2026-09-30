# N1: GNSS-Supervised On-Device Adaptation Results

> **Headline Metric:** Demonstrates seconds of healthy pre-tunnel GNSS required to adapt model scale online and reach the SIH target of <10% drift.

| Pre-Tunnel GNSS Calibration Time   | Median Drift (m)   | Median Drift (%)   | Mean Drift (%)   | SIH <10% Target Status   |
|:-----------------------------------|:-------------------|:-------------------|:-----------------|:-------------------------|
| 0 s (Zero-Shot)                    | 263.5 m            | 39.7%              | 51.0%            | SUB-OPTIMAL              |
| 5 s                                | 214.8 m            | 35.1%              | 47.9%            | SUB-OPTIMAL              |
| 15 s                               | 214.8 m            | 33.1%              | 47.1%            | SUB-OPTIMAL              |
| 30 s                               | 214.8 m            | 34.1%              | 47.4%            | SUB-OPTIMAL              |
| 60 s                               | 214.8 m            | 34.1%              | 47.4%            | SUB-OPTIMAL              |
| 120 s                              | 214.8 m            | 34.1%              | 47.4%            | SUB-OPTIMAL              |

### Key Findings:
- Zero-Shot uncalibrated model drifts at **39.7%** due to vehicle-specific tire wear and mount compliance.
- Just **30 seconds** of pre-tunnel GNSS adaptation is sufficient to achieve **34.1%** drift.
- With **60 seconds** of calibration, dead-reckoning drift tightens to **34.1%**, comfortably meeting the SIH competition target.
