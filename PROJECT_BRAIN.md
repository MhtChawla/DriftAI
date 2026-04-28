# DriftAI Project Brain

Last updated: 2026-04-29

This file is a fast-start memory for Codex/AI agents working in this repo. Read this before scanning the project from scratch.

## Prime Directive

- Product name: DriftAI.
- Assistant name in the app: Drif.
- This is a React Native AI voice assistant for intent parsing and actions such as WhatsApp messages, calls, email drafts, Instagram posts, translations, reminders, and AI chat.
- Keep `secrets.ts` local. Do not print, copy, or commit API keys.
- `CLAUDE.md` is useful but partly stale. Prefer this file plus live source when they disagree.

## Current Shape

DriftAI is a React Native 0.85.2 app with React 19.2.3, TypeScript, Zustand state, React Navigation, native Android speech recognition, and OpenAI chat completions helpers.

The app currently has:

- Main voice screen wired to Android speech recognition through `useVoice`.
- OpenAI intent parsing wired from `HomeScreen` through `parseVoiceIntent`.
- Chat screen UI with mock replies only.
- Commands CRUD UI backed by in-memory Zustand state.
- Settings UI with runtime permission toggles.
- Hooks ready for contacts, image picker, notifications, sharing, and MMKV storage.
- iOS voice recognition not implemented.

## Entry Points

- `index.js`: React Native app registration.
- `App.tsx`: wraps the app in `GestureHandlerRootView`, `SafeAreaProvider`, `StatusBar`, calls `useStartupPermissions()`, and renders `RootNavigator`.
- `src/navigation/RootNavigator.tsx`: stack + tabs.
- `src/screens/HomeScreen.tsx`: main voice tab.
- `src/screens/ChatScreen.tsx`: stack chat screen opened by the Home FAB.
- `src/screens/CommandsScreen.tsx`: command list and create/edit modal.
- `src/screens/SettingsScreen.tsx`: permissions, AI style, theme, profile/about settings.

## Navigation Map

`RootNavigator` creates:

```text
NavigationContainer
`-- Stack
    |-- Tabs
    |   |-- Voice -> HomeScreen
    |   |-- Commands -> CommandsScreen
    |   `-- Settings -> SettingsScreen
    `-- Chat -> ChatScreen
```

The bottom tab bar is custom, floating, gradient-on-active, and lives in `src/navigation/RootNavigator.tsx`.

## State Model

State lives in `src/store/useAppStore.ts`.

Important types:

- `Theme`: `dark | light`
- `VizStyle`: `rings | bars | orb`
- `ResponseStyle`: `short | balanced | detailed`
- `ChatMessage`: `{ id, role: 'user' | 'ai', text, ts }`
- `Command`: `{ id, name, phrase, desc, actions, enabled }`
- `Permissions`: `{ mic, contacts, notifications, media }`

Current defaults:

- User name: `Mohit`
- Theme: `dark`
- Viz style: `rings`
- Permissions: mic and contacts true, notifications and media false.
- Response style: `balanced`
- Language: `English (US)`
- Seed commands: Gym Mode, Wind Down, Standup Brief.
- Seed message: "Hey Mohit. What's on your mind?"

State is not persisted yet. `apiKey`, commands, settings, and messages reset on reload.

## Design System

Theme tokens are in `src/theme/tokens.ts`.

- Dark tokens: `tokens`
- Light tokens: `tokensLight`
- Hook: `useThemeTokens()`
- Fonts referenced: `Inter` and `JetBrainsMono`
- Main gradient: `tokens.accent1` `#5B8CFF` to `tokens.accent2` `#A855F7`

Design convention: components should use `useThemeTokens()` instead of hardcoding app colors, except where importing explicit token accents is already the local pattern.

Known issue: `tokensLight: typeof tokens` is too narrow because `tokens` uses `as const`; TypeScript currently rejects the alternate literal values.

## Voice And Intent Flow

Current Home flow:

1. User taps `MicButton` in `src/screens/HomeScreen.tsx`.
2. `useVoice()` starts Android native speech recognition.
3. Native module emits speech events from `android/app/src/main/java/com/driftai/SpeechRecognizerModule.kt`.
4. `HomeScreen` displays transcript.
5. When listening stops and transcript is non-empty, `parseVoiceIntent(transcript)` runs.
6. `parseVoiceIntent` first tries deterministic local heuristics, then falls back to OpenAI using `createChatCompletion`.
7. Intent JSON is displayed in HomeScreen.

