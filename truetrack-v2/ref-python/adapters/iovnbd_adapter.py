"""
Adapter for IO-VNBD (Inertial and Odometry Benchmark Dataset for Ground Vehicle Positioning).
Supports both Smartphone (S-Dataset) and Vehicle CAN/VBOX (V-Dataset) conforming to Table 3 & 4 of Onyekpe et al. (2021).
"""

import os
import numpy as np
import pandas as pd
from adapters.common_schema import TrajectorySession, geodetic_to_enu


def load_iovnbd_smartphone_csv(s_csv_path: str, session_id: str = None) -> TrajectorySession:
    """
    Parse an authentic IO-VNBD S-Dataset CSV (Smartphone 10 Hz).
    Columns per Table 4:
    [GPS Latitude, GPS Longitude, GPS Altitude, GPS Speed, GPS Accuracy, GPS Orientation,
     GPS Satellites In Range, Time Since Start, Date,
     Accelerometer X, Accelerometer Y, Accelerometer Z,
     Gravity X, Gravity Y, Gravity Z,
     Gyroscope (Yaw), Gyroscope (Pitch), Gyroscope (Roll),
     Magnetic Field X, Magnetic Field Y, Magnetic Field Z,
     Orientation (Yaw), Orientation (Roll), Orientation (Pitch)]
    """
    if session_id is None:
        session_id = os.path.splitext(os.path.basename(s_csv_path))[0]

    # Check if file is a Git LFS pointer
    with open(s_csv_path, "r", encoding="utf-8", errors="ignore") as f:
        head = f.read(200)
        if "git-lfs" in head:
            raise ValueError(f"File {s_csv_path} is a Git LFS pointer, not a raw CSV. Raw file required.")

    df = pd.read_csv(s_csv_path)

    # Time in seconds from ms
    t = df["Time Since Start"].values / 1000.0
    t_rel = t - t[0]

    # Rates
    dt_avg = np.median(np.diff(t_rel))
    imu_rate_hz = 1.0 / dt_avg if dt_avg > 0 else 10.0

    # Accelerations (m/s^2)
    ax = df["Accelerometer X"].values
    ay = df["Accelerometer Y"].values
    az = df["Accelerometer Z"].values

    # Gyroscope (rad/s)
    # In smartphone frames: Roll is around X, Pitch around Y, Yaw around Z
    gx = df["Gyroscope (Roll)"].values
    gy = df["Gyroscope (Pitch)"].values
    gz = df["Gyroscope (Yaw)"].values

    # GPS
    lats = df["GPS Latitude"].values
    lons = df["GPS Longitude"].values
    alts = df["GPS Altitude"].values
    speeds = df["GPS Speed"].values / 3.6  # km/h to m/s
    headings_rad = np.radians(df["GPS Orientation"].values)
    accuracies = df["GPS Accuracy"].values

    lat0, lon0, alt0 = lats[0], lons[0], alts[0]
    east, north, up = geodetic_to_enu(lats, lons, alts, lat0, lon0, alt0)

    df_clean = pd.DataFrame({
        "t": t_rel,
        "ax": ax,
        "ay": ay,
        "az": az,
        "gx": gx,
        "gy": gy,
        "gz": gz,
        "lat": lats,
        "lon": lons,
        "alt": alts,
        "east": east,
        "north": north,
        "up": up,
        "v_true": speeds,
        "heading_true": headings_rad,
        "accuracy_gnss": accuracies,
        "gnss_valid": True
    })

    return TrajectorySession(
        session_id=session_id,
        dataset_name="IO-VNBD_Real_Smartphone",
        vehicle_type="passenger_car",
        imu_rate_hz=float(imu_rate_hz),
        gnss_rate_hz=float(imu_rate_hz),
        is_simulated=False,
        origin_lat=float(lat0),
        origin_lon=float(lon0),
        origin_alt=float(alt0),
        df=df_clean
    )


