import { NativeModules, Platform } from 'react-native';

const { TextToSpeech } = NativeModules;

const LANGUAGE_TAGS: Record<string, string> = {
  arabic: 'ar',
  bengali: 'bn',
  chinese: 'zh-CN',
  english: 'en',
  french: 'fr',
  german: 'de',
  gujarati: 'gu',
  hindi: 'hi',
  italian: 'it',
  japanese: 'ja',
  kannada: 'kn',
  korean: 'ko',
  malayalam: 'ml',
  marathi: 'mr',
  portuguese: 'pt',
  punjabi: 'pa',
  russian: 'ru',
  spanish: 'es',
  tamil: 'ta',
  telugu: 'te',
  urdu: 'ur',
};

export const speak = async (text: string, language = 'english') => {
  if (Platform.OS !== 'android' || !TextToSpeech) {
    return;
  }

  const tag = LANGUAGE_TAGS[language.toLowerCase()] ?? 'en';
  await TextToSpeech.speak(text, tag);
};

export const stopSpeaking = async () => {
  if (Platform.OS !== 'android' || !TextToSpeech) {
    return;
  }

  await TextToSpeech.stop();
};
