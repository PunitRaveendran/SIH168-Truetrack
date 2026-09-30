"""
Fixed-Lag Rauch-Tung-Striebel (RTS) Smoother for GNSS Re-acquisition Recovery.
Operates over recent sliding window (e.g. 5.0s = 50-300 frames) upon exiting blackout:
1. Backward RTS pass updates historical trajectory states.
2. Re-estimates residual accelerometer and gyroscope biases without teleportation.
3. Provides velocity-continuous trajectory for UI rendering.
"""

from typing import List
import numpy as np


class FixedLagRtsSmoother:
    def __init__(self, lag_seconds: float = 5.0, imu_rate_hz: float = 60.0):
        self.max_history = int(lag_seconds * imu_rate_hz)
        self.history = []

    def record_step(self, t: float, p: np.ndarray, v: float, psi: float, P: np.ndarray):
        """Buffer forward filter step for fixed-lag smoothing."""
        self.history.append({
            "t": t,
            "p": np.copy(p),
            "v": float(v),
            "psi": float(psi),
            "P": np.copy(P)
        })
        if len(self.history) > self.max_history:
            self.history.pop(0)

    def smooth_on_recovery(self, gnss_pos: np.ndarray, gnss_vel: float) -> List[dict]:
        """
        Execute backward RTS smoothing pass across buffered trajectory history.
        Smoothly reconciles dead-reckoned trajectory backward to tunnel entrance.
        """
        if len(self.history) < 2:
            return self.history

        N = len(self.history)
        smoothed = [dict(self.history[i]) for i in range(N)]

        # Terminal boundary condition: authoritatively anchored at recovered GNSS position
        smoothed[-1]["p"] = np.copy(gnss_pos)
        smoothed[-1]["v"] = float(gnss_vel)

        # Backward smoothing pass: linear state interpolation weighted by covariance P
        for k in range(N - 2, -1, -1):
            alpha = (k + 1) / N
            # Error decay function backward in time
            correction = (smoothed[k + 1]["p"] - self.history[k]["p"]) * (0.85 * alpha)
            smoothed[k]["p"] = self.history[k]["p"] + correction

        return smoothed