def generate_mock_iovnbd_session(session_id: str = "IO-VNBD_Sample_S1_SIMULATED", duration_s: float = 300.0) -> TrajectorySession:
    """
    Generate a benchmark-compliant synthetic IO-VNBD session matching Table 3 & 4 of Onyekpe et al.
    Strictly labelled as SIMULATED for initial pipeline validation until raw CSVs are mounted.
    Simulates a passenger car driving an urban route in Coventry, UK (52.4068° N, 1.5197° W) at 10 Hz.
    """
    dt = 0.1  # 10 Hz
    num_steps = int(duration_s / dt)
    t = np.linspace(0, duration_s, num_steps)

    # Waypoints / kinematic profile (accelerate, cruise at 50 km/h, turn, round-about, brake)
    # Forward velocity profile
    v = np.zeros(num_steps)
    # Accelerate 0-10s
    v[0:100] = np.linspace(0, 13.88, 100)  # 50 km/h
    # Cruise
    v[100:600] = 13.88
    # Slow down for roundabout
    v[600:750] = np.linspace(13.88, 5.55, 150)  # 20 km/h
    # Roundabout negotiation
    v[750:1100] = 5.55 + 0.5 * np.sin(np.linspace(0, 4*np.pi, 350))
    # Accelerate out
    v[1100:1300] = np.linspace(5.55, 16.66, 200)  # 60 km/h
    # Cruise on bypass
    v[1300:2200] = 16.66
    # Stop at signal
    v[2200:2400] = np.linspace(16.66, 0.0, 200)
    # Stationary
    v[2400:2700] = 0.0
    # Restart
    v[2700:] = np.linspace(0.0, 11.11, num_steps - 2700)

    # Heading profile (radians)
    heading = np.zeros(num_steps)
    # Straight
    heading[0:750] = 0.0
    # Roundabout turn: 270 degree turn
    heading[750:1100] = np.linspace(0, 1.5 * np.pi, 350)
    # Straight exit
    heading[1100:1500] = 1.5 * np.pi
    # Curve
    heading[1500:1800] = np.linspace(1.5 * np.pi, np.pi, 300)
    # Final straight
    heading[1800:] = np.pi

    # Compute trajectory in ENU
    east = np.zeros(num_steps)
    north = np.zeros(num_steps)
    for i in range(1, num_steps):
        east[i] = east[i-1] + v[i] * np.sin(heading[i]) * dt
        north[i] = north[i-1] + v[i] * np.cos(heading[i]) * dt

    # Origin: Coventry University (IO-VNBD origin)
    lat0, lon0, alt0 = 52.4068, -1.5065, 85.0
    meters_per_deg_lat = 111132.95
    meters_per_deg_lon = 111132.95 * np.cos(np.radians(lat0))

    lats = lat0 + north / meters_per_deg_lat
    lons = lon0 + east / meters_per_deg_lon
    alts = alt0 + 2.0 * np.sin(t / 20.0)

    # Kinematics to IMU (phone mounted firmly on car dash)
    # a_long = dv/dt
    a_long = np.gradient(v, dt)
    # yaw rate
    yaw_rate = np.gradient(heading, dt)
    # centripetal acceleration = v * yaw_rate
    a_lat = v * yaw_rate

    # Add realistic car noise (engine vibrations + sensor white noise)
    rng = np.random.default_rng(42)
    ax_noise = rng.normal(0, 0.04, num_steps)
    ay_noise = rng.normal(0, 0.04, num_steps)
    az_noise = rng.normal(0, 0.06, num_steps)
    gyro_noise = rng.normal(0, 0.003, num_steps)

    ax = a_lat + ax_noise
    ay = a_long + ay_noise
    az = 9.80665 + az_noise
    gx = rng.normal(0, 0.002, num_steps)
    gy = rng.normal(0, 0.002, num_steps)
    gz = yaw_rate + gyro_noise

    df_mock = pd.DataFrame({
        "t": t,
        "ax": ax,
        "ay": ay,
        "az": az,
        "gx": gx,
        "gy": gy,
        "gz": gz,
        "lat": lats,
        "lon": lons,
        "alt": alts,
        "east": east,
        "north": north,
        "up": np.zeros(num_steps),
        "v_true": v,
        "heading_true": heading,
        "accuracy_gnss": np.full(num_steps, 2.5),
        "gnss_valid": True
    })

    return TrajectorySession(
        session_id=session_id,
        dataset_name="IO-VNBD_SIMULATED_Coventry",
        vehicle_type="passenger_car",
        imu_rate_hz=10.0,
        gnss_rate_hz=10.0,
        is_simulated=True,
        origin_lat=float(lat0),
        origin_lon=float(lon0),
        origin_alt=float(alt0),
        df=df_mock
    )
