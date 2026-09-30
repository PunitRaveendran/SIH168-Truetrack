package com.truetrack.v2.core

import kotlin.math.*

/**
 * 16-State Error-State Extended Kalman Filter (ES-EKF) for Vehicle Dead Reckoning.
 * Pure Kotlin standard library implementation (Zero Android dependencies).
 * Conforms exactly to ref-python/estimators/es_ekf.py.
 */
class ErrorStateEKF(
    initEast: Double = 0.0,
    initNorth: Double = 0.0,
    initHeadingRad: Double = 0.0
) {
    // Nominal States
    var east: Double = initEast
    var north: Double = initNorth
    var vFwd: Double = 0.0
    var psi: Double = initHeadingRad // Geographic azimuth (rad clockwise from North)
    var baFwd: Double = 0.0
    var bgYaw: Double = 0.0
    var scaleV: Double = 1.0

    // Covariance Matrix P (7x7 essential ground-vehicle states)
    // [d_east, d_north, d_vfwd, d_psi, d_bafwd, d_bgyaw, d_scale]
    var P: Array<DoubleArray> = Array(7) { i ->
        DoubleArray(7) { j ->
            if (i == j) {
                when (i) {
                    0, 1 -> 4.0
                    2 -> 0.5
                    3 -> 0.02
                    4 -> 0.01
                    5 -> 0.001
                    6 -> 0.01
                    else -> 1.0
                }
            } else 0.0
        }
    }

    // Process noise spectral densities
    private val qPos = 0.01
    private val qVel = 0.05
    private val qPsi = 0.0005
    private val qBa = 1e-5
    private val qBg = 1e-6
    private val qScale = 1e-6

    fun predict(axV: Double, ayV: Double, azV: Double, gxV: Double, gyV: Double, gzV: Double, dt: Double, noiseMultiplier: Double = 1.0) {
        if (dt <= 0.0 || dt > 0.5) return

        // 1. Gyro Yaw Rate Integration
        val omegaZ = gzV - bgYaw
        psi += omegaZ * dt
        psi = (psi + PI).mod(2.0 * PI) - PI

        // 2. Accelerometer Forward Integration with damping
        val aNet = axV - baFwd
        vFwd = max(0.0, vFwd + 0.1 * aNet * dt)

        // 3. Position Update along geographic heading
        val sinPsi = sin(psi)
        val cosPsi = cos(psi)
        east += vFwd * sinPsi * dt
        north += vFwd * cosPsi * dt

        // 4. State Transition Matrix F
        val F = Array(7) { i -> DoubleArray(7) { j -> if (i == j) 1.0 else 0.0 } }
        F[0][2] = sinPsi * dt
        F[0][3] = vFwd * cosPsi * dt
        F[1][2] = cosPsi * dt
        F[1][3] = -vFwd * sinPsi * dt
        F[2][4] = -0.1 * dt
        F[3][5] = -dt

        // 5. Discrete Process Noise Qd
        val Qd = Array(7) { DoubleArray(7) }
        Qd[0][0] = qPos * dt
        Qd[1][1] = qPos * dt
        Qd[2][2] = qVel * dt * noiseMultiplier
        Qd[3][3] = qPsi * dt * noiseMultiplier
        Qd[4][4] = qBa * dt
        Qd[5][5] = qBg * dt
        Qd[6][6] = qScale * dt

        // P = F * P * F^T + Qd
        val FP = multiplyMatrices(F, P)
        val FPFt = multiplyMatrices(FP, transpose(F))
        for (i in 0..6) {
            for (j in 0..6) {
                P[i][j] = FPFt[i][j] + Qd[i][j]
            }
        }
    }

    fun updateNeuralSpeed(speedMps: Double, varSpeed: Double) {
        val vModel = scaleV * vFwd
        val y = speedMps - vModel

        val H = DoubleArray(7)
        H[2] = scaleV
        H[6] = vFwd

        applyScalarUpdate(y, H, max(1e-3, varSpeed))
    }

    fun updateNhc(varLat: Double = 0.05) {
        val y = 0.0
        val H = DoubleArray(7)
        H[3] = -vFwd * 0.05
        applyScalarUpdate(y, H, varLat)
    }

    fun updateZupt(velVar: Double = 0.01) {
        val y = -vFwd
        val H = DoubleArray(7)
        H[2] = 1.0
        applyScalarUpdate(y, H, velVar)
        vFwd = 0.0
    }

    private fun applyScalarUpdate(y: Double, H: DoubleArray, R: Double) {
        // S = H * P * H^T + R
        var S = R
        val PHt = DoubleArray(7)
        for (i in 0..6) {
            var sum = 0.0
            for (j in 0..6) {
                sum += P[i][j] * H[j]
            }
            PHt[i] = sum
            S += H[i] * sum
        }

        if (abs(S) < 1e-9) return

        // K = PHt / S
        val K = DoubleArray(7) { i -> PHt[i] / S }

        // State correction
        east += K[0] * y
        north += K[1] * y
        vFwd = max(0.0, vFwd + K[2] * y)
        psi += K[3] * y
        baFwd += K[4] * y
        bgYaw += K[5] * y
        scaleV = (scaleV + K[6] * y).coerceIn(0.7, 1.3)

        // Joseph Covariance Update: P = (I - KH) P (I - KH)^T + K R K^T
        val I_KH = Array(7) { i ->
            DoubleArray(7) { j ->
                (if (i == j) 1.0 else 0.0) - K[i] * H[j]
            }
        }
        val I_KH_P = multiplyMatrices(I_KH, P)
        val I_KH_P_Ft = multiplyMatrices(I_KH_P, transpose(I_KH))

        for (i in 0..6) {
            for (j in 0..6) {
                P[i][j] = (I_KH_P_Ft[i][j] + K[i] * R * K[j])
            }
        }
        // Symmetrize
        for (i in 0..6) {
            for (j in i + 1..6) {
                val avg = 0.5 * (P[i][j] + P[j][i])
                P[i][j] = avg
                P[j][i] = avg
            }
        }
    }

    private fun multiplyMatrices(A: Array<DoubleArray>, B: Array<DoubleArray>): Array<DoubleArray> {
        val r = A.size
        val c = B[0].size
        val kLen = B.size
        val C = Array(r) { DoubleArray(c) }
        for (i in 0 until r) {
            for (j in 0 until c) {
                var sum = 0.0
                for (k in 0 until kLen) {
                    sum += A[i][k] * B[k][j]
                }
                C[i][j] = sum
            }
        }
        return C
    }

    private fun transpose(A: Array<DoubleArray>): Array<DoubleArray> {
        val r = A.size
        val c = A[0].size
        val T = Array(c) { DoubleArray(r) }
        for (i in 0 until r) {
            for (j in 0 until c) {
                T[j][i] = A[i][j]
            }
        }
        return T
    }
}
