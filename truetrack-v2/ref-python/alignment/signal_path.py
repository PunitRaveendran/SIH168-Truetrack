"""
Causal Signal Path and Pothole/Bump Anomaly Detector.
Strictly causal: does not use any future samples (no filtfilt or look-ahead).
Includes:
- Path 1 (Motion Dynamics): 2nd-order causal IIR low-pass filter.
- Pothole / Road Shock Detector: detects severe vertical impacts and flags noise inflation.
- Path 2 (Spectral): high-rate rolling buffer for vibration analysis (N3).
"""

from dataclasses import dataclass
import numpy as np


@dataclass
class FilteredSignalSample:
    ax_filt: float
    ay_filt: float
    az_filt: float
    gx_filt: float
    gy_filt: float
    gz_filt: float
    is_pothole: bool
    noise_scale: float  # Multiplier for EKF process noise covariance Q


class CausalSignalProcessor:
    def __init__(self, sample_rate_hz: float = 60.0, cutoff_hz: float = 12.0):
        self.sample_rate_hz = sample_rate_hz
        self.cutoff_hz = cutoff_hz

        # Design 2nd-order Butterworth lowpass filter coefficients analytically
        # using bilinear transform:
        omega_c = 2.0 * np.pi * cutoff_hz
        T = 1.0 / sample_rate_hz
        omega_warp = (2.0 / T) * np.tan(omega_c * T / 2.0)

        c = omega_warp * T / 2.0
        c2 = c * c
        sqrt2_c = np.sqrt(2.0) * c
        d = 1.0 + sqrt2_c + c2

        self.b0 = c2 / d
        self.b1 = 2.0 * c2 / d
        self.b2 = c2 / d
        self.a1 = (2.0 * c2 - 2.0) / d
        self.a2 = (1.0 - sqrt2_c + c2) / d

        # Filter state registers: x[n-1], x[n-2], y[n-1], y[n-2] for 6 channels
        self.x_hist = np.zeros((6, 2))
        self.y_hist = np.zeros((6, 2))

        # Pothole detection
        self.pothole_cooldown = 0
        self.pothole_threshold_mps2 = 8.5  # Vertical shock threshold

    def _filter_channel(self, channel_idx: int, x_val: float) -> float:
        """Causal difference equation: y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]"""
        x1, x2 = self.x_hist[channel_idx, 0], self.x_hist[channel_idx, 1]
        y1, y2 = self.y_hist[channel_idx, 0], self.y_hist[channel_idx, 1]

        y_val = self.b0 * x_val + self.b1 * x1 + self.b2 * x2 - self.a1 * y1 - self.a2 * y2

        # Update delay registers
        self.x_hist[channel_idx, 1] = x1
        self.x_hist[channel_idx, 0] = x_val
        self.y_hist[channel_idx, 1] = y1
        self.y_hist[channel_idx, 0] = y_val

        return y_val

    def process(self, ax: float, ay: float, az: float, gx: float, gy: float, gz: float) -> FilteredSignalSample:
        """
        Process single incoming IMU frame causally.
        """
        raw_vals = [ax, ay, az, gx, gy, gz]
        filt_vals = [self._filter_channel(i, raw_vals[i]) for i in range(6)]

        # High-frequency vertical shock (pothole/bump)
        # Difference between raw and filtered vertical acceleration indicates instantaneous shock
        vert_shock = abs(az - filt_vals[2])
        is_pothole = False
        noise_scale = 1.0

        if vert_shock > self.pothole_threshold_mps2:
            is_pothole = True
            self.pothole_cooldown = int(0.3 * self.sample_rate_hz)  # 300ms cooldown window
            noise_scale = 8.0  # Inflate EKF process noise 8x during severe surface anomaly
        elif self.pothole_cooldown > 0:
            is_pothole = True
            self.pothole_cooldown -= 1
            noise_scale = 3.0

        return FilteredSignalSample(
            ax_filt=filt_vals[0],
            ay_filt=filt_vals[1],
            az_filt=filt_vals[2],
            gx_filt=filt_vals[3],
            gy_filt=filt_vals[4],
            gz_filt=filt_vals[5],
            is_pothole=is_pothole,
            noise_scale=noise_scale
        )
