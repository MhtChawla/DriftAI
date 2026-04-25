import { useState, useCallback, useEffect } from 'react';
import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import { useAppStore } from '../store/appStore';

const { SpeechRecognizer } = NativeModules;

interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearTranscript: () => void;
}

export const useVoice = (): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setAppError = useAppStore((state) => state.setError);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const eventEmitter = new NativeEventEmitter(SpeechRecognizer);

    const subscriptions = [
      eventEmitter.addListener('onSpeechStart', () => {
        setIsListening(true);
        setError(null);
      }),
      eventEmitter.addListener('onSpeechRecognized', (event: any) => {
        setTranscript(event.transcript || '');
      }),
      eventEmitter.addListener('onSpeechError', (event: any) => {
        const errorMsg = event.error || 'Speech recognition error';
        setError(errorMsg);
        setAppError(errorMsg);
        setIsListening(false);
      }),
      eventEmitter.addListener('onSpeechEnd', () => {
        setIsListening(false);
      }),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [setAppError]);

  const startListening = useCallback(async () => {
    if (Platform.OS !== 'android') {
      const errorMsg = 'Speech recognition only available on Android';
      setError(errorMsg);
      setAppError(errorMsg);
      return;
    }

    try {
      setError(null);
      setTranscript('');
      await SpeechRecognizer.startListening('en-US');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start voice recognition';
      setError(errorMsg);
      setAppError(errorMsg);
    }
  }, [setAppError]);

  const stopListening = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      await SpeechRecognizer.stopListening();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to stop voice recognition';
      setError(errorMsg);
      setAppError(errorMsg);
    }
  }, [setAppError]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
};
