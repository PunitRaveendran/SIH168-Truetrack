package com.truetrack.v2.bridge

import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import java.net.InetSocketAddress
import java.nio.ByteBuffer

/**
 * High-performance WebSocket telemetry server for TrueTrack v2.
 * Listens on port 8765 to broadcast 10-50Hz navigation packets to the Cockpit web interface.
 */
class TelemetryStreamServer(port: Int = 8765) : WebSocketServer(InetSocketAddress(port)) {

    override fun onOpen(conn: WebSocket?, handshake: ClientHandshake?) {
        println("Cockpit client connected: ${conn?.remoteSocketAddress}")
    }

    override fun onClose(conn: WebSocket?, code: Int, reason: String?, remote: Boolean) {
        println("Cockpit client disconnected: ${conn?.remoteSocketAddress}")
    }

    override fun onMessage(conn: WebSocket?, message: String?) {
        // Handle scenario injection commands from Cockpit (blackout, jamming, tilt, etc.)
        println("Received command from Cockpit: $message")
    }

    override fun onMessage(conn: WebSocket?, message: ByteBuffer?) {}

    override fun onError(conn: WebSocket?, ex: Exception?) {
        ex?.printStackTrace()
    }

    override fun onStart() {
        println("TrueTrack v2 TelemetryStreamServer active on port $port")
    }

    fun broadcastTelemetry(jsonTelemetry: String) {
        broadcast(jsonTelemetry)
    }
}
