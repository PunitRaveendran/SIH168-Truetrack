package com.truetrack.v2.core

import kotlin.math.*

data class AlignmentResult(
    val pitchDeg: Double,
    val rollDeg: Double,
    val yawDeg: Double,
    val mountShiftDetected: Boolean
)

/**
 * Continuous In-Vehicle Dynamic Alignment Engine.
 * Pure Kotlin implementation matching ref-python/alignment/continuous_alignment.py.
 */
class ContinuousAlignmentEngine(val imuRateHz: Double = 60.0) {
    private val dt = 1.0 / imuRateHz
    private val alphaGrav = 1.0 - exp(-dt / 1.5)

    var gbX = 0.0
    var gbY = 0.0
    var gbZ = 9.80665

    private var refGbX = 0.0
    private var refGbY = 0.0
    private var refGbZ = 9.80665

    private var cusumS = 0.0
    private val cusumDrift = 0.15
    private val cusumThreshold = 2.5

    fun update(ax: Double, ay: Double, az: Double, gx: Double, gy: Double, gz: Double): AlignmentResult {
        // 1. Causal Low-pass Filter for Gravity
        val omegaMag = sqrt(gx * gx + gy * gy + gz * gz)
        if (omegaMag < 0.15) {
            gbX += alphaGrav * (ax - gbX)
            gbY += alphaGrav * (ay - gbY)
            gbZ += alphaGrav * (az - gbZ)
        }

        // 2. CUSUM Mount-Shift Detection
        val gDiff = sqrt((gbX - refGbX).pow(2) + (gbY - refGbY).pow(2) + (gbZ - refGbZ).pow(2))
        cusumS = max(0.0, cusumS + (gDiff - cusumDrift))
        var shiftDetected = false

        if (cusumS > cusumThreshold) {
            shiftDetected = true
            cusumS = 0.0
            refGbX = gbX
            refGbY = gbY
            refGbZ = gbZ
        }

        // 3. Compute Orientation Euler Angles
        val gNorm = sqrt(gbX * gbX + gbY * gbY + gbZ * gbZ).coerceAtLeast(1e-3)
        val zNormX = gbX / gNorm
        val zNormY = gbY / gNorm
        val zNormZ = gbZ / gNorm

        val pitch = asin((-zNormY).coerceIn(-1.0, 1.0)) * (180.0 / PI)
        val roll = atan2(zNormX, zNormZ) * (180.0 / PI)

        return AlignmentResult(
            pitchDeg = pitch,
            rollDeg = roll,
            yawDeg = 0.0,
            mountShiftDetected = shiftDetected
        )
    }

    fun rotateToVehicle(ax: Double, ay: Double, az: Double): DoubleArray {
        // Simplified pitch/roll leveling rotation
        val gNorm = sqrt(gbX * gbX + gbY * gbY + gbZ * gbZ).coerceAtLeast(1e-3)
        val pitchRad = asin((-gbY / gNorm).coerceIn(-1.0, 1.0))
        val rollRad = atan2(gbX, gbZ)

        val cp = cos(pitchRad)
        val sp = sin(pitchRad)
        val cr = cos(rollRad)
        val sr = sin(rollRad)

        // Rotate raw acceleration into level vehicle frame
        val axV = cr * ax - sr * az
        val ayV = -sp * sr * ax + cp * ay - sp * cr * az
        val azV = cp * sr * ax + sp * ay + cp * cr * az

        return doubleArrayOf(axV, ayV, azV)
    }
}
