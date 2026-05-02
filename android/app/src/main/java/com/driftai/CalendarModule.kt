package com.driftai

import android.Manifest
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.CalendarContract
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.util.TimeZone

class CalendarModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "CalendarModule"

    @ReactMethod
    fun createEvent(title: String, beginTime: Double, endTime: Double, allDay: Boolean, promise: Promise) {
        val hasRead = hasPermission(Manifest.permission.READ_CALENDAR)
        val hasWrite = hasPermission(Manifest.permission.WRITE_CALENDAR)

        if (hasRead && hasWrite) {
            insertEvent(title, beginTime.toLong(), endTime.toLong(), allDay, promise)
            return
        }

        val activity = reactContext.currentActivity as? PermissionAwareActivity
        if (activity == null) {
            promise.reject("CALENDAR_ERROR", "No activity available to request permissions")
            return
        }

        activity.requestPermissions(
            arrayOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR),
            CALENDAR_PERMISSION_REQUEST,
            object : PermissionListener {
                override fun onRequestPermissionsResult(
                    requestCode: Int,
                    permissions: Array<String>,
                    grantResults: IntArray
                ): Boolean {
                    if (requestCode != CALENDAR_PERMISSION_REQUEST) return false
                    val granted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
                    if (granted) {
                        insertEvent(title, beginTime.toLong(), endTime.toLong(), allDay, promise)
                    } else {
                        promise.reject("PERMISSION_DENIED", "Calendar permission denied")
                    }
                    return true
                }
            }
        )
    }

    private fun insertEvent(title: String, beginTime: Long, endTime: Long, allDay: Boolean, promise: Promise) {
        try {
            val calendarId = getDefaultCalendarId()
            if (calendarId == null) {
                promise.reject("CALENDAR_ERROR", "No calendar found on device")
                return
            }

            // All-day events must use UTC midnight — the calendar provider interprets
            // all-day timestamps as UTC, so passing local midnight shifts the date back
            // by the UTC offset (e.g. IST midnight = UTC 18:30 prev day = wrong date)
            val tz = TimeZone.getDefault()
            val adjustedBegin = if (allDay) beginTime + tz.getOffset(beginTime) else beginTime
            val adjustedEnd = if (allDay) endTime + tz.getOffset(endTime) else endTime

            val values = ContentValues().apply {
                put(CalendarContract.Events.CALENDAR_ID, calendarId)
                put(CalendarContract.Events.TITLE, title)
                put(CalendarContract.Events.DTSTART, adjustedBegin)
                put(CalendarContract.Events.DTEND, adjustedEnd)
                put(CalendarContract.Events.ALL_DAY, if (allDay) 1 else 0)
                put(CalendarContract.Events.EVENT_TIMEZONE, if (allDay) "UTC" else tz.id)
            }

            val uri = reactContext.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
            if (uri != null) {
                promise.resolve("created")
            } else {
                promise.reject("CALENDAR_ERROR", "Failed to insert event — contentResolver returned null")
            }
        } catch (e: Exception) {
            promise.reject("CALENDAR_ERROR", e.message, e)
        }
    }

    private fun getDefaultCalendarId(): Long? {
        val projection = arrayOf(CalendarContract.Calendars._ID, CalendarContract.Calendars.IS_PRIMARY)
        val cursor = reactContext.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI,
            projection,
            "${CalendarContract.Calendars.VISIBLE} = 1",
            null,
            "${CalendarContract.Calendars.IS_PRIMARY} DESC"
        ) ?: return null

        return cursor.use {
            if (it.moveToFirst()) it.getLong(0) else null
        }
    }

    private fun hasPermission(permission: String) =
        ContextCompat.checkSelfPermission(reactContext, permission) == PackageManager.PERMISSION_GRANTED

    companion object {
        private const val CALENDAR_PERMISSION_REQUEST = 102
    }
}
