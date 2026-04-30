package com.driftai

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.provider.AlarmClock
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AutomationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AutomationModule"

    @ReactMethod
    fun setDoNotDisturb(enabled: Boolean, promise: Promise) {
        try {
            val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (!manager.isNotificationPolicyAccessGranted) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(false)
                return
            }

            manager.setInterruptionFilter(
                if (enabled) {
                    NotificationManager.INTERRUPTION_FILTER_NONE
                } else {
                    NotificationManager.INTERRUPTION_FILTER_ALL
                }
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DND_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startTimer(seconds: Double, label: String, promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
                putExtra(AlarmClock.EXTRA_LENGTH, seconds.toInt())
                putExtra(AlarmClock.EXTRA_MESSAGE, label)
                putExtra(AlarmClock.EXTRA_SKIP_UI, false)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TIMER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setAlarm(hour: Double, minute: Double, label: String, promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour.toInt())
                putExtra(AlarmClock.EXTRA_MINUTES, minute.toInt())
                putExtra(AlarmClock.EXTRA_MESSAGE, label)
                putExtra(AlarmClock.EXTRA_SKIP_UI, false)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setRingerMode(mode: String, promise: Promise) {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val ringerMode = when (mode) {
                "silent" -> AudioManager.RINGER_MODE_SILENT
                "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
                else -> AudioManager.RINGER_MODE_NORMAL
            }

            if (ringerMode == AudioManager.RINGER_MODE_SILENT && !manager.isNotificationPolicyAccessGranted) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(false)
                return
            }

            audioManager.ringerMode = ringerMode
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RINGER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openDisplaySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_DISPLAY_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISPLAY_SETTINGS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setMediaVolume(percent: Double, promise: Promise) {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val targetVolume = ((percent / 100.0) * maxVolume).toInt().coerceIn(0, maxVolume)
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume, 0)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setFlashlight(on: Boolean, promise: Promise) {
        try {
            val cameraManager = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraId = cameraManager.cameraIdList.firstOrNull()
            if (cameraId == null) {
                promise.reject("FLASHLIGHT_ERROR", "No camera found")
                return
            }
            cameraManager.setTorchMode(cameraId, on)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FLASHLIGHT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun lockScreen(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            if (activity != null) {
                activity.runOnUiThread {
                    // Move app to background — device lock policy handles screen lock
                    val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_HOME)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(homeIntent)
                }
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("LOCK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setBrightness(percent: Double, promise: Promise) {
        val clampedPercent = percent.coerceIn(1.0, 100.0)
        val brightness = ((clampedPercent / 100.0) * 255.0).toInt().coerceIn(1, 255)

        reactContext.currentActivity?.runOnUiThread {
            try {
                reactContext.currentActivity?.window?.attributes?.let { attrs ->
                    attrs.screenBrightness = (clampedPercent / 100.0).toFloat()
                    reactContext.currentActivity?.window?.attributes = attrs
                }

                if (!Settings.System.canWrite(reactContext)) {
                    val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
                        data = Uri.parse("package:${reactContext.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                    promise.resolve(false)
                    return@runOnUiThread
                }

                Settings.System.putInt(
                    reactContext.contentResolver,
                    Settings.System.SCREEN_BRIGHTNESS_MODE,
                    Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
                )
                Settings.System.putInt(
                    reactContext.contentResolver,
                    Settings.System.SCREEN_BRIGHTNESS,
                    brightness
                )
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("BRIGHTNESS_ERROR", e.message, e)
            }
        } ?: promise.resolve(true)
    }
}
