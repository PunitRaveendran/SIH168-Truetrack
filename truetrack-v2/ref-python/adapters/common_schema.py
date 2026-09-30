"""
TrueTrack v2 Common Telemetry Schema and Coordinate Utilities.
All adapters emit standardized numpy arrays and pandas DataFrames conforming to this contract.
"""

from dataclasses import dataclass
import numpy as np
import pandas as pd


@dataclass
class TrajectorySession:
    session_id: str
    dataset_name: str
    vehicle_type: str
    imu_rate_hz: float
    gnss_rate_hz: float
    is_simulated: bool
    origin_lat: float
    origin_lon: float
    origin_alt: float
    # Synchronous or interpolated telemetry dataframe
    # Columns: [t, ax, ay, az, gx, gy, gz, lat, lon, alt, east, north, v_true, heading_true, gnss_valid]
    df: pd.DataFrame


def geodetic_to_enu(lat, lon, alt, lat0, lon0, alt0):
    """
    Convert WGS84 Geodetic coordinates (lat, lon in degrees, alt in meters)
    to local East-North-Up (ENU) Cartesian coordinates in meters.
    """
    # WGS-84 ellipsoid constants
    a = 6378137.0
    f = 1.0 / 298.257223563
    e2 = f * (2.0 - f)

    phi = np.radians(lat)
    lam = np.radians(lon)
    phi0 = np.radians(lat0)
    lam0 = np.radians(lon0)

    # Radii of curvature
    sin_phi0 = np.sin(phi0)
    cos_phi0 = np.cos(phi0)
    N0 = a / np.sqrt(1.0 - e2 * sin_phi0**2)

    # Convert origin to ECEF
    x0 = (N0 + alt0) * cos_phi0 * np.cos(lam0)
    y0 = (N0 + alt0) * cos_phi0 * np.sin(lam0)
    z0 = (N0 * (1.0 - e2) + alt0) * sin_phi0

    # Convert points to ECEF
    sin_phi = np.sin(phi)
    cos_phi = np.cos(phi)
    N = a / np.sqrt(1.0 - e2 * sin_phi**2)
    x = (N + alt) * cos_phi * np.cos(lam)
    y = (N + alt) * cos_phi * np.sin(lam)
    z = (N * (1.0 - e2) + alt) * sin_phi

    dx = x - x0
    dy = y - y0
    dz = z - z0

    # Rotate ECEF to local ENU
    sin_lam0 = np.sin(lam0)
    cos_lam0 = np.cos(lam0)

    east = -sin_lam0 * dx + cos_lam0 * dy
    north = -sin_phi0 * cos_lam0 * dx - sin_phi0 * sin_lam0 * dy + cos_phi0 * dz
    up = cos_phi0 * cos_lam0 * dx + cos_phi0 * sin_lam0 * dy + sin_phi0 * dz

    return east, north, up


def enu_to_geodetic(east, north, up, lat0, lon0, alt0):
    """
    Convert local ENU coordinates in meters to WGS84 Geodetic (lat, lon in degrees, alt in meters).
    """
    phi0 = np.radians(lat0)
    lam0 = np.radians(lon0)

    sin_phi0 = np.sin(phi0)
    cos_phi0 = np.cos(phi0)
    sin_lam0 = np.sin(lam0)
    cos_lam0 = np.cos(lam0)

    # Inverse rotation from ENU to ECEF delta
    dx = -sin_lam0 * east - sin_phi0 * cos_lam0 * north + cos_phi0 * cos_lam0 * up
    dy = cos_lam0 * east - sin_phi0 * sin_lam0 * north + cos_phi0 * sin_lam0 * up
    dz = cos_phi0 * north + sin_phi0 * up

    # ECEF of origin
    a = 6378137.0
    f = 1.0 / 298.257223563
    e2 = f * (2.0 - f)
    N0 = a / np.sqrt(1.0 - e2 * sin_phi0**2)

    x0 = (N0 + alt0) * cos_phi0 * cos_lam0
    y0 = (N0 + alt0) * cos_phi0 * sin_lam0
    z0 = (N0 * (1.0 - e2) + alt0) * sin_phi0

    x = x0 + dx
    y = y0 + dy
    z = z0 + dz

    # ECEF to Geodetic (Bowring's method)
    p = np.sqrt(x**2 + y**2)
    b = a * (1.0 - f)
    e_prime2 = (a**2 - b**2) / (b**2)
    theta = np.arctan2(z * a, p * b)

    lat = np.arctan2(z + e_prime2 * b * (np.sin(theta)**3), p - e2 * a * (np.cos(theta)**3))
    lon = np.arctan2(y, x)
    N = a / np.sqrt(1.0 - e2 * (np.sin(lat)**2))
    alt = p / np.cos(lat) - N

    return np.degrees(lat), np.degrees(lon), alt

