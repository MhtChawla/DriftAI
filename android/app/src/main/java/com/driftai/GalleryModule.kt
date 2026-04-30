package com.driftai

import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.util.Calendar

class GalleryModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "GalleryModule"

    // Opens gallery at a specific date by launching the system picker filtered to that day's images.
    // dateStr format: "YYYY-MM-DD". If empty, opens gallery root.
    @ReactMethod
    fun openAtDate(dateStr: String, promise: Promise) {
        try {
            if (dateStr.isEmpty()) {
                openGalleryRoot()
                promise.resolve(null)
                return
            }

            val parts = dateStr.split("-")
            if (parts.size != 3) {
                openGalleryRoot()
                promise.resolve(null)
                return
            }

            val year = parts[0].toInt()
            val month = parts[1].toInt() - 1 // Calendar months are 0-based
            val day = parts[2].toInt()

            val startMs = Calendar.getInstance().apply {
                set(year, month, day, 0, 0, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            val endMs = Calendar.getInstance().apply {
                set(year, month, day, 23, 59, 59)
                set(Calendar.MILLISECOND, 999)
            }.timeInMillis

            // DATE_TAKEN is in milliseconds; DATE_ADDED is in seconds — query both
            val selection = "(${MediaStore.Images.Media.DATE_TAKEN} BETWEEN ? AND ?) OR (${MediaStore.Images.Media.DATE_ADDED} BETWEEN ? AND ?)"
            val selectionArgs = arrayOf(
                startMs.toString(),
                endMs.toString(),
                (startMs / 1000).toString(),
                (endMs / 1000).toString()
            )

            val cursor = reactContext.contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                arrayOf(MediaStore.Images.Media._ID),
                selection,
                selectionArgs,
                "${MediaStore.Images.Media.DATE_TAKEN} DESC"
            )

            val imageUri: Uri? = cursor?.use {
                if (it.moveToFirst()) {
                    val id = it.getLong(it.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
                    Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toString())
                } else null
            }

            if (imageUri != null) {
                // Open gallery viewer directly on the first image from that day
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(imageUri, "image/*")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                reactContext.startActivity(intent)
            } else {
                // No images found for that date — open gallery root
                openGalleryRoot()
            }

            promise.resolve(imageUri != null)
        } catch (e: Exception) {
            promise.reject("GALLERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openAlbum(albumName: String, promise: Promise) {
        try {
            if (albumName.isEmpty()) {
                openGalleryRoot()
                promise.resolve(null)
                return
            }

            val cursor = reactContext.contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                arrayOf(MediaStore.Images.Media.BUCKET_ID, MediaStore.Images.Media.BUCKET_DISPLAY_NAME),
                "${MediaStore.Images.Media.BUCKET_DISPLAY_NAME} LIKE ?",
                arrayOf("%$albumName%"),
                null
            )

            val bucketId: String? = cursor?.use {
                if (it.moveToFirst())
                    it.getString(it.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_ID))
                else null
            }

            if (bucketId != null) {
                val albumUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI.buildUpon()
                    .appendQueryParameter("bucketId", bucketId)
                    .build()
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(albumUri, "vnd.android.cursor.dir/image")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                openGalleryRoot()
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("GALLERY_ERROR", e.message, e)
        }
    }

    private fun openGalleryRoot() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "image/*")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
    }
}
