package com.truetrack.v2.models

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.File
import java.nio.FloatBuffer

/**
 * Android ONNX Runtime Wrapper for the Heteroscedastic 1D-TCN.
 * This represents the "AI Speed & Vibration Filter" running on-device.
 */
class NeuralOdometryTCN(modelFile: File) {

    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val session: OrtSession

    init {
        require(modelFile.exists()) { "ONNX model file not found at ${modelFile.absolutePath}" }
        session = env.createSession(modelFile.absolutePath, OrtSession.SessionOptions())
    }

    /**
     * Infers speed and variance from a sliding window of physical IMU data.
     * @param imuWindow Shape [1, 6, 50] (batch, channels, time)
     * @return Pair of (Mean Velocity, Log-Variance)
     */
    fun predictSpeed(imuWindow: FloatArray): Pair<Double, Double> {
        require(imuWindow.size == 300) { "Expected 6 channels * 50 timesteps = 300 floats" }
        
        val shape = longArrayOf(1, 6, 50)
        val buffer = FloatBuffer.wrap(imuWindow)
        
        env.use { 
            OnnxTensor.createTensor(env, buffer, shape).use { inputTensor ->
                val inputs = mapOf("input" to inputTensor)
                session.run(inputs).use { results ->
                    val output = (results[0].value as Array<FloatArray>)[0] // [mu, log_var]
                    return Pair(output[0].toDouble(), output[1].toDouble())
                }
            }
        }
    }

    fun close() {
        session.close()
        env.close()
    }
}
