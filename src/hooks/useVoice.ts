import { useState, useCallback, useEffect } from 'react';
import { NativeModules, Platform, NativeEventEmitter, PermissionsAndroid } from 'react-native';
import { useAppStore } from '../store/useAppStore';

const { SpeechRecognizer } = NativeModules;

interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  hasPermission: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearTranscript: () => void;
}

export const useVoice = (): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const setAppError = useAppStore((state) => state.setError);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const checkPermission = async () => {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        setHasPermission(granted);
      } catch (err) {
        console.error('Permission check error:', err);
      }
    };

    checkPermission();

    const eventEmitter = new NativeEventEmitter(SpeechRecognizer);

    const subscriptions = [
      eventEmitter.addListener('onSpeechStart', () => {
        console.log('[useVoice] onSpeechStart');
        setIsListening(true);
        setError(null);
      }),
      eventEmitter.addListener('onSpeechRecognized', (event: any) => {
        console.log('[useVoice] onSpeechRecognized transcript=', JSON.stringify(event.transcript));
        setTranscript(event.transcript || '');
      }),
      eventEmitter.addListener('onSpeechError', (event: any) => {
        const errorMsg = event.error || 'Speech recognition error';
        console.log('[useVoice] onSpeechError', errorMsg);
        setError(errorMsg);
        setAppError(errorMsg);
        setIsListening(false);
      }),
      eventEmitter.addListener('onSpeechEnd', () => {
        console.log('[useVoice] onSpeechEnd');
        setIsListening(false);
      }),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [setAppError]);

  const startListening = useCallback(async () => {
    console.log('startListening called');
    if (Platform.OS !== 'android') {
      const errorMsg = 'Speech recognition only available on Android';
      console.log('Not Android:', errorMsg);
      setError(errorMsg);
      setAppError(errorMsg);
      return;
    }

    try {
      let granted = hasPermission;
      console.log('hasPermission:', granted);

      if (!granted) {
        console.log('Requesting RECORD_AUDIO permission');
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Drift needs access to your microphone to listen to your voice commands.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
        console.log('Permission result:', result, 'granted:', granted);
        setHasPermission(granted);
      }

      if (!granted) {
        const errorMsg = 'Microphone permission denied';
        console.log(errorMsg);
        setError(errorMsg);
        setAppError(errorMsg);
        return;
      }

      console.log('Calling SpeechRecognizer.startListening');
      setError(null);
      setTranscript('');
      setIsListening(true);
      await SpeechRecognizer.startListening('en-US');
      console.log('SpeechRecognizer.startListening called successfully');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start voice recognition';
      console.log('Error in startListening:', errorMsg);
      setError(errorMsg);
      setAppError(errorMsg);
      setIsListening(false);
    }
  }, [hasPermission, setAppError]);

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
    hasPermission,
    startListening,
    stopListening,
    clearTranscript,
  };
};
