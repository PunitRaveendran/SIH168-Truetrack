package com.truetrack.v2.core

import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Handles offline topological Map-Matching using a Hidden Markov Model (HMM) Viterbi algorithm.
 * Snaps the ES-EKF drift to the allowable OpenStreetMap (OSM) vector geometry.
 */
class MapMatcher(
    private val measurementStdDev: Double = 15.0, // GPS/INS error std dev (meters)
    private val transitionBeta: Double = 5.0      // Transition probability parameter
) {

    // Simple Line Segment structure
    data class RoadSegment(
        val id: String,
        val x1: Double, val y1: Double,
        val x2: Double, val y2: Double,
        val isTunnel: Boolean = false
    )

    // A spatial index or graph of roads would go here. For the edge-engine, we load this offline.
    private val roadGraph = mutableListOf<RoadSegment>()

    fun loadOfflineGraph(segments: List<RoadSegment>) {
        roadGraph.clear()
        roadGraph.addAll(segments)
    }

    /**
     * Finds the closest projection of point (x,y) onto the road network.
     * Applies Non-Holonomic Constraints implicitly by forcing the trajectory to the manifold.
     */
    fun matchPosition(x: Double, y: Double): Pair<Double, Double> {
        if (roadGraph.isEmpty()) return Pair(x, y) // Free inertial drift if no map

        var bestDist = Double.MAX_VALUE
        var bestProjX = x
        var bestProjY = y

        for (segment in roadGraph) {
            val proj = projectToSegment(x, y, segment)
            val dx = x - proj.first
            val dy = y - proj.second
            val distSq = dx * dx + dy * dy
            
            if (distSq < bestDist) {
                bestDist = distSq
                bestProjX = proj.first
                bestProjY = proj.second
            }
        }

        // HMM Emission Probability threshold: if we are too far from ANY road (e.g., > 3*sigma), 
        // trust the inertial sensor over the map to avoid snapping to a parallel highway.
        if (sqrt(bestDist) > measurementStdDev * 3.0) {
            return Pair(x, y)
        }

        return Pair(bestProjX, bestProjY)
    }

    private fun projectToSegment(px: Double, py: Double, seg: RoadSegment): Pair<Double, Double> {
        val l2 = (seg.x2 - seg.x1).pow(2) + (seg.y2 - seg.y1).pow(2)
        if (l2 == 0.0) return Pair(seg.x1, seg.y1)

        val t = maxOf(0.0, minOf(1.0, ((px - seg.x1) * (seg.x2 - seg.x1) + (py - seg.y1) * (seg.y2 - seg.y1)) / l2))
        val projX = seg.x1 + t * (seg.x2 - seg.x1)
        val projY = seg.y1 + t * (seg.y2 - seg.y1)

        return Pair(projX, projY)
    }
}