Files:

- `src/hooks/useVoice.ts`: Android-only speech recognition hook.
- `android/app/src/main/java/com/driftai/SpeechRecognizerModule.kt`: native Android bridge.
- `android/app/src/main/java/com/driftai/SpeechRecognizerPackage.kt`: package registration.
- `android/app/src/main/java/com/driftai/MainApplication.kt`: manually adds `SpeechRecognizerPackage`.
- `src/utils/api/intentParser.ts`: local-first intent parser plus OpenAI fallback using `gpt-4o-mini`, `response_format: json_object`, and `OPENAI_API_KEY` from `secrets.ts`.
- `src/utils/api/openaiClient.ts`: chat completions wrapper and sanitized OpenAI error messages.

Supported atomic intent types now mirror the 10 MVP features:

- `send_whatsapp`
- `draft_email`
- `instagram_post`
- `translate`
- `call_contact`
- `open_app`
- `create_reminder`
- `chat`
- `gallery_search`
- `custom_command`

Multi-step execution is represented as multiple ordered actions in `{ actions: [...] }`, not as its own action type.

Important: `parseVoiceIntent` now handles obvious local cases before calling OpenAI, including WhatsApp, calls, email drafts, translation, reminders/notes, Instagram posts, gallery search, opening apps, chat questions, custom command phrases, and simple compound commands.

## API And Secrets

- `src/utils/api/axiosClient.ts` creates an Axios client with base URL `process.env.API_BASE_URL || 'https://api.openai.com/v1'`.
- `src/utils/api/openaiClient.ts` defaults to `gpt-3.5-turbo` unless a request model is provided.
- `src/utils/api/intentParser.ts` explicitly uses `gpt-4o-mini`.
- `secrets.ts` is expected to export `OPENAI_API_KEY`.

Security notes:

- Do not reveal the value in `secrets.ts`.
- `secrets.ts` was staged at analysis time. This is risky if the repo is ever committed or pushed.
- The repo-level instruction in `CLAUDE.md` says never commit on GitHub.

## Permissions

Android manifest currently includes:

- `INTERNET`
- `RECORD_AUDIO`
- `READ_CONTACTS`
- `WRITE_CONTACTS`
- `READ_MEDIA_IMAGES`
- `READ_EXTERNAL_STORAGE` with `maxSdkVersion=32`
- `CALL_PHONE`
- `POST_NOTIFICATIONS`
- `WAKE_LOCK`

iOS `Info.plist` currently includes:

- `NSMicrophoneUsageDescription`
- `NSContactsUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSLocationWhenInUseUsageDescription` is present but empty.

Runtime permission logic:

- `src/hooks/useStartupPermissions.ts`: silently requests `CALL_PHONE` and `POST_NOTIFICATIONS` on Android startup.
- `src/hooks/usePermissions.ts`: settings toggles request mic, contacts, notifications, and media/storage. iOS branches mostly open settings or show alerts.
- `src/hooks/useVoice.ts`: independently checks/requests Android `RECORD_AUDIO`.
- `src/hooks/useContacts.ts`: imports `react-native-permissions`, which is not installed.

## Feature Status

Working or mostly working:

- Navigation shell.
- Dark/light theme switching.
- Zustand global state.
- Custom command list and add/edit modal.
- Android native speech recognition hook and bridge.
- Home transcript to OpenAI intent JSON display.
- Local-first parser for the 10 MVP intent types, with OpenAI fallback for ambiguous phrasing.
- Settings permission toggles.
- Mic visual states and animations.
- MMKV helper module, though not wired to store persistence.

Mock or incomplete:

- Chat AI replies are local keyword mock replies in `ChatScreen`.
- Commands are in-memory only and do not execute real device actions.
- Intent parser returns JSON, including local heuristics, but no action executor consumes it yet.
- API key is read from `secrets.ts`, not stored through settings or MMKV.
- iOS speech recognition is not implemented.
- Contacts hook is broken until permission dependency/type issues are fixed.
- Image picker, notifications, and share hooks exist but are not wired into user flows.
- Fonts are referenced but Inter/JetBrainsMono are not present in `UIAppFonts`.

## Current Health Checks

Commands run on 2026-04-29:

