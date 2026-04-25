# Package Installation & Configuration Guide

All 9 packages have been installed and configured. Here's what was set up:

## Installed Packages

### State Management
- **Zustand** - Lightweight state management
  - Location: `src/store/appStore.ts`
  - Usage: `useAppStore()` hook for global app state

### Voice Recognition
- **Android SpeechRecognizer (Native)** - Built-in offline speech-to-text
  - Uses Android's native SpeechRecognizer API
  - No external dependencies required
  - Location: `src/hooks/useVoice.ts`
  - Native implementation: `android/app/src/main/java/com/driftai/SpeechRecognizerModule.kt`
  - Usage: `useVoice()` hook for voice input
  - Requires: 
    - `android.permission.RECORD_AUDIO` (already added to AndroidManifest.xml)
    - Runtime permission request for microphone access

### HTTP Client & Caching
- **axios** - HTTP requests with built-in cache for OpenAI APIs
  - Location: `src/utils/api/axiosClient.ts` (core client)
  - Location: `src/utils/api/openaiClient.ts` (OpenAI wrapper)
  - Usage: `createChatCompletion()` for API calls with automatic caching
  - Features: 5-minute cache, request/response interceptors

### Storage
- **react-native-mmkv** - Fast key-value storage
  - Location: `src/utils/storage/mmkvStorage.ts`
  - Methods: `setItem()`, `getItem()`, `removeItem()`, `clear()`, `getAllKeys()`

### Navigation
- **@react-navigation/native** - Screen navigation management
  - Location: `src/navigation/navigationConfig.ts`
  - Includes: Type definitions, themes, screen options
  - Requires: Install `@react-navigation/native-stack` separately for stack navigation

### Native Features
- **react-native-contacts** - Access device contacts
  - Location: `src/hooks/useContacts.ts`
  - Usage: `useContacts()` hook with permission handling
  - Requires: Contacts permission configuration in native code

- **react-native-share** - Share content with other apps
  - Location: `src/hooks/useShare.ts`
  - Usage: `useShare()` hook for sharing text/URLs

- **react-native-image-picker** - Camera & photo library access
  - Location: `src/hooks/useImagePicker.ts`
  - Usage: `useImagePicker()` hook for picking/taking photos
  - Requires: Camera & photo library permissions

### Notifications
- **@notifee/react-native** - Local & remote push notifications
  - Location: `src/hooks/useNotifications.ts`
  - Usage: `useNotifications()` hook for sending notifications
  - Features: Foreground/background event handling, scheduled notifications

## Project Structure Created

```
src/
├── utils/
│   ├── api/
│   │   ├── axiosClient.ts       (HTTP client with caching)
│   │   └── openaiClient.ts      (OpenAI API wrapper)
│   └── storage/
│       └── mmkvStorage.ts       (Storage utilities)
├── store/
│   └── appStore.ts              (Zustand global state)
├── hooks/
│   ├── useVoice.ts              (Voice recognition)
│   ├── useImagePicker.ts        (Image/camera picker)
│   ├── useContacts.ts           (Contacts access)
│   ├── useNotifications.ts      (Notifications)
│   └── useShare.ts              (Share functionality)
└── navigation/
    └── navigationConfig.ts      (Navigation setup)
```

## Next Steps

### 1. Install Missing Navigation Dependencies
```bash
npm install @react-navigation/native-stack
```

### 2. Native Code Setup (iOS)
In `ios/Podfile`, ensure these are included:
- For contacts: Add `use_frameworks!`
- Run `cd ios && pod install`
- **Note**: Voice recognition not yet implemented for iOS (Android-only for now)

### 3. Native Code Setup (Android)
Android is already configured:
- ✅ `SpeechRecognizerModule.kt` - Native module bridge
- ✅ `SpeechRecognizerPackage.kt` - Package registration
- ✅ Registered in `MainApplication.kt`
- ✅ RECORD_AUDIO permission added to `AndroidManifest.xml`

Ensure `android/app/build.gradle` has:
```gradle
android {
  ...
  defaultConfig {
    minSdkVersion 21
  }
}
```

### 4. Usage Example

```typescript
import { useAppStore } from './src/store/appStore';
import { useVoice } from './src/hooks/useVoice';
import { useImagePicker } from './src/hooks/useImagePicker';
import { createChatCompletion } from './src/utils/api/openaiClient';
import { setItem, getItem } from './src/utils/storage/mmkvStorage';
import { PermissionsAndroid, Platform } from 'react-native';

// In your component
const { setApiKey } = useAppStore();
const { startListening, stopListening, transcript, isListening, error } = useVoice();
const { pickFromLibrary, image } = useImagePicker();

// Request microphone permission (Android)
const requestMicrophonePermission = async () => {
  if (Platform.OS === 'android') {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'We need access to your microphone for voice input.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return permission === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

// Use voice recognition
const handleStartListening = async () => {
  const hasPermission = await requestMicrophonePermission();
  if (hasPermission) {
    await startListening();
  }
};

const handleStopListening = async () => {
  await stopListening();
  console.log('Transcript:', transcript);
};

// Make API calls
const response = await createChatCompletion(
  {
    messages: [{ role: 'user', content: 'Hello' }],
  },
  apiKey
);

// Use storage
setItem('userPreferences', { theme: 'dark' });
const prefs = getItem('userPreferences');
```

### 5. Security Notes
- Store all API keys securely using MMKV with encryption if possible
- Don't commit `.env` files with API keys
- Use HTTPS for all API requests
- Always request microphone permission before accessing voice recognition on Android
- Audio processing happens locally (offline) - no cloud uploads

## Audit Notes
⚠️ Security audit warnings detected. Run `npm audit fix` to address vulnerabilities when ready.

## Migration Notes
- **Removed**: `@react-native-voice/voice` (deprecated package)
- **Removed**: `@picovoice/cheetah-react-native` (paid service - not used)
- **Removed**: `@picovoice/react-native-voice-processor`
- **Added**: Native Android SpeechRecognizer module (free, built-in, offline)
- **Updated**: `src/hooks/useVoice.ts` with Android native bridge
- **Created**: `android/app/src/main/java/com/driftai/SpeechRecognizerModule.kt`
- **Created**: `android/app/src/main/java/com/driftai/SpeechRecognizerPackage.kt`
- **Updated**: `android/app/src/main/java/com/driftai/MainApplication.kt` to register module
- **Updated**: `android/app/src/main/AndroidManifest.xml` with RECORD_AUDIO permission
