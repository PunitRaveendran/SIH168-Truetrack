"""
Adapter for genuine real-world Chennai two-wheeler smartphone datasets.
Parses Sensor Logger CSVs (Accelerometer, Gyroscope, Location) into the common TrajectorySession format.
Uses pure NumPy for high robustness and zero external C-extension dependencies.
"""

import os
import numpy as np
import pandas as pd
from adapters.common_schema import TrajectorySession, geodetic_to_enu


def load_chennai_session(folder_path: str, session_id: str = None) -> TrajectorySession:
    """
    Load and synchronize a Sensor Logger dataset folder.
    Args:
        folder_path: Absolute or relative path to folder containing Accelerometer.csv, Gyroscope.csv, Location.csv
        session_id: Optional string identifier. If None, basename of folder is used.
    Returns:
        TrajectorySession object conforming to the common schema.
    """
    if session_id is None:
        session_id = os.path.basename(os.path.normpath(folder_path))

    accel_path = os.path.join(folder_path, "Accelerometer.csv")
    gyro_path = os.path.join(folder_path, "Gyroscope.csv")
    loc_path = os.path.join(folder_path, "Location.csv")

    if not (os.path.exists(accel_path) and os.path.exists(gyro_path) and os.path.exists(loc_path)):
        raise FileNotFoundError(f"Missing required CSV files in {folder_path}")

    # Read raw CSVs
    df_accel = pd.read_csv(accel_path)
    df_gyro = pd.read_csv(gyro_path)
    df_loc = pd.read_csv(loc_path)

    # Sort by time
    df_accel = df_accel.sort_values("seconds_elapsed").reset_index(drop=True)
    df_gyro = df_gyro.sort_values("seconds_elapsed").reset_index(drop=True)
    df_loc = df_loc.sort_values("seconds_elapsed").reset_index(drop=True)

    # Determine overlapping time window
    t_start = max(df_accel["seconds_elapsed"].iloc[0], df_gyro["seconds_elapsed"].iloc[0], df_loc["seconds_elapsed"].iloc[0])
    t_end = min(df_accel["seconds_elapsed"].iloc[-1], df_gyro["seconds_elapsed"].iloc[-1], df_loc["seconds_elapsed"].iloc[-1])

    # Filter to overlapping window
    df_accel = df_accel[(df_accel["seconds_elapsed"] >= t_start) & (df_accel["seconds_elapsed"] <= t_end)].reset_index(drop=True)

    # Target timebase: native accelerometer time grid
    t_grid = df_accel["seconds_elapsed"].values
    t_rel = t_grid - t_start

    # Native sampling rate
    dt_avg = np.median(np.diff(t_grid))
    imu_rate_hz = 1.0 / dt_avg if dt_avg > 0 else 60.0

    # Accelerometer readings (Sensor Logger exports x, y, z in m/s^2)
    ax = df_accel["x"].values
    ay = df_accel["y"].values
    az = df_accel["z"].values

    # Interpolate Gyroscope onto t_grid using pure numpy
    t_gyro = df_gyro["seconds_elapsed"].values
    gx = np.interp(t_grid, t_gyro, df_gyro["x"].values)
    gy = np.interp(t_grid, t_gyro, df_gyro["y"].values)
    gz = np.interp(t_grid, t_gyro, df_gyro["z"].values)

    # Interpolate GPS Ground Truth onto t_grid using pure numpy
    t_loc = df_loc["seconds_elapsed"].values
    lats = np.interp(t_grid, t_loc, df_loc["latitude"].values)
    lons = np.interp(t_grid, t_loc, df_loc["longitude"].values)
    alts = np.interp(t_grid, t_loc, df_loc["altitude"].values)
    speeds = np.maximum(0.0, np.interp(t_grid, t_loc, df_loc["speed"].values))
    bearings_deg = np.interp(t_grid, t_loc, df_loc["bearing"].values)
    headings_rad = np.radians(bearings_deg)

    acc_col = df_loc["horizontalAccuracy"].values if "horizontalAccuracy" in df_loc.columns else np.full(len(df_loc), 5.0)
    accuracies = np.interp(t_grid, t_loc, acc_col)

    # Origin coordinates
    lat0, lon0, alt0 = lats[0], lons[0], alts[0]
    east, north, up = geodetic_to_enu(lats, lons, alts, lat0, lon0, alt0)

    # Construct unified dataframe
    df_sync = pd.DataFrame({
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

    gnss_dt_avg = np.median(np.diff(df_loc["seconds_elapsed"]))
    gnss_rate_hz = 1.0 / gnss_dt_avg if gnss_dt_avg > 0 else 1.0

    return TrajectorySession(
        session_id=session_id,
        dataset_name="Chennai_iQOO_Real",
        vehicle_type="two_wheeler",
        imu_rate_hz=float(imu_rate_hz),
        gnss_rate_hz=float(gnss_rate_hz),
        is_simulated=False,
        origin_lat=float(lat0),
        origin_lon=float(lon0),
        origin_alt=float(alt0),
        df=df_sync
    )
