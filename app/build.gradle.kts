plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.sqoor.iraqmap"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sqoor.iraqmap"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("org.maplibre.gl:android-sdk:11.8.0")
}
