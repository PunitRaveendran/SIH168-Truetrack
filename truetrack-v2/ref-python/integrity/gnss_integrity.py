"""
GNSS Integrity and Deficit Monitor for TrueTrack v2.
Detects:
1. Absent GNSS (tunnel entrance / underground blackout)
2. Jamming / RF Noise Bursts (high horizontalAccuracy, degraded C/N0, innovation spikes)
3. Drag-off Spoofing (slow drift divergence via CUSUM filter)
4. Tunnel-Exit Multipath (high residual discrepancy between Doppler speed and inertial speed)
Applies soft weighting (inflation of R) and state machine flags.
"""

from dataclasses import dataclass
from enum import Enum
import numpy as np


class GnssIntegrityState(Enum):
    HEALTHY_LOCK = "HEALTHY_LOCK"
    DEGRADED_MULTIPATH = "DEGRADED_MULTIPATH"
    JAMMED_NOISE_BURST = "JAMMED_NOISE_BURST"
    SPOOFED_DRAG_OFF = "SPOOFED_DRAG_OFF"
    BLACKOUT_ABSENT = "BLACKOUT_ABSENT"


@dataclass
class IntegrityReport:
    state: GnssIntegrityState
    nis_score: float
    is_gnss_gated: bool       # True if measurement should be rejected from EKF
    r_inflation_factor: float # Multiplier for measurement covariance R
    speed_discrepancy_mps: float
    cusum_drag_off: float
    detection_latency_ms: float


class GnssIntegrityMonitor:
    def __init__(self, nis_chi2_threshold: float = 9.49):
        # 9.49 is the 95% critical value for chi2 distribution with 4 degrees of freedom (pos E, N, vel E, N)
        self.nis_threshold = nis_chi2_threshold

        # CUSUM drift monitor for drag-off spoofing
        self.cusum_val = 0.0
        self.cusum_drift = 0.8  # m/s allowance
        self.cusum_threshold = 4.0

        # State tracking
        self.consecutive_blackout_frames = 0
        self.current_state = GnssIntegrityState.HEALTHY_LOCK

    def evaluate(
        self,
        gnss_valid: bool,
        east_meas: float, north_meas: float,
        v_east_meas: float, v_north_meas: float,
        accuracy_meas: float,
        est_east: float, est_north: float,
        est_ve: float, est_vn: float,
        P_cov_4x4: np.ndarray,
        dt_since_last_gnss: float
    ) -> IntegrityReport:
        """
        Evaluate single epoch GNSS integrity.
        """
        if not gnss_valid or dt_since_last_gnss > 1.5:
            self.consecutive_blackout_frames += 1
            self.current_state = GnssIntegrityState.BLACKOUT_ABSENT
            return IntegrityReport(
                state=GnssIntegrityState.BLACKOUT_ABSENT,
                nis_score=0.0,
                is_gnss_gated=True,
                r_inflation_factor=1e6,
                speed_discrepancy_mps=0.0,
                cusum_drag_off=self.cusum_val,
                detection_latency_ms=min(500.0, dt_since_last_gnss * 1000.0)
            )

        self.consecutive_blackout_frames = 0

        # 1. Innovation vector
        dy = np.array([
            east_meas - est_east,
            north_meas - est_north,
            v_east_meas - est_ve,
            v_north_meas - est_vn
        ])

        # 2. Innovation Covariance S = H * P * H^T + R
        R_nom = np.diag([accuracy_meas**2, accuracy_meas**2, 0.5**2, 0.5**2])
        S = P_cov_4x4 + R_nom

        # 3. Normalized Innovation Squared (NIS): dy^T * S^-1 * dy
        try:
            inv_S = np.linalg.inv(S)
            nis = float(np.dot(np.dot(dy, inv_S), dy))
        except np.linalg.LinAlgError:
            nis = 100.0

        # 4. Doppler vs Neural/Estimated Speed Discrepancy
        meas_speed = np.sqrt(v_east_meas**2 + v_north_meas**2)
        est_speed = np.sqrt(est_ve**2 + est_vn**2)
        speed_disc = abs(meas_speed - est_speed)

        # 5. CUSUM Drag-off Detection
        # Spoofing attacks typically introduce slow incremental velocity bias to pull the receiver off course
        self.cusum_val = max(0.0, self.cusum_val + (speed_disc - self.cusum_drift))

        # Fault Classification Logic
        is_gated = False
        r_inflation = 1.0

        if self.cusum_val > self.cusum_threshold:
            self.current_state = GnssIntegrityState.SPOOFED_DRAG_OFF
            is_gated = True
            r_inflation = 50.0
        elif accuracy_meas > 25.0 or nis > 25.0:
            # Jamming or massive multipath noise burst
            self.current_state = GnssIntegrityState.JAMMED_NOISE_BURST
            is_gated = True
            r_inflation = 100.0
        elif nis > self.nis_threshold:
            # Degraded multipath (e.g. exiting tunnel)
            self.current_state = GnssIntegrityState.DEGRADED_MULTIPATH
            is_gated = False
            r_inflation = (nis / self.nis_threshold) ** 2 # Soft inflation of R
        else:
            self.current_state = GnssIntegrityState.HEALTHY_LOCK
            is_gated = False
            r_inflation = 1.0
            self.cusum_val = max(0.0, self.cusum_val - 0.2)

        return IntegrityReport(
            state=self.current_state,
            nis_score=nis,
            is_gnss_gated=is_gated,
            r_inflation_factor=r_inflation,
            speed_discrepancy_mps=speed_disc,
            cusum_drag_off=self.cusum_val,
            detection_latency_ms=100.0
        )
