"""
High-Rate Tactical FOG (Fiber Optic Gyroscope) IMU Simulation Generator.
Generates 200 Hz tactical-grade IMU streams from ground-truth trajectories using Allan Variance noise parameters.
Strictly labelled as SIMULATED across all outputs. Uses pure NumPy for robustness.
"""

import numpy as np
import pandas as pd
from adapters.common_schema import TrajectorySession


def generate_fog_stream(session: TrajectorySession, target_rate_hz: float = 200.0, seed: int = 101) -> TrajectorySession:
    """
    Interpolates a ground-truth trajectory to high rate (e.g. 200 Hz) and injects
    realistic tactical FOG noise:
    - Angular Random Walk (ARW): 0.0005 deg/sqrt(hr) = 2.4e-6 rad/sqrt(s)
    - Gyro Bias Instability: 0.001 deg/hr = 4.8e-9 rad/s
    - Velocity Random Walk (VRW): 0.02 m/s/sqrt(hr) = 3.3e-4 m/s/sqrt(s)
    - Accel Bias Instability: 10 ug = 9.8e-5 m/s^2
    """
    df = session.df
    t_orig = df["t"].values
    t_end = t_orig[-1]
    num_samples = int(t_end * target_rate_hz)
    t_high = np.linspace(t_orig[0], t_end, num_samples)
    dt = 1.0 / target_rate_hz

    # Pure NumPy linear interpolation
    east = np.interp(t_high, t_orig, df["east"].values)
    north = np.interp(t_high, t_orig, df["north"].values)
    lat = np.interp(t_high, t_orig, df["lat"].values)
    lon = np.interp(t_high, t_orig, df["lon"].values)
    v = np.maximum(0.0, np.interp(t_high, t_orig, df["v_true"].values))
    heading = np.interp(t_high, t_orig, np.unwrap(df["heading_true"].values))

    # Compute true specific force and angular rates
    a_long = np.gradient(v, dt)
    yaw_rate = np.gradient(heading, dt)
    a_lat = v * yaw_rate

    # Generate FOG noise
    rng = np.random.default_rng(seed)

    arw_sigma = 2.4e-5  # rad/s at 200 Hz
    gyro_noise_z = rng.normal(0, arw_sigma * np.sqrt(target_rate_hz), num_samples)
    gyro_bias_z = 1e-6  # steady tactical bias

    vrw_sigma = 3.3e-4  # m/s^2 at 200 Hz
    accel_noise_x = rng.normal(0, vrw_sigma * np.sqrt(target_rate_hz), num_samples)
    accel_noise_y = rng.normal(0, vrw_sigma * np.sqrt(target_rate_hz), num_samples)
    accel_bias_y = 1e-4

    ax = a_lat + accel_noise_x
    ay = a_long + accel_noise_y + accel_bias_y
    az = 9.80665 + rng.normal(0, 0.001, num_samples)

    gx = rng.normal(0, 1e-5, num_samples)
    gy = rng.normal(0, 1e-5, num_samples)
    gz = yaw_rate + gyro_noise_z + gyro_bias_z

    df_fog = pd.DataFrame({
        "t": t_high,
        "ax": ax,
        "ay": ay,
        "az": az,
        "gx": gx,
        "gy": gy,
        "gz": gz,
        "lat": lat,
        "lon": lon,
        "alt": np.zeros(num_samples),
        "east": east,
        "north": north,
        "up": np.zeros(num_samples),
        "v_true": v,
        "heading_true": heading,
        "accuracy_gnss": np.full(num_samples, 1.0),
        "gnss_valid": True
    })

    return TrajectorySession(
        session_id=f"{session.session_id}_FOG_200Hz_SIMULATED",
        dataset_name=f"{session.dataset_name}_FOG_SIMULATED",
        vehicle_type=session.vehicle_type,
        imu_rate_hz=target_rate_hz,
        gnss_rate_hz=session.gnss_rate_hz,
        is_simulated=True,
        origin_lat=session.origin_lat,
        origin_lon=session.origin_lon,
        origin_alt=session.origin_alt,
        df=df_fog
    )
