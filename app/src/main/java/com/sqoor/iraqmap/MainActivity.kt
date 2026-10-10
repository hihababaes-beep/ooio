package com.sqoor.iraqmap

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.Property
import org.maplibre.android.style.layers.PropertyFactory.circleColor
import org.maplibre.android.style.layers.PropertyFactory.circleRadius
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeColor
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeWidth
import org.maplibre.android.style.layers.PropertyFactory.visibility
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.Point

class MainActivity : ComponentActivity(), LocationListener {
    private lateinit var mapView: MapView
    private lateinit var statusText: TextView
    private lateinit var locationManager: LocationManager
    private var map: MapLibreMap? = null
    private var locationSource: GeoJsonSource? = null
    private var locationLayer: CircleLayer? = null
    private var lastLocation: Location? = null
    private var followLocation = false

    private val locationPermission =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            if (grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            ) {
                startLocationUpdates()
            } else {
                statusText.text = "اسمح بالوصول للموقع لاستخدام GPS"
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        MapLibre.getInstance(applicationContext)
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        buildScreen(savedInstanceState)
    }

    private fun buildScreen(savedInstanceState: Bundle?) {
        val root = FrameLayout(this)
        mapView = MapView(this)
        root.addView(
            mapView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        val header = TextView(this).apply {
            text = "صقور العراق"
            textSize = 18f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(dp(20), dp(10), dp(20), dp(10))
            setBackgroundColor(Color.rgb(16, 24, 39))
            elevation = dp(6).toFloat()
        }
        val headerParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP or Gravity.CENTER_HORIZONTAL
        ).apply {
            topMargin = dp(20)
        }
        root.addView(header, headerParams)

        statusText = TextView(this).apply {
            text = "الخريطة جاهزة — اضغط زر الموقع لتفعيل GPS"
            textSize = 13f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(8), dp(14), dp(8))
            setBackgroundColor(Color.rgb(28, 39, 57))
            elevation = dp(6).toFloat()
        }
        val statusParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
        ).apply {
            leftMargin = dp(16)
            rightMargin = dp(88)
            bottomMargin = dp(28)
        }
        root.addView(statusText, statusParams)

        val locateButton = Button(this).apply {
            text = "موقعي"
            textSize = 14f
            isAllCaps = false
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(18, 103, 214))
            elevation = dp(8).toFloat()
            setOnClickListener { enableLocation() }
        }
        val buttonParams = FrameLayout.LayoutParams(dp(76), dp(56), Gravity.BOTTOM or Gravity.END).apply {
            rightMargin = dp(16)
            bottomMargin = dp(20)
        }
        root.addView(locateButton, buttonParams)

        setContentView(root)
        mapView.onCreate(savedInstanceState)
        mapView.getMapAsync { loadedMap ->
            map = loadedMap
            loadedMap.setStyle(MAP_STYLE_URL) { style ->
                installLocationLayer(style)
                loadedMap.cameraPosition = CameraPosition.Builder()
                    .target(LatLng(33.3152, 44.3661))
                    .zoom(12.0)
                    .build()
                statusText.text = "الخريطة جاهزة — بغداد"
            }
        }
    }

    private fun installLocationLayer(style: Style) {
        val initialPoint = Point.fromLngLat(44.3661, 33.3152)
        val source = GeoJsonSource(LOCATION_SOURCE_ID, Feature.fromGeometry(initialPoint))
        style.addSource(source)
        val layer = CircleLayer(LOCATION_LAYER_ID, LOCATION_SOURCE_ID).withProperties(
            circleRadius(8f),
            circleColor(Color.rgb(18, 103, 214)),
            circleStrokeColor(Color.WHITE),
            circleStrokeWidth(3f),
            visibility(Property.NONE)
        )
        style.addLayer(layer)
        locationSource = source
        locationLayer = layer
        lastLocation?.let(::showLocation)
    }

    private fun enableLocation() {
        val fineGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!fineGranted && !coarseGranted) {
            locationPermission.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
            return
        }
        followLocation = true
        lastLocation?.let(::showLocation)
        startLocationUpdates()
    }

    private fun startLocationUpdates() {
        val fineGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!fineGranted && !coarseGranted) return

        try {
            val provider = when {
                fineGranted && locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ->
                    LocationManager.GPS_PROVIDER
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ->
                    LocationManager.NETWORK_PROVIDER
                else -> {
                    statusText.text = "فعّل GPS أو خدمات الموقع في الهاتف"
                    return
                }
            }
            locationManager.requestLocationUpdates(provider, 1000L, 2f, this, Looper.getMainLooper())
            statusText.text = "جارٍ تحديد موقعك..."
        } catch (error: SecurityException) {
            statusText.text = "تعذّر الوصول إلى الموقع؛ تحقق من أذونات التطبيق"
        } catch (error: IllegalArgumentException) {
            statusText.text = "مزود الموقع غير متاح على هذا الجهاز"
        }
    }

    override fun onLocationChanged(location: Location) {
        lastLocation = location
        showLocation(location)
    }

    private fun showLocation(location: Location) {
        val point = Point.fromLngLat(location.longitude, location.latitude)
        locationSource?.setGeoJson(Feature.fromGeometry(point))
        locationLayer?.setProperties(visibility(Property.VISIBLE))
        statusText.text = "دقة الموقع: ${location.accuracy.toInt()} م"
        if (followLocation) {
            map?.animateCamera(
                CameraUpdateFactory.newLatLngZoom(
                    LatLng(location.latitude, location.longitude),
                    16.0
                ),
                700
            )
        }
    }

    override fun onProviderDisabled(provider: String) {
        if (provider == LocationManager.GPS_PROVIDER) {
            statusText.text = "GPS متوقف؛ فعّل خدمات الموقع"
        }
    }

    override fun onProviderEnabled(provider: String) = Unit

    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

    override fun onStart() {
        super.onStart()
        if (::mapView.isInitialized) mapView.onStart()
    }

    override fun onResume() {
        super.onResume()
        if (::mapView.isInitialized) mapView.onResume()
    }

    override fun onPause() {
        if (::mapView.isInitialized) mapView.onPause()
        super.onPause()
    }

    override fun onStop() {
        if (::mapView.isInitialized) mapView.onStop()
        super.onStop()
    }

    override fun onLowMemory() {
        super.onLowMemory()
        if (::mapView.isInitialized) mapView.onLowMemory()
    }

    override fun onDestroy() {
        locationManager.removeUpdates(this)
        if (::mapView.isInitialized) mapView.onDestroy()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (::mapView.isInitialized) mapView.onSaveInstanceState(outState)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private companion object {
        const val MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"
        const val LOCATION_SOURCE_ID = "user-location"
        const val LOCATION_LAYER_ID = "user-location-dot"
    }
}
