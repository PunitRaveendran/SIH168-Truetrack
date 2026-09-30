"""
Geometry-Aware Along-Track Observability & Pre-Tunnel Drift Budget Engine (N2).
Calculates Fisher Information Content I(e) from road curvature:
  I(e) = integral_0^L (d_psi / ds)^2 ds
Predicts along-track drift budget before tunnel entry:
  E_budget = (sigma_v * t_blackout) / (1 + beta * sqrt(I(e)))
Enables pre-tunnel cockpit warning and observability grading.
"""

from dataclasses import dataclass
from typing import List, Tuple
import numpy as np


@dataclass
class RoadEdgeGeometry:
    edge_id: str
    name: str
    length_m: float
    information_content: float  # Integrated curvature energy (rad^2 / m)
    observability_grade: str    # 'HIGH' (bends), 'MEDIUM' (gentle curve), 'LOW' (straight)
    arc_lengths: np.ndarray     # [m] sampled along road
    headings_rad: np.ndarray    # [rad] tangent heading profile


def compute_edge_observability(edge_id: str, name: str, polyline_enu: np.ndarray) -> RoadEdgeGeometry:
    """
    Given a polyline array [[e0, n0], [e1, n1], ...], compute arc-length curvature energy.
    """
    diffs = np.diff(polyline_enu, axis=0)
    seg_lens = np.sqrt(diffs[:, 0]**2 + diffs[:, 1]**2)
    cum_lens = np.insert(np.cumsum(seg_lens), 0, 0.0)
    total_len = cum_lens[-1]

    # Sample uniformly at 1.0m intervals
    num_pts = max(3, int(total_len))
    s_grid = np.linspace(0, total_len, num_pts)

    e_interp = np.interp(s_grid, cum_lens, polyline_enu[:, 0])
    n_interp = np.interp(s_grid, cum_lens, polyline_enu[:, 1])

    de = np.gradient(e_interp, s_grid[1] - s_grid[0])
    dn = np.gradient(n_interp, s_grid[1] - s_grid[0])
    headings = np.arctan2(de, dn)

    # Curvature: d_psi / ds (rad / m)
    d_psi = np.gradient(np.unwrap(headings), s_grid[1] - s_grid[0])

    # Information Content: integral (d_psi/ds)^2 ds
    info_content = float(np.sum(d_psi**2 * (s_grid[1] - s_grid[0])))

    # Observability grade
    if info_content > 0.05:
        grade = "HIGH (Observability Anchors Available)"
    elif info_content > 0.01:
        grade = "MEDIUM (Gentle Curve)"
    else:
        grade = "LOW (Straight Tunnel - Drift Unbounded)"

    return RoadEdgeGeometry(
        edge_id=edge_id,
        name=name,
        length_m=float(total_len),
        information_content=info_content,
        observability_grade=grade,
        arc_lengths=s_grid,
        headings_rad=headings
    )


def predict_drift_budget(edge: RoadEdgeGeometry, blackout_duration_s: float, nominal_speed_mps: float, sigma_v: float = 0.5) -> float:
    """
    Predict along-track drift budget before tunnel entry:
    On straightaways (info_content ~ 0), error grows linearly with time: sigma_v * t.
    On curves, each bend matches yaw rate to heading profile, damping along-track runaway.
    """
    dist_traveled = nominal_speed_mps * blackout_duration_s
    unbounded_err = sigma_v * blackout_duration_s

    # Beta damping coefficient calibrated empirically
    beta = 4.2
    damped_err = unbounded_err / (1.0 + beta * np.sqrt(edge.information_content))

    return float(max(2.0, damped_err))
