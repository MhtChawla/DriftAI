package com.driftai

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.Calendar

class GalleryModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "GalleryModule"

    @ReactMethod
    fun getLatestImageUri(promise: Promise) {
        try {
            val imageUri = findLatestImageUri(MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
                ?: findLatestImageUri(MediaStore.Images.Media.INTERNAL_CONTENT_URI)

            promise.resolve(imageUri?.toString())
        } catch (e: Exception) {
            promise.reject("GALLERY_ERROR", e.message, e)
        }
    }

    private fun findLatestImageUri(baseUri: Uri): Uri? {
        val cursor = reactContext.contentResolver.query(
            baseUri,
            arrayOf(
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DATE_TAKEN,
                MediaStore.Images.Media.DATE_ADDED
            ),
            null,
            null,
            "${MediaStore.Images.Media.DATE_ADDED} DESC, ${MediaStore.Images.Media.DATE_TAKEN} DESC"
        )

        return cursor?.use {
            if (it.moveToFirst()) {
                val id = it.getLong(it.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
                Uri.withAppendedPath(baseUri, id.toString())
            } else null
        }
    }

    @ReactMethod
    fun cacheImageForSharing(uriString: String, promise: Promise) {
        try {
            val sourceUri = Uri.parse(uriString)
            val mimeType = reactContext.contentResolver.getType(sourceUri) ?: "image/jpeg"
            val extension = when (mimeType) {
                "image/png" -> "png"
                "image/webp" -> "webp"
                else -> "jpg"
            }
            val outputFile = File(reactContext.cacheDir, "driftai-instagram-share.$extension")

            reactContext.contentResolver.openInputStream(sourceUri).use { input ->
                if (input == null) {
                    promise.reject("GALLERY_ERROR", "Unable to read image")
                    return
                }

                FileOutputStream(outputFile).use { output ->
                    input.copyTo(output)
                }
            }

            promise.resolve("file://${outputFile.absolutePath}")
        } catch (e: Exception) {
            promise.reject("GALLERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getImageDataUri(uriString: String, promise: Promise) {
        try {
            val sourceUri = Uri.parse(uriString)
            val bytes = reactContext.contentResolver.openInputStream(sourceUri).use { input ->
                if (input == null) {
                    promise.reject("GALLERY_ERROR", "Unable to read image")
                    return
                }

                input.readBytes()
            }

            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)

            options.inJustDecodeBounds = false
            options.inSampleSize = calculateSampleSize(options, 1024, 1024)

            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
            if (bitmap == null) {
                promise.reject("GALLERY_ERROR", "Unable to decode image")
                return
            }

            val output = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 82, output)
            bitmap.recycle()

            val base64 = Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
            promise.resolve("data:image/jpeg;base64,$base64")
        } catch (e: Exception) {
            promise.reject("GALLERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun copyTextToClipboard(text: String, promise: Promise) {
        try {
            val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("DriftAI Instagram caption", text))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e.message, e)
        }
    }

    private fun calculateSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val height = options.outHeight
        val width = options.outWidth
        var sampleSize = 1

        while (height / sampleSize > reqHeight || width / sampleSize > reqWidth) {
            sampleSize *= 2
        }

        return sampleSize
    }

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
