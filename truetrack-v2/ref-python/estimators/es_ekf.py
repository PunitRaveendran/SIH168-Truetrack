"""
16-State Error-State Extended Kalman Filter (ES-EKF) for Vehicle Dead Reckoning.
Geographic Navigation Frame: Local East-North-Up (ENU) coordinates.
Vehicle Body Frame: X = Forward, Y = Lateral Right, Z = Vertical Down.
Attitude representation: Geographic azimuth psi (rad clockwise from North) and pitch/roll tilts.
Multi-rate event-driven corrections:
- 10 Hz Neural Forward Speed with heteroscedastic predicted variance
- 20-50 Hz Non-Holonomic Constraints (NHC)
- 1 Hz GNSS Position & Velocity updates
- Stationary Zero-Velocity Updates (ZUPT)
"""

import numpy as np


class ErrorStateEKF:
    def __init__(self, init_pos: np.ndarray = None, init_heading_rad: float = 0.0):
        # 1. Nominal States
        self.p = np.zeros(3) if init_pos is None else np.copy(init_pos) # [East, North, Up] in meters
        self.v_fwd = 0.0      # Forward speed in m/s
        self.v_lat = 0.0      # Lateral speed in m/s (constrained by NHC)
        self.psi = init_heading_rad # Geographic heading (rad clockwise from North)
        self.pitch = 0.0      # Pitch angle (rad)
        self.roll = 0.0       # Roll angle (rad)
        
        self.ba_fwd = 0.0     # Forward accelerometer bias
        self.bg_yaw = 0.0     # Yaw gyro bias
        self.scale_v = 1.0    # Neural speed scale factor

        # 2. Covariance Matrix P (7 x 7 essential states for ground vehicle IDR)
        # States: [d_east, d_north, d_vfwd, d_psi, d_bafwd, d_bgyaw, d_scale]
        self.P = np.diag([
            4.0,   # East pos var (2m std)
            4.0,   # North pos var (2m std)
            0.5,   # Forward vel var
            0.02,  # Heading var (~8 deg std)
            0.01,  # Accel bias var
            0.001, # Gyro bias var
            0.01   # Scale var
        ])

        # Base process noise parameters
        self.q_pos = 0.01
        self.q_vel = 0.05
        self.q_psi = 0.0005
        self.q_ba = 1e-5
        self.q_bg = 1e-6
        self.q_scale = 1e-6

    def predict(self, ax_v: float, ay_v: float, az_v: float, gx_v: float, gy_v: float, gz_v: float, dt: float, noise_multiplier: float = 1.0):
        """
        IMU-rate prediction step.
        ax_v: Longitudinal forward acceleration in vehicle frame
        gz_v: Yaw rate in vehicle frame (rotation around vertical down axis)
        """
        if dt <= 0.0 or dt > 0.5:
            return

        # 1. Gyro Yaw Rate Integration
        omega_z = gz_v - self.bg_yaw
        self.psi += omega_z * dt
        # Wrap heading to [-pi, pi]
        self.psi = (self.psi + np.pi) % (2.0 * np.pi) - np.pi

        # 2. Accelerometer Forward Integration with damping
        a_net = ax_v - self.ba_fwd
        # In vehicle motion, v_fwd is driven primarily by neural speed at 10Hz and smoothed by accel
        self.v_fwd = max(0.0, self.v_fwd + 0.1 * a_net * dt)

        # 3. Position Update along geographic heading
        # East = sin(psi), North = cos(psi)
        sin_psi = np.sin(self.psi)
        cos_psi = np.cos(self.psi)

        self.p[0] += self.v_fwd * sin_psi * dt
        self.p[1] += self.v_fwd * cos_psi * dt

        # 4. Error State Transition Matrix F (7 x 7)
        # d_east'  = d_east + dt * (sin_psi * d_vfwd + v_fwd * cos_psi * d_psi)
        # d_north' = d_north + dt * (cos_psi * d_vfwd - v_fwd * sin_psi * d_psi)
        # d_vfwd'  = d_vfwd - dt * d_bafwd
        # d_psi'   = d_psi - dt * d_bgyaw
        F = np.eye(7)
        F[0, 2] = sin_psi * dt
        F[0, 3] = self.v_fwd * cos_psi * dt
        F[1, 2] = cos_psi * dt
        F[1, 3] = -self.v_fwd * sin_psi * dt
        F[2, 4] = -0.1 * dt
        F[3, 5] = -dt

        # 5. Discrete Process Noise
        Q_d = np.diag([
            self.q_pos * dt,
            self.q_pos * dt,
            self.q_vel * dt * noise_multiplier,
            self.q_psi * dt * noise_multiplier,
            self.q_ba * dt,
            self.q_bg * dt,
            self.q_scale * dt
        ])

        self.P = np.dot(np.dot(F, self.P), F.T) + Q_d

    def update_neural_speed(self, speed_mps: float, var_speed: float):
        """
        Measurement Update: Neural forward speed with predicted heteroscedastic variance.
        z = speed_mps
        h(x) = scale_v * v_fwd
        """
        v_model = self.scale_v * self.v_fwd
        y = speed_mps - v_model

        H = np.zeros((1, 7))
        H[0, 2] = self.scale_v # dh / d_vfwd
        H[0, 6] = self.v_fwd   # dh / d_scale

        R = max(1e-3, var_speed)
        self._apply_kalman_update(y, H, np.array([[R]]))

    def update_nhc(self, var_lat: float = 0.05, var_vert: float = 0.2):
        """
        Non-Holonomic Constraints: Lateral velocity is tightly zero in vehicle frame.
        """
        # Constrain lateral velocity residual
        y = -self.v_lat
        H = np.zeros((1, 7))
        H[0, 3] = -self.v_fwd * 0.05 # small heading coupling

        self._apply_kalman_update(y, H, np.array([[var_lat]]))
        self.v_lat = 0.0

    def update_gnss(self, east: float, north: float, v_e: float, v_n: float, pos_var: float = 4.0, vel_var: float = 0.5):
        """
        Measurement Update: Authoritative GNSS position and velocity.
        """
        v_mag = np.sqrt(v_e**2 + v_n**2)
        heading_gnss = np.arctan2(v_e, v_n)

        # Innovation
        y = np.array([
            east - self.p[0],
            north - self.p[1],
            v_mag - self.v_fwd,
            (heading_gnss - self.psi + np.pi) % (2.0 * np.pi) - np.pi
        ])

        H = np.zeros((4, 7))
        H[0, 0] = 1.0 # East pos
        H[1, 1] = 1.0 # North pos
        H[2, 2] = 1.0 # Speed
        H[3, 3] = 1.0 # Heading

        R = np.diag([pos_var, pos_var, vel_var, vel_var * 0.1])
        self._apply_kalman_update(y, H, R)

    def update_zupt(self, vel_var: float = 0.01):
        """Zero-Velocity Update (ZUPT): Constrains speed strictly to 0 when stationary."""
        y = -self.v_fwd
        H = np.zeros((1, 7))
        H[0, 2] = 1.0
        self._apply_kalman_update(y, H, np.array([[vel_var]]))
        self.v_fwd = 0.0

    def _apply_kalman_update(self, y: np.ndarray, H: np.ndarray, R: np.ndarray):
        """Standard Joseph-form Kalman update."""
        y = np.atleast_1d(y)
        S = np.dot(np.dot(H, self.P), H.T) + R
        try:
            K = np.dot(np.dot(self.P, H.T), np.linalg.inv(S))
        except np.linalg.LinAlgError:
            return

        dx = np.dot(K, y).flatten()

        # State updates
        self.p[0] += dx[0]
        self.p[1] += dx[1]
        self.v_fwd = max(0.0, self.v_fwd + dx[2])
        self.psi += dx[3]
        self.ba_fwd += dx[4]
        self.bg_yaw += dx[5]
        self.scale_v = np.clip(self.scale_v + dx[6], 0.7, 1.3)

        # Joseph form covariance update
        I_KH = np.eye(7) - np.dot(K, H)
        self.P = np.dot(np.dot(I_KH, self.P), I_KH.T) + np.dot(np.dot(K, R), K.T)
        self.P = 0.5 * (self.P + self.P.T)
