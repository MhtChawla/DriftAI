// App.tsx
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/useAppStore';
import { useStartupPermissions } from './src/hooks/useStartupPermissions';
import { fonts, tokens } from './src/theme/tokens';

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const name = useAppStore((s) => s.user.name);
  const apiKey = useAppStore((s) => s.apiKey);
  const apiKeyHydrated = useAppStore((s) => s.apiKeyHydrated);
  const hydrateApiKey = useAppStore((s) => s.hydrateApiKey);
  const setName = useAppStore((s) => s.setName);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const [draftName, setDraftName] = React.useState(name);
  const [draftApiKey, setDraftApiKey] = React.useState(apiKey ?? '');
  const [isSavingSetup, setIsSavingSetup] = React.useState(false);
  const needsSetup = apiKeyHydrated && (!name.trim() || !apiKey?.trim());

  useStartupPermissions();

  React.useEffect(() => {
    hydrateApiKey();
  }, [hydrateApiKey]);

  React.useEffect(() => {
    setDraftName(name);
  }, [name]);

  React.useEffect(() => {
    if (apiKey) {
      setDraftApiKey(apiKey);
    }
  }, [apiKey]);

  const saveSetup = async () => {
    const cleanName = draftName.trim();
    const cleanApiKey = draftApiKey.trim() || apiKey?.trim() || '';

    if (!cleanName) {
      Alert.alert('Name required', 'Enter your name to personalize Drif.');
      return;
    }

    if (!cleanApiKey.startsWith('sk-')) {
      Alert.alert('API key required', 'Paste a valid OpenAI API key that starts with sk-.');
      return;
    }

    try {
      setIsSavingSetup(true);
      setName(cleanName);
      await setApiKey(cleanApiKey);
    } catch {
      Alert.alert('Could not save', 'DriftAI could not store your API key securely.');
    } finally {
      setIsSavingSetup(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <RootNavigator />
        <Modal visible={needsSetup} animationType="fade" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.setupBackdrop}
          >
            <View style={styles.setupCard}>
              <Text style={styles.setupEyebrow}>DRIFTAI SETUP</Text>
              <Text style={styles.setupTitle}>Tell Drif who you are</Text>
              <Text style={styles.setupSubtitle}>
                Your name and OpenAI API key stay saved on this device.
              </Text>

              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Your name"
                placeholderTextColor="rgba(255,255,255,0.38)"
                autoCapitalize="words"
                style={styles.setupInput}
              />
              <TextInput
                value={draftApiKey}
                onChangeText={setDraftApiKey}
                placeholder="OpenAI API key"
                placeholderTextColor="rgba(255,255,255,0.38)"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={styles.setupInput}
              />

              <Pressable
                onPress={saveSetup}
                style={[styles.setupButton, isSavingSetup && styles.setupButtonDisabled]}
                disabled={isSavingSetup}
              >
                <Text style={styles.setupButtonText}>
                  {isSavingSetup ? 'Saving...' : 'Continue'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  setupBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(5,8,18,0.82)',
  },
  setupCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#101525',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  setupEyebrow: {
    color: tokens.accent1,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
  },
  setupTitle: {
    color: '#fff',
    fontFamily: fonts.sans,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  setupSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  setupInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    paddingHorizontal: 14,
    marginBottom: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  setupButton: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.accent1,
    marginTop: 4,
  },
  setupButtonDisabled: {
    opacity: 0.7,
  },
  setupButtonText: {
    color: '#fff',
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '700',
  },
});
