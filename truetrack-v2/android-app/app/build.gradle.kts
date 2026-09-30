plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.truetrack.v2"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.truetrack.v2"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "2.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }
}

dependencies {
    implementation(project(":engine-core")) {
        exclude(group = "com.microsoft.onnxruntime", module = "onnxruntime")
    }
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.cardview:cardview:1.0.0")

    // WebSocket Server for Cockpit live bridge
    implementation("org.java-websocket:Java-WebSocket:1.5.4")

    // ONNX Runtime Mobile for Android Edge AI Inference
    implementation("com.microsoft.onnxruntime:onnxruntime-android:1.20.0")

    // MapLibre for offline vector tile rendering
    implementation("org.maplibre.gl:android-sdk:11.5.1")
}