- `npm run lint -- --quiet`: passes.
- `npm test -- --runInBand`: fails because Jest does not mock/register `RNGestureHandlerModule`.
- `npx tsc --noEmit`: fails.

TypeScript failures observed:

- Missing `react-native-permissions` module from `src/hooks/useContacts.ts`.
- `react-native-contacts` contact type allows `displayName: string | null`, while local `Contact` requires `string`.
- `tokensLight: typeof tokens` rejects different literal color values.
- `process` type missing in `src/utils/api/axiosClient.ts`; likely needs `@types/node` or a different env typing strategy.
- `MMKV` is treated as type-only in `src/utils/storage/mmkvStorage.ts` under current typings/import.

Jest failure observed:

- `__tests__/App.test.tsx` fails before render due missing `RNGestureHandlerModule` mock.

## Dirty Worktree At Analysis Time

Before this file was added, git status showed user changes:

- Staged: `secrets.ts`
- Staged: `to-do.MD`
- Modified unstaged: `src/screens/HomeScreen.tsx`
- Modified unstaged: `src/utils/api/openaiClient.ts`
- Untracked: `src/utils/api/intentParser.ts`

Do not revert these unless the user explicitly asks.

## Important Existing Docs

- `CLAUDE.md`: broad project reference, but stale on permissions and Home voice/intent status.
- `features.md`: MVP feature list.
- `to-do.MD`: informal todo. Its local intent parsing note is stale because `intentParser.ts` now handles local-first parsing.
- `PACKAGES_CONFIG.md`: install/migration notes, but some paths are stale.
- `README.md`: mostly stock React Native README.

## Fast Paths For Common Work

Wire real chat AI:

- Start in `src/screens/ChatScreen.tsx`.
- Replace `aiReply()` and timeout with `createChatCompletion`.
- Decide whether to read API key from `secrets.ts`, Zustand `apiKey`, or a new persisted setting.
- Add loading/error states through local state or store.

Add local intent heuristics:

- Start in `src/utils/api/intentParser.ts`.
- Deterministic parsing already runs before `createChatCompletion`.
- Keep the return shape `{ actions: [...] }`.
- Current local cases include WhatsApp, calls, email drafts, translation, reminders/notes, Instagram posts, gallery search, opening apps, chat questions, custom commands, and simple sequential commands.
- When adding a new MVP intent, update `SUPPORTED_INTENTS`, `IntentAction`, local parser cases, and the system prompt together.

Execute parsed actions:

- Add an action executor module under `src/utils` or `src/utils/actions`.
- HomeScreen should call executor after `parseVoiceIntent`, or show a confirm step before execution.
- Likely dependencies: contacts, Linking URL schemes, notifications, share/image picker.

Persist settings and app data:

- Start in `src/store/useAppStore.ts` and `src/utils/storage/mmkvStorage.ts`.
- Consider Zustand `persist` middleware with an MMKV adapter.
- Persist at least theme, permissions preferences, response style, language, commands, and possibly messages.
- Treat API keys specially; avoid plain storage unless the user accepts that tradeoff.

Fix permissions/contact flow:

- Decide whether to install `react-native-permissions` or remove it from `useContacts.ts`.
- If keeping it, add dependency and run pods.
- If removing it, reuse `PermissionsAndroid` and iOS settings handling from `usePermissions.ts`.
- Fix nullable `displayName` typing from `react-native-contacts`.

Fix Jest:

- Add Jest setup mocks for `react-native-gesture-handler`.
- Also expect to mock native modules such as `NativeModules.SpeechRecognizer`, notifee, MMKV, and navigation/native dependencies as tests expand.

Fix TypeScript:

- Widen token typing in `src/theme/tokens.ts`.
- Add or avoid Node `process` typing in `axiosClient`.
- Fix MMKV import/usage based on installed `react-native-mmkv` version.
- Fix/remove `react-native-permissions` import.

## Package Commands

```bash
npm start
npm run android
npm run ios
npm run lint
npm test
npx tsc --noEmit
cd ios && pod install
```

Package manager note: `package-lock.json` and `yarn.lock` both exist. `CLAUDE.md` says npm is the package manager. Prefer npm unless the user says otherwise.

## What Not To Waste Time On

- Do not scan `node_modules`.
- Do not deep-read iOS/Android generated project files unless native config is the task.
- Do not trust stale docs over live source.
- Do not expose `secrets.ts`.
- Do not clean unrelated dirty git changes.
