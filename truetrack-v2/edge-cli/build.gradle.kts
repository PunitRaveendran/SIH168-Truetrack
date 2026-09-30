plugins {
    kotlin("jvm") version "1.9.22"
    application
}

group = "com.truetrack.v2"
version = "2.0.0"

repositories {
    mavenCentral()
}

dependencies {
    // Rely on the pure Kotlin core logic
    implementation(project(":engine-core"))
    
    // Command-line parsing
    implementation("com.github.ajalt.clikt:clikt:4.2.1")
    
    // Kotlin Coroutines for high-rate replay
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    
    // ONNX Runtime JVM for the edge TCN execution
    implementation("com.microsoft.onnxruntime:onnxruntime:1.16.3")
}

application {
    mainClass.set("com.truetrack.v2.edge.TrueTrackEdgeCliKt")
}

tasks.test {
    useJUnitPlatform()
}
