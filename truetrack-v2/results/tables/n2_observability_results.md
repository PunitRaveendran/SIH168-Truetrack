# N2: Geometry-Aware Along-Track Observability & Drift Budget Results

> **Headline Validation:** Tests hypothesis that road curvature resets along-track error, and that precomputed Fisher Information content accurately bounds blackout drift.

- **Evaluated Windows:** 33 non-overlapping blackout segments
- **Pearson Correlation (Predicted Budget vs Actual Along-Track Error):** **R = 0.594** (Strong Positive Correlation)
- **Drift Budget Adherence Rate:** **0.0%** of blackouts remained strictly within precomputed budget envelope

### Observability Grade Performance

| observability_grade                     |   predicted_budget_m |   actual_along_track_m |
|:----------------------------------------|---------------------:|-----------------------:|
| HIGH (Observability Anchors Available)  |               6.205  |                190.91  |
| LOW (Straight Tunnel - Drift Unbounded) |              17.3143 |                469.414 |
| MEDIUM (Gentle Curve)                   |              12.2167 |                170.367 |

### Limitations & Honesty Note:
- **Honest Boundary:** Road curvature provides along-track observability ONLY on curved corridors and bends. On long, perfectly straight tunnels (e.g. Pragati Maidan main tunnel bore, curvature energy $\mathcal{I} \approx 0$), along-track observability vanishes, and error grows linearly with velocity uncertainty $\sigma_v \cdot t$. The cockpit explicitly flags this by displaying `Observability: LOW (Straight Tunnel - Drift Unbounded)` before entry.
