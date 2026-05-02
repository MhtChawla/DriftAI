package com.driftai

import android.content.Intent
import android.speech.RecognitionListener
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechRecognizerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), RecognitionListener {

    private var speechRecognizer: SpeechRecognizer? = null
    private var reactContext: ReactApplicationContext = reactContext

    override fun getName(): String {
        return "SpeechRecognizer"
    }

    @ReactMethod
    fun startListening(language: String, promise: Promise) {
        reactContext.runOnUiQueueThread {
            try {
                if (speechRecognizer == null) {
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext)
                    speechRecognizer!!.setRecognitionListener(this)
                }

                val intent = Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(
                        android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                    )
                    putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, language)
                    putExtra(android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE, reactContext.packageName)
                }

                speechRecognizer!!.startListening(intent)
                promise.resolve("Listening started")
            } catch (e: Exception) {
                promise.reject("SPEECH_RECOGNITION_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        reactContext.runOnUiQueueThread {
            try {
                speechRecognizer?.stopListening()
                promise.resolve("Listening stopped")
            } catch (e: Exception) {
                promise.reject("SPEECH_RECOGNITION_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun destroy() {
        speechRecognizer?.destroy()
        speechRecognizer = null
    }

    override fun onBeginningOfSpeech() {
        sendEvent("onSpeechStart", null)
    }

    override fun onEndOfSpeech() {
        sendEvent("onSpeechEnd", null)
    }

    override fun onResults(results: android.os.Bundle?) {
        val matches = results?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)
        val transcript = matches?.getOrNull(0) ?: ""

        val params = Arguments.createMap().apply {
            putString("transcript", transcript)
        }
        sendEvent("onSpeechRecognized", params)
    }

    override fun onError(error: Int) {
        val errorMessage = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech input recognized"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
            else -> "Unknown error: $error"
        }

        val params = Arguments.createMap().apply {
            putString("error", errorMessage)
        }
        sendEvent("onSpeechError", params)
    }

    override fun onPartialResults(partialResults: android.os.Bundle?) {
        // Optional: emit partial results
    }

    override fun onRmsChanged(rmsdB: Float) {
        // Optional: emit volume level
    }

    override fun onBufferReceived(buffer: ByteArray?) {
        // Optional: handle raw audio
    }

    override fun onReadyForSpeech(params: android.os.Bundle?) {
        // Optional: handle readiness
    }

    override fun onEvent(eventType: Int, params: android.os.Bundle?) {
        // Optional: handle events
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
