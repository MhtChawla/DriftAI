// src/screens/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppStore } from '../store/useAppStore';
import { useVoice } from '../hooks/useVoice';
import { fonts, tokens } from '../theme/tokens';
import { MonoLabel } from '../components/MonoLabel';
import { GradientText } from '../components/GradientText';
import { MicButton } from '../components/MicButton';
import {
  parseVoiceIntent,
  type IntentParseResult,
} from '../utils/api/intentParser';
import {
  executeActions,
  type ActionExecutionResult,
} from '../engine/actionEngine';
import type { MicState } from '../hooks/useMicCycle';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  RootStackParamList,
  TabsParamList,
} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Voice'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const t = useThemeTokens();
  const name = useAppStore(s => s.user.name);
  const vizStyle = useAppStore(s => s.vizStyle);
  const { isListening, transcript, startListening, stopListening } = useVoice();
  const [intentResult, setIntentResult] = useState<IntentParseResult | null>(
    null,
  );
  const [intentError, setIntentError] = useState<string | null>(null);
  const [isParsingIntent, setIsParsingIntent] = useState(false);
  const [actionResults, setActionResults] = useState<
    ActionExecutionResult[] | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExecutingActions, setIsExecutingActions] = useState(false);
  const parsedTranscriptRef = useRef('');
  const requestIdRef = useRef(0);

  const trimmedTranscript = transcript.trim();
  const state: MicState =
    isParsingIntent || isExecutingActions
      ? 'processing'
      : isListening
        ? 'listening'
        : 'idle';

  useEffect(() => {
    if (isListening) {
      requestIdRef.current += 1;
      parsedTranscriptRef.current = '';
      setIntentResult(null);
      setIntentError(null);
      setIsParsingIntent(false);
      setActionResults(null);
      setActionError(null);
      setIsExecutingActions(false);
      return;
    }

    if (
      !trimmedTranscript ||
      parsedTranscriptRef.current === trimmedTranscript
    ) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    parsedTranscriptRef.current = trimmedTranscript;

    setIsParsingIntent(true);
    setIntentResult(null);
    setIntentError(null);
    setActionResults(null);
    setActionError(null);
    setIsExecutingActions(false);

    let didCancel = false;

    const runVoiceCommand = async () => {
      let phase: 'parse' | 'execute' = 'parse';

      try {
        const result = await parseVoiceIntent(trimmedTranscript);

        if (didCancel || requestIdRef.current !== requestId) {
          return;
        }

        setIntentResult(result);
        setIsParsingIntent(false);

        if (!result.actions.length) {
          setActionResults([]);
          return;
        }

        phase = 'execute';
        setIsExecutingActions(true);

        if (typeof executeActions !== 'function') {
          throw new Error('executeActions module not loaded — restart Metro bundler');
        }

        const executionResults = await executeActions(result.actions);

        if (didCancel || requestIdRef.current !== requestId) {
          return;
        }

        setActionResults(executionResults);

        if (result.actions.some(action => action.type === 'chat')) {
          navigation.navigate('Chat');
        }
      } catch (error: any) {
        if (didCancel || requestIdRef.current !== requestId) {
          return;
        }

        if (phase === 'parse') {
          setIntentError(error?.message || 'Failed to parse intent');
        } else {
          const detail = error?.message || String(error) || 'Failed to execute action';
          console.error('[ActionEngine]', error);
          setActionError(detail);
        }
      } finally {
        if (!didCancel && requestIdRef.current === requestId) {
          setIsParsingIntent(false);
          setIsExecutingActions(false);
        }
      }
    };

    runVoiceCommand();

    return () => {
      didCancel = true;
    };
  }, [isListening, navigation, trimmedTranscript]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Still up';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const today = useMemo(
    () =>
      new Date()
        .toLocaleDateString('en', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
        .toUpperCase(),
    [],
  );

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      {/* ambient glow */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: state === 'idle' ? tokens.accent1 : tokens.accent2,
            opacity: state === 'idle' ? 0.1 : 0.22,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* greeting */}
        <View style={{ marginTop: 12 }}>
          <MonoLabel>{today}</MonoLabel>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={[
                styles.greeting,
                { color: t.text, fontFamily: fonts.sans, lineHeight: 50 },
              ]}
            >
              {greeting},{' '}
            </Text>
            <GradientText style={[styles.greeting, { height: 50 }]}>
              {name}
            </GradientText>
          </View>
          <Text
            style={[
              styles.subtitle,
              { color: t.textDim, fontFamily: fonts.sans },
            ]}
          >
            What can I help you with?
          </Text>
        </View>

        {/* mic */}
        <View style={styles.micWrap}>
          <MicButton
            state={state}
            viz={vizStyle}
            onTap={() => {
              if (isParsingIntent || isExecutingActions) {
                return;
              }

              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
          />
        </View>

        {/* transcript */}
        <View style={styles.tBlock}>
          {!!transcript && (
            <View
              style={[
                styles.card,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              <MonoLabel style={{ fontSize: 9.5 }}>
                {isListening ? 'YOU · TRANSCRIBING' : 'YOU · TRANSCRIPT'}
              </MonoLabel>
              <Text style={[styles.cardText, { color: t.text }]}>
                {transcript}
              </Text>
            </View>
          )}
          {(isParsingIntent || intentResult || intentError) && (
            <View
              style={[
                styles.card,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <MonoLabel style={{ fontSize: 9.5 }}>
                  AI · INTENT JSON
                </MonoLabel>
                {isParsingIntent && (
                  <ActivityIndicator size="small" color={tokens.accent1} />
                )}
              </View>
              {intentError ? (
                <Text style={[styles.cardText, { color: tokens.danger }]}>
                  {intentError}
                </Text>
              ) : (
                <Text style={[styles.jsonText, { color: t.text }]}>
                  {intentResult
                    ? JSON.stringify(intentResult, null, 2)
                    : 'Parsing...'}
                </Text>
              )}
            </View>
          )}
          {(isExecutingActions || actionResults || actionError) && (
            <View
              style={[
                styles.card,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <MonoLabel style={{ fontSize: 9.5 }}>
                  AI · ACTION STATUS
                </MonoLabel>
                {isExecutingActions && (
                  <ActivityIndicator size="small" color={tokens.accent1} />
                )}
              </View>
              {actionError ? (
                <Text style={[styles.cardText, { color: tokens.danger }]}>
                  {actionError}
                </Text>
              ) : (
                <Text style={[styles.cardText, { color: t.text }]}>
                  {actionResults
                    ? actionResults.length
                      ? actionResults.map(result => result.message).join('\n')
                      : 'No executable actions found'
                    : 'Executing...'}
                </Text>
              )}
            </View>
          )}
          {!transcript && state === 'idle' && (
            <View style={{ alignItems: 'center', opacity: 0.5 }}>
              <MonoLabel style={{ fontSize: 10 }}>
                TAP TO START LISTENING
              </MonoLabel>
            </View>
          )}
        </View>
      </ScrollView>

      {/* floating chat FAB */}
      <Pressable
        onPress={() => navigation.navigate('Chat')}
        style={[
          styles.fab,
          { backgroundColor: t.surface2, borderColor: t.borderStrong },
        ]}
      >
        <MessageCircle size={22} color={t.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  glow: {
    position: 'absolute',
    top: '20%',
    alignSelf: 'center',
    width: 520,
    height: 520,
    borderRadius: 260,
  },
  scroll: { padding: 24, paddingBottom: 130 },
  greeting: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.8,
    marginTop: 6,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: -0.2,
    marginTop: 6,
  },
  micWrap: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tBlock: { minHeight: 92, marginBottom: 16, gap: 10 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardText: {
    fontSize: 15,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  jsonText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});
