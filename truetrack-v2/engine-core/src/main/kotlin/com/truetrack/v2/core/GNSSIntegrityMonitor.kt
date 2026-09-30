package com.truetrack.v2.core

import kotlin.math.abs

/**
 * Monitors GNSS signal integrity using Innovation covariance and CUSUM statistics.
 * Defends the EKF from spoofing, jamming, and severe multipath errors.
 */
class GNSSIntegrityMonitor(
    private val nisThreshold: Double = 9.21, // 99% confidence for 2 DOF (x,y)
    private val cusumThreshold: Double = 15.0,
    private val cusumDrift: Double = 2.0
) {
    private var sPos = 0.0
    private var spoofingDetected = false
    private var consecutiveRejections = 0

    /**
     * Checks if the incoming GNSS measurement is statistically consistent with the EKF's prediction.
     * 
     * @param innovation The difference between GNSS position and EKF predicted position (dx, dy).
     * @param innovationCovariance Trace or determinant of the innovation covariance matrix S.
     * @return true if GNSS is valid and should be fused, false if it should be rejected.
     */
    fun checkMeasurement(innovation: DoubleArray, innovationCovarianceMatrixS: Array<DoubleArray>): Boolean {
        require(innovation.size == 2) { "Innovation must be 2D (x, y)" }
        
        // Simplified NIS calculation: nu^T * S^-1 * nu
        // For edge speed, we approximate with diagonal if cross-terms are small, or compute full inverse
        val s11 = innovationCovarianceMatrixS[0][0]
        val s22 = innovationCovarianceMatrixS[1][1]
        val s12 = innovationCovarianceMatrixS[0][1]
        
        val det = s11 * s22 - s12 * s12
        if (det < 1e-9) return false // Ill-conditioned
        
        val invS11 = s22 / det
        val invS22 = s11 / det
        val invS12 = -s12 / det
        
        val dx = innovation[0]
        val dy = innovation[1]
        
        val nis = dx * (invS11 * dx + invS12 * dy) + dy * (invS12 * dx + invS22 * dy)
        
        // CUSUM Update for Spoofing Detection
        val logLikelihoodRatio = nis - cusumDrift
        sPos = maxOf(0.0, sPos + logLikelihoodRatio)
        
        if (sPos > cusumThreshold) {
            spoofingDetected = true
        } else if (sPos == 0.0) {
            spoofingDetected = false // Reset recovery
        }

        val isValid = nis <= nisThreshold && !spoofingDetected
        
        if (!isValid) {
            consecutiveRejections++
        } else {
            consecutiveRejections = 0
        }
        
        return isValid
    }

    fun isSpoofingDetected(): Boolean = spoofingDetected
    
    fun getConsecutiveRejections(): Int = consecutiveRejections
    
    fun reset() {
        sPos = 0.0
        spoofingDetected = false
        consecutiveRejections = 0
    }
}
