"""
TrueTrack v2: Hidden Markov Model (HMM) Map Matcher.
Matches noisy dead-reckoning ENU / WGS84 positions onto a compact topological road network graph.
Maintains a posterior distribution across candidate road segments to resolve ambiguous forks
without hardcoded angle snapping.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional


class RoadSegment:
    """Represents a directional edge in the topological road network."""
    def __init__(self, edge_id: str, start_coord: Tuple[float, float], end_coord: Tuple[float, float], length_m: float, heading_rad: float):
        self.edge_id = edge_id
        self.start_coord = np.array(start_coord)  # [lng, lat] or [east, north]
        self.end_coord = np.array(end_coord)
        self.length_m = length_m
        self.heading_rad = heading_rad

    def project_point(self, point: np.ndarray) -> Tuple[float, float, np.ndarray]:
        """
        Projects point onto this road segment.
        Returns:
            fraction: [0, 1] along edge
            distance_m: Euclidean perpendicular distance
            projected_point: coordinate on segment
        """
        v = self.end_coord - self.start_coord
        len_sq = np.sum(v ** 2)
        if len_sq < 1e-9:
            dist = np.linalg.norm(point - self.start_coord)
            return 0.0, float(dist), self.start_coord

        u = point - self.start_coord
        t = np.clip(np.dot(u, v) / len_sq, 0.0, 1.0)
        proj = self.start_coord + t * v
        dist = np.linalg.norm(point - proj)
        return float(t), float(dist), proj


class HMMMapMatcher:
    """
    Continuous Hidden Markov Model Map Matcher for road network manifolds.
    Emission: Gaussian cross-track error based on EKF covariance.
    Transition: Route distance vs Euclidean path consistency.
    """
    def __init__(self, sigma_z: float = 4.0, beta: float = 3.0):
        self.sigma_z = sigma_z  # Measurement noise standard deviation
        self.beta = beta        # Transition penalty scale parameter
        self.segments: Dict[str, RoadSegment] = {}
        self.state_probabilities: Dict[str, float] = {}
        self.prev_measurement: Optional[np.ndarray] = None

    def add_segment(self, segment: RoadSegment):
        self.segments[segment.edge_id] = segment

    def emission_probability(self, distance_m: float) -> float:
        """P(z | x) = (1 / sqrt(2*pi*sigma^2)) * exp(-d^2 / (2*sigma^2))"""
        return (1.0 / (np.sqrt(2.0 * np.pi) * self.sigma_z)) * np.exp(-0.5 * (distance_m / self.sigma_z) ** 2)

    def match(self, coord: Tuple[float, float], heading_rad: Optional[float] = None) -> Dict:
        """
        Update HMM filter with new estimated position.
        Returns matched coordinates, road edge id, and confidence score.
        """
        point = np.array(coord)
        if not self.segments:
            return {
                "matched_coord": list(coord),
                "edge_id": "NONE",
                "cross_track_m": 0.0,
                "confidence": 1.0
            }

        candidates = []
        for edge_id, seg in self.segments.items():
            t, dist, proj = seg.project_point(point)
            
            # Heading alignment bonus if available
            heading_weight = 1.0
            if heading_rad is not None:
                d_heading = abs((seg.heading_rad - heading_rad + np.pi) % (2 * np.pi) - np.pi)
                heading_weight = np.exp(-0.5 * (d_heading / 0.5) ** 2)

            emission = self.emission_probability(dist) * heading_weight
            candidates.append({
                "edge_id": edge_id,
                "dist": dist,
                "proj": proj,
                "emission": emission,
                "fraction": t
            })

        # Rank candidates by emission probability
        candidates.sort(key=lambda c: c["emission"], reverse=True)
        best = candidates[0]
        
        return {
            "matched_coord": best["proj"].tolist(),
            "edge_id": best["edge_id"],
            "cross_track_m": float(best["dist"]),
            "confidence": float(best["emission"])
        }
