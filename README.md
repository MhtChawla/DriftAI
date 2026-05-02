![DriftAI Screenshots](screenshots.png)

# Drift AI

**Voice-first AI assistant for iOS & Android.**
Speak naturally — Drift resolves your intent into real actions: send WhatsApp messages, draft emails, set reminders, call contacts, and more. Powered by OpenAI.

---

## Tech Stack

| | |
|---|---|
| React Native | 0.85.2 (New Architecture) |
| React | 19.2.3 |
| TypeScript | 5.8.3 |
| State | Zustand |
| Storage | react-native-mmkv |
| Navigation | React Navigation v7 |
| AI | OpenAI (gpt-3.5-turbo) |

---

## Prerequisites

- Node ≥ 22.11.0
- React Native environment set up: [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment)
- Android Studio (for Android) or Xcode (for iOS)

---

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. iOS — install CocoaPods

```sh
bundle install
bundle exec pod install
```

### 3. Start Metro

```sh
npm start
```

### 4. Run the app

```sh
# Android
npm run android

# iOS
npm run ios
```

---

## Project Structure

```
DriftAI/
├── App.tsx                   # Entry point
├── src/
│   ├── screens/              # HomeScreen, ChatScreen, CommandsScreen, SettingsScreen
│   ├── components/           # MicButton, GradientText, Chip, Toggle, TypingDots
│   ├── hooks/                # useVoice, useMicCycle, useThemeTokens, useNotifications, ...
│   ├── store/                # Zustand global store
│   ├── navigation/           # RootNavigator (stack + floating tab bar)
│   ├── theme/                # Design tokens (dark / light)
│   └── utils/                # Axios client, OpenAI client, MMKV storage helpers
└── android/                  # Native Android STT bridge (SpeechRecognizerModule.kt)
```

---

## Key Features

- **Voice commands** — native Android SpeechRecognizer bridge; iOS planned
- **Custom commands** — create trigger phrases mapped to actions (WhatsApp, timer, etc.)
- **Chat history** — full conversation view with typing indicators
- **Theming** — dark / light mode, accent color, mic visualizer styles (rings / orb / bars)
- **Settings** — permissions, AI response style, language, profile

---

## Configuration

Add your OpenAI API key in the app's Settings screen. The key is stored in-memory (MMKV persistence coming soon).

---

## Development Notes

| Feature | Status |
|---|---|
| Navigation & theming | Complete |
| Custom commands CRUD | Complete (in-memory) |
| Mic animations | Complete |
| Android STT module | Built — not yet wired to HomeScreen |
| Real OpenAI calls | Not yet wired to screens |
| iOS voice recognition | Not implemented |
| API key persistence | Planned (MMKV) |

---

## Troubleshooting

See the React Native [Troubleshooting](https://reactnative.dev/docs/troubleshooting) guide for common environment issues.

---

## License

Private — Drift Labs.
