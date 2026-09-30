package com.truetrack.v2.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.IBinder
import com.truetrack.v2.core.ContinuousAlignmentEngine
import com.truetrack.v2.core.ErrorStateEKF
import com.truetrack.v2.core.GNSSIntegrityMonitor
import com.truetrack.v2.core.MapMatcher

class SensorService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    
    // Core Engine Instances
    private val ekf = ErrorStateEKF()
    private val alignmentEngine = ContinuousAlignmentEngine()
    private val integrityMonitor = GNSSIntegrityMonitor()
    private val mapMatcher = MapMatcher()

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        
        val accel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        val gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        
        // SENSOR_DELAY_GAME targets ~50Hz, ideal for the TCN
        sensorManager.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME)
        sensorManager.registerListener(this, gyro, SensorManager.SENSOR_DELAY_GAME)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        event ?: return
        
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            // Log accelerometer data and send to ContinuousAlignmentEngine
            // alignmentEngine.align(...)
        } else if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            // Buffer data for NeuralOdometryTCN
        }
        
        // At 50Hz, trigger EKF predict step
        // ekf.predict(...)
        // val pos = mapMatcher.matchPosition(ekf.position.x, ekf.position.y)
        // Broadcast new pos to MainActivity
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
    }
}
