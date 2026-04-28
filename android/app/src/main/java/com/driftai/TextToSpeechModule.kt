package com.driftai

import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.*
import java.util.Locale

class TextToSpeechModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var tts: TextToSpeech? = null
    private var isReady = false

    init {
        tts = TextToSpeech(reactContext) { status ->
            isReady = status == TextToSpeech.SUCCESS
        }
    }

    override fun getName(): String = "TextToSpeech"

    @ReactMethod
    fun speak(text: String, languageTag: String, promise: Promise) {
        if (!isReady) {
            promise.reject("TTS_NOT_READY", "TextToSpeech engine is not ready")
            return
        }

        val locale = runCatching { Locale.forLanguageTag(languageTag) }.getOrDefault(Locale.ENGLISH)
        val result = tts?.setLanguage(locale)

        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            tts?.setLanguage(Locale.ENGLISH)
        }

        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "drif_tts")
        promise.resolve(null)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        tts?.stop()
        promise.resolve(null)
    }
}
