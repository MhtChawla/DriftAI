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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppStore } from '../store/useAppStore';
import { useVoice } from '../hooks/useVoice';
import { fonts, tokens } from '../theme/tokens';
import { getItem, setItem } from '../utils/storage/mmkvStorage';
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

type QuickstartPick = {
  label: string;
  spokenText: string;
  actionType: IntentParseResult['actions'][number]['type'];
  reply: string;
  replyKind: 'chat' | 'status';
};

const QUICKSTART_SEEN_KEY = 'home_quickstart_seen';

const QUICKSTART_PICKS: QuickstartPick[] = [
  {
    label: 'Ask Drif',
    spokenText: 'What can you help me with?',
    actionType: 'chat',
    reply: 'I can answer questions, translate text, draft messages, set reminders, open apps, and run your saved command routines.',
    replyKind: 'chat',
  },
  {
    label: 'Translate',
    spokenText: 'Translate good morning to Hindi',
    actionType: 'translate',
    reply: 'In Hindi: Good morning becomes "Suprabhat".',
    replyKind: 'status',
  },
  {
    label: 'Reminder',
    spokenText: 'Remind me to drink water in 20 minutes',
    actionType: 'create_reminder',
    reply: 'Demo: Drif would create a reminder for "drink water" in 20 minutes.',
    replyKind: 'status',
  },
  {
    label: 'WhatsApp',
    spokenText: 'Send Rahul a WhatsApp saying I am running late',
    actionType: 'send_whatsapp',
    reply: 'Demo: Drif would open WhatsApp with the message ready for Rahul.',
    replyKind: 'status',
  },
];

