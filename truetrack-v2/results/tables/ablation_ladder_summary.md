# TrueTrack v2: Core Engine Ablation Ladder

> **Phase 2 Gate Evidence:** Evaluated on strictly identical, non-overlapping windows across all datasets.

| Ablation Tier                      | Median Drift (%)   | Mean Drift (%)   | P90 Drift (%)   | Mean Along-Track (m)   | Mean Cross-Track (m)   | <10% Drift Pass Rate   |
|:-----------------------------------|:-------------------|:-----------------|:----------------|:-----------------------|:-----------------------|:-----------------------|
| 1. B1 Classical INS + NHC          | 62.8%              | 75.1%            | 168.6%          | 195.4 m                | 115.3 m                | 12.1%                  |
| 2. B2 v1 Point CNN                 | 49.4%              | 65.6%            | 122.2%          | 190.4 m                | 105.2 m                | 3.0%                   |
| 3. +Calibrated Uncertainty         | 78.6%              | 72.2%            | 97.5%           | 270.9 m                | 61.4 m                 | 3.0%                   |
| 4. +Continuous Alignment           | 70.8%              | 68.3%            | 96.4%           | 245.9 m                | 63.0 m                 | 0.0%                   |
| 5. +Unified ES-EKF & NHC (v2 Core) | 70.8%              | 68.4%            | 96.4%           | 246.2 m                | 63.2 m                 | 0.0%                   |
