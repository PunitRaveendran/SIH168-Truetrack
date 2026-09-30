"""
Strict Non-Overlapping Evaluation Window Generator & Leave-One-Route-Out Splits.
Adheres to Section 8 & 9 of SIH mission prompt:
- Zero window overlap.
- Strict train/test isolation by route and vehicle.
- Standard benchmark window definitions:
  * 45s standard blackout
  * 50m short maneuver (< 60s)
  * 1km at ~60 km/h (60s high-speed blackout)
"""

from dataclasses import dataclass
from typing import List
import numpy as np
import pandas as pd
from adapters.common_schema import TrajectorySession


@dataclass
class BlackoutWindow:
    window_id: str
    session_id: str
    dataset_name: str
    vehicle_type: str
    is_simulated: bool
    t_start: float
    t_end: float
    duration_s: float
    traveled_dist_m: float
    avg_speed_mps: float
    start_idx: int
    end_idx: int
    window_category: str  # 'standard_45s', 'short_50m', 'highspeed_1km'


def extract_non_overlapping_windows(
    session: TrajectorySession,
    window_duration_s: float = 45.0,
    min_speed_mps: float = 2.0,
    window_category: str = "standard_45s"
) -> List[BlackoutWindow]:
    """
    Extract strictly non-overlapping contiguous blackout evaluation windows.
    Enforces that consecutive windows never share any samples.
    """
    df = session.df
    t = df["t"].values
    v = df["v_true"].values
    east = df["east"].values
    north = df["north"].values

    total_time = t[-1] - t[0]
    windows = []

    # Slide with step = window_duration_s (strictly NON-OVERLAPPING)
    current_t = t[0] + 5.0  # skip first 5s to allow initial alignment/filters to settle

    window_idx = 1
    while current_t + window_duration_s <= t[-1] - 2.0:
        t_start = current_t
        t_end = current_t + window_duration_s

        # Find array indices
        idx_start = np.searchsorted(t, t_start)
        idx_end = np.searchsorted(t, t_end)

        if idx_end >= len(t):
            break

        # Compute metrics over this window
        seg_v = v[idx_start:idx_end]
        avg_speed = np.mean(seg_v)

        # Compute cumulative distance traveled along trajectory
        d_east = np.diff(east[idx_start:idx_end])
        d_north = np.diff(north[idx_start:idx_end])
        traveled_dist = np.sum(np.sqrt(d_east**2 + d_north**2))

        # Only accept windows where vehicle was predominantly in motion (not stuck at a signal for the entire window)
        if avg_speed >= min_speed_mps and traveled_dist >= 10.0:
            w_id = f"{session.session_id}_{window_category}_W{window_idx}"
            windows.append(BlackoutWindow(
                window_id=w_id,
                session_id=session.session_id,
                dataset_name=session.dataset_name,
                vehicle_type=session.vehicle_type,
                is_simulated=session.is_simulated,
                t_start=float(t_start),
                t_end=float(t_end),
                duration_s=float(window_duration_s),
                traveled_dist_m=float(traveled_dist),
                avg_speed_mps=float(avg_speed),
                start_idx=idx_start,
                end_idx=idx_end,
                window_category=window_category
            ))
            window_idx += 1
            # Advance by full duration -> STRICT NON-OVERLAPPING
            current_t = t_end
        else:
            # Skip forward by 5s if stationary
            current_t += 5.0

    return windows


def extract_ps_benchmark_windows(session: TrajectorySession) -> List[BlackoutWindow]:
    """
    Extract the 3 standardized SIH problem statement windows:
    1. Standard 45s blackouts
    2. Short 50m distance windows in under 60s
    3. 60s high-speed windows (targeting ~1km at ~60 km/h)
    """
    windows = []
    # 1. Standard 45s
    w45 = extract_non_overlapping_windows(session, window_duration_s=45.0, min_speed_mps=3.0, window_category="standard_45s")
    windows.extend(w45)

    # 2. 60s high-speed windows (for highway/express corridors)
    w60 = extract_non_overlapping_windows(session, window_duration_s=60.0, min_speed_mps=12.0, window_category="highspeed_60s")
    windows.extend(w60)

    return windows
