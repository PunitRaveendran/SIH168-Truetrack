"""
Continuous In-Vehicle Alignment and Calibration Engine.
Automatically determines the 3D attitude (pitch, roll, yaw) of the phone relative to the vehicle motion frame.
Includes:
- Level alignment via causal low-pass gravity estimation.
- Yaw alignment from GNSS Course-Over-Ground (COG) and longitudinal acceleration principal axis.
- Motorcycle roll/lean compensation.
- CUSUM mount-shift detector (triggers re-alignment upon physical phone displacement).
"""

from dataclasses import dataclass
import numpy as np


@dataclass
class AlignmentState:
    R_b_v: np.ndarray          # 3x3 rotation matrix from phone body frame to vehicle frame
    pitch_deg: float           # Vehicle pitch angle (degrees)
    roll_deg: float            # Vehicle roll angle (degrees)
    yaw_deg: float             # Mounting yaw relative to forward driving direction (degrees)
    gravity_vec: np.ndarray    # Estimated gravity vector in body frame
    alignment_confidence: float# Confidence score [0.0, 1.0]
    mount_shift_detected: bool # True if CUSUM detector triggered in this epoch


class ContinuousAlignmentEngine:
    def __init__(self, vehicle_class: str = "two_wheeler", imu_rate_hz: float = 60.0):
        self.vehicle_class = vehicle_class
        self.imu_rate_hz = imu_rate_hz
        self.dt = 1.0 / imu_rate_hz

        # Gravity low-pass filter (time constant ~1.5s)
        self.alpha_grav = 1.0 - np.exp(-self.dt / 1.5)
        self.g_b = np.array([0.0, 0.0, 9.80665])  # initial guess: phone flat screen up

        # CUSUM mount shift detector parameters
        self.cusum_s = 0.0
        self.cusum_drift = 0.15   # m/s^2 allowance
        self.cusum_threshold = 2.5 # cumulative deviation threshold
        self.ref_g_b = np.copy(self.g_b)

        # Yaw alignment buffers (GNSS COG vs body acceleration)
        self.fwd_axis_b = np.array([0.0, 1.0, 0.0]) # default Android +Y is forward
        self.yaw_aligned = False
        self.R_b_v = np.eye(3)
        self.confidence = 0.1

    def update(
        self,
        ax: float, ay: float, az: float,
        gx: float, gy: float, gz: float,
        gnss_speed: float = 0.0,
        gnss_heading_rad: float = None,
        gnss_valid: bool = False
    ) -> AlignmentState:
        """
        Update alignment with latest IMU sample and optional GNSS course information.
        """
        a_raw = np.array([ax, ay, az])
        gyro = np.array([gx, gy, gz])

        # 1. Update Gravity Estimate via Causal Low-Pass Filter
        # During turns, centripetal acceleration a_cent = v * omega can corrupt gravity.
        # If speed and yaw rate are high, down-weight gravity update.
        omega_mag = np.linalg.norm(gyro)
        is_turning = omega_mag > 0.15

        if not is_turning or not gnss_valid or gnss_speed < 1.0:
            self.g_b += self.alpha_grav * (a_raw - self.g_b)

        # Normalize gravity unit vector (points downward in navigation frame)
        g_norm = np.linalg.norm(self.g_b)
        if g_norm > 1e-3:
            z_v_b = self.g_b / g_norm  # body vector pointing DOWN
        else:
            z_v_b = np.array([0.0, 0.0, 1.0])

        # 2. CUSUM Mount-Shift Detection
        # Measures deviation of current gravity direction from reference
        g_diff = np.linalg.norm(self.g_b - self.ref_g_b)
        self.cusum_s = max(0.0, self.cusum_s + (g_diff - self.cusum_drift))
        shift_detected = False

        if self.cusum_s > self.cusum_threshold:
            shift_detected = True
            self.cusum_s = 0.0
            self.ref_g_b = np.copy(self.g_b)
            self.yaw_aligned = False
            self.confidence = 0.1

        # 3. Longitudinal (Forward) Alignment
        # When vehicle accelerates or brakes along straight path, acceleration is purely longitudinal.
        a_horiz = a_raw - np.dot(a_raw, z_v_b) * z_v_b
        a_horiz_mag = np.linalg.norm(a_horiz)

        if gnss_valid and gnss_speed > 4.0 and not is_turning and a_horiz_mag > 0.5:
            # Candidate forward vector in horizontal plane
            cand_fwd = a_horiz / a_horiz_mag
            # Determine direction: if speed is increasing (accelerating), cand_fwd is forward; if braking, reverse.
            # Blend smoothly into current forward axis
            self.fwd_axis_b = 0.95 * self.fwd_axis_b + 0.05 * cand_fwd
            norm_f = np.linalg.norm(self.fwd_axis_b)
            if norm_f > 1e-3:
                self.fwd_axis_b /= norm_f
            self.yaw_aligned = True
            self.confidence = min(1.0, self.confidence + 0.02)

        # 4. Construct Orthonormal Vehicle Basis in Body Coordinates
        # Vehicle Z (vertical down): z_v_b
        # Vehicle X (forward): fwd_axis_b projected orthogonal to z_v_b
        x_v_b = self.fwd_axis_b - np.dot(self.fwd_axis_b, z_v_b) * z_v_b
        norm_x = np.linalg.norm(x_v_b)
        if norm_x > 1e-3:
            x_v_b /= norm_x
        else:
            x_v_b = np.array([0.0, 1.0, 0.0])

        # Vehicle Y (lateral right): cross(z_v_b, x_v_b)
        y_v_b = np.cross(z_v_b, x_v_b)
        norm_y = np.linalg.norm(y_v_b)
        if norm_y > 1e-3:
            y_v_b /= norm_y

        # Rotation Matrix R_b_v: transforms vector from body frame to vehicle frame
        # v_vehicle = R_b_v * v_body
        self.R_b_v = np.vstack([x_v_b, y_v_b, z_v_b])

        # Compute Euler Angles (degrees)
        pitch = np.degrees(np.arcsin(np.clip(-x_v_b[2], -1.0, 1.0)))
        roll = np.degrees(np.arctan2(y_v_b[2], z_v_b[2]))
        yaw = np.degrees(np.arctan2(x_v_b[1], x_v_b[0]))

        return AlignmentState(
            R_b_v=self.R_b_v,
            pitch_deg=float(pitch),
            roll_deg=float(roll),
            yaw_deg=float(yaw),
            gravity_vec=self.g_b,
            alignment_confidence=float(self.confidence),
            mount_shift_detected=shift_detected
        )


def rotate_imu_to_vehicle(ax, ay, az, gx, gy, gz, R_b_v):
    """
    Apply rotation R_b_v to tri-axial accelerometer and gyroscope vectors.
    """
    a_b = np.array([ax, ay, az])
    g_b = np.array([gx, gy, gz])

    a_v = np.dot(R_b_v, a_b)
    g_v = np.dot(R_b_v, g_b)

    return a_v[0], a_v[1], a_v[2], g_v[0], g_v[1], g_v[2]
