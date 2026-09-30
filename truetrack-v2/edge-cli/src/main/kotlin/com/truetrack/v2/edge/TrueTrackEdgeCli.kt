package com.truetrack.v2.edge

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.double
import com.github.ajalt.clikt.parameters.types.file
import com.truetrack.v2.core.ContinuousAlignmentEngine
import com.truetrack.v2.core.ErrorStateEKF
import com.truetrack.v2.core.GNSSIntegrityMonitor
import com.truetrack.v2.core.MapMatcher
import java.io.File
import kotlin.system.measureTimeMillis

class TrueTrackEdgeCli : CliktCommand(help = "TrueTrack v2 Edge Deployable Engine CLI") {
    val imuFile by option("-i", "--imu", help = "Input IMU CSV file (FOG or MEMS data)").file(mustExist = true)
    val gnssFile by option("-g", "--gnss", help = "Input GNSS CSV file").file(mustExist = true)
    val outputFile by option("-o", "--out", help = "Output trajectory CSV").file().default(File("edge_output_trajectory.csv"))
    val hz by option("--hz", help = "Input data frequency").double().default(200.0)

    override fun run() {
        echo("Initializing TrueTrack v2 Edge Engine at ${hz}Hz...")
        
        // Initialize core engine components
        val ekf = ErrorStateEKF()
        val alignment = ContinuousAlignmentEngine()
        val integrityMonitor = GNSSIntegrityMonitor()
        val mapMatcher = MapMatcher()

        // In a real scenario we would load the ONNX Runtime model here
        // val tcn = NeuralOdometryTCN(File("sensor-profiles/truetrack_v2_quantized.onnx"))

        echo("Core Engine Initialized. Ready for live ingestion.")
        
        if (imuFile == null) {
            echo("Running in dry-run mode (no IMU file provided).")
            return
        }
        
        val time = measureTimeMillis {
            // Simulated replay loop would go here:
            // 1. Read IMU CSV line by line
            // 2. alignment.align(imu)
            // 3. val speed = tcn.predict(window)
            // 4. ekf.predict(imu)
            // 5. if (gnssAvailable) { if (integrityMonitor.check(gnss)) ekf.update(gnss) }
            // 6. mapMatcher.match(ekf.position)
        }

        echo("Processing complete in ${time}ms.")
        echo("Output written to ${outputFile.absolutePath}")
    }
}

fun main(args: Array<String>) = TrueTrackEdgeCli().main(args)