export function HomeScreen({ navigation }: Props) {
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const name = useAppStore(s => s.user.name);
  const vizStyle = useAppStore(s => s.vizStyle);
  const { isListening, transcript, startListening, stopListening } = useVoice();
  const [showQuickstart, setShowQuickstart] = useState(
    () => !getItem<boolean>(QUICKSTART_SEEN_KEY),
  );
  const [demoTranscript, setDemoTranscript] = useState('');
  const [intentResult, setIntentResult] = useState<IntentParseResult | null>(
    null,
  );
  const [_intentError, setIntentError] = useState<string | null>(null);
  const [isParsingIntent, setIsParsingIntent] = useState(false);
  const [actionResults, setActionResults] = useState<
    ActionExecutionResult[] | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExecutingActions, setIsExecutingActions] = useState(false);
  const parsedTranscriptRef = useRef('');
  const requestIdRef = useRef(0);

  const addMessage = useAppStore(s => s.addMessage);
  const displayedTranscript = demoTranscript || transcript;
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
      setDemoTranscript('');
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
          // save transcript + fallback AI message to chat
          addMessage({ role: 'user', text: trimmedTranscript });
          addMessage({ role: 'ai', text: "I heard you, but couldn't find an action for that." });
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

        // handleChat in actionEngine already saves user+ai messages for chat actions.
        // For non-chat actions, save transcript + status as messages here.
        const hasChat = result.actions.some(a => a.type === 'chat');
        if (!hasChat) {
          addMessage({ role: 'user', text: trimmedTranscript });
          const statusText = executionResults.map(r => r.message).filter(Boolean).join('\n');
          if (statusText) {
            addMessage({ role: 'ai', text: statusText });
          }
        }
      } catch (error: any) {
        if (didCancel || requestIdRef.current !== requestId) {
          return;
        }

        if (phase === 'parse') {
          setIntentError(error?.message || 'Failed to parse intent');
          addMessage({ role: 'user', text: trimmedTranscript });
          addMessage({ role: 'ai', text: `Error: ${error?.message || 'Failed to parse intent'}` });
        } else {
          const detail = error?.message || String(error) || 'Failed to execute action';
          console.error('[ActionEngine]', error);
          setActionError(detail);
          addMessage({ role: 'ai', text: `Error: ${detail}` });
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
  }, [addMessage, isListening, navigation, trimmedTranscript]);

  const hideQuickstart = () => {
    setItem(QUICKSTART_SEEN_KEY, true);
    setShowQuickstart(false);
  };

  const playQuickstartDemo = (pick: QuickstartPick) => {
    if (isListening || isParsingIntent || isExecutingActions) {
      return;
    }

    requestIdRef.current += 1;
    parsedTranscriptRef.current = '';
    hideQuickstart();
    setDemoTranscript(pick.spokenText);
    setIntentError(null);
    setActionError(null);
    setIsParsingIntent(false);
    setIsExecutingActions(false);
    setIntentResult({
      actions: [{ type: pick.actionType, text: pick.spokenText }],
    });
    setActionResults([
      {
        type: pick.replyKind === 'chat' ? 'chat' : pick.actionType,
        message: pick.reply,
      },
    ]);
  };

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

        {showQuickstart && state === 'idle' && !displayedTranscript && !actionResults && (
          <View
            style={[
              styles.quickstart,
              { backgroundColor: t.surface, borderColor: t.border },
            ]}
          >
            <View style={styles.quickstartHeader}>
              <View>
                <MonoLabel style={{ fontSize: 9.5, color: tokens.accent1 }}>
                  QUICKSTART
                </MonoLabel>
                <Text style={[styles.quickstartTitle, { color: t.text }]}>
                  Tap a demo command
                </Text>
              </View>
              <Pressable onPress={hideQuickstart} hitSlop={12}>
                <Text style={[styles.quickstartSkip, { color: t.textDim }]}>
                  Hide
                </Text>
              </Pressable>
            </View>
            <View style={styles.quickstartPicks}>
              {QUICKSTART_PICKS.map(pick => (
                <Pressable
                  key={pick.label}
                  onPress={() => playQuickstartDemo(pick)}
                  style={[
                    styles.quickstartPick,
                    { backgroundColor: t.surface2, borderColor: t.borderStrong },
                  ]}
                >
                  <Text style={[styles.quickstartPickLabel, { color: t.text }]}>
                    {pick.label}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.quickstartPickText, { color: t.textDim }]}
                  >
                    "{pick.spokenText}"
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* transcript */}
        <View style={styles.tBlock}>
          {!!displayedTranscript && (
            <View
              style={[
                styles.card,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              <MonoLabel style={{ fontSize: 9.5 }}>
                {isListening ? 'YOU · TRANSCRIBING' : demoTranscript ? 'DEMO · SPOKEN TEXT' : 'YOU · TRANSCRIPT'}
              </MonoLabel>
              <Text style={[styles.cardText, styles.transcriptText, { color: t.text }]}>
                {displayedTranscript}
              </Text>
            </View>
          )}
          {/*
          {(isParsingIntent || intentResult || _intentError) && (
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
              {_intentError ? (
                <Text style={[styles.cardText, { color: tokens.danger }]}>
                  {_intentError}
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
          */}
          {(isExecutingActions || actionResults || actionError) && (() => {
            const chatResult = actionResults?.find(r => r.type === 'chat');
            const nonChatResults = actionResults?.filter(r => r.type !== 'chat') ?? [];
            const isChatOnly = intentResult?.actions.every(a => a.type === 'chat');

            return (
              <>
                {/* AI voice response card for chat */}
                {(isExecutingActions && isChatOnly || chatResult) && (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: t.surface2, borderColor: tokens.accent1 + '44', borderWidth: 1.5 },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <MonoLabel style={{ fontSize: 9.5, color: tokens.accent1 }}>
                        DRIF · RESPONSE
                      </MonoLabel>
                      {isExecutingActions && isChatOnly && (
                        <ActivityIndicator size="small" color={tokens.accent1} />
                      )}
                    </View>
                    <Text style={[styles.cardText, { color: t.text }]}>
                      {chatResult ? chatResult.message || '...' : 'Thinking...'}
                    </Text>
                  </View>
                )}

                {/* Status card for non-chat actions */}
                {(!isChatOnly || nonChatResults.length > 0 || (actionError && !chatResult)) && (
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
                      {isExecutingActions && !isChatOnly && (
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
                          ? nonChatResults.length
                            ? nonChatResults.map(r => r.message).join('\n')
                            : 'No executable actions found'
                          : 'Executing...'}
                      </Text>
                    )}
                  </View>
                )}
              </>
            );
          })()}
          {!displayedTranscript && state === 'idle' && !showQuickstart && (
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
          {
            backgroundColor: t.surface2,
            borderColor: t.borderStrong,
            bottom: Math.max(22, insets.bottom + 12) + 78,
          },
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
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickstart: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
    padding: 14,
  },
  quickstartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  quickstartTitle: {
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
  },
  quickstartSkip: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  quickstartPicks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickstartPick: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48%',
  },
  quickstartPickLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  quickstartPickText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
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
  transcriptText: {
    textTransform: 'capitalize',
  },
  jsonText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
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
