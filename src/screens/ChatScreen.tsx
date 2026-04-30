// src/screens/ChatScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  InteractionManager,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, Send, Trash2 } from 'lucide-react-native';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppStore, type ChatMessage } from '../store/useAppStore';
import { fonts, tokens } from '../theme/tokens';
import { MonoLabel } from '../components/MonoLabel';
import { TypingDots } from '../components/TypingDots';
import { parseVoiceIntent } from '../utils/api/intentParser';
import { executeActions } from '../engine/actionEngine';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation }: Props) {
  const t = useThemeTokens();
  const messages = useAppStore((s) => s.messages);
  const addMessage = useAppStore((s) => s.addMessage);
  const clearMessages = useAppStore((s) => s.clearMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let alive = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (alive) scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => {
      alive = false;
      task.cancel();
    };
  }, [messages.length, typing]);

  const send = useCallback(async () => {
    const v = input.trim();
    if (!v) return;
    setInput('');
    // Show user message immediately
    addMessage({ role: 'user', text: v });
    setTyping(true);
    try {
      const result = await parseVoiceIntent(v);
      if (result.actions.length) {
        const hasChat = result.actions.some(a => a.type === 'chat');
        const executionResults = await executeActions(result.actions);
        if (!hasChat) {
          const statusText = executionResults.map(r => r.message).filter(Boolean).join('\n');
          addMessage({ role: 'ai', text: statusText || 'Done.' });
        }
      } else {
        addMessage({ role: 'ai', text: "I heard you, but couldn't find an action for that." });
      }
    } catch (err: any) {
      addMessage({ role: 'ai', text: `Error: ${err?.message || 'Something went wrong'}` });
    } finally {
      setTyping(false);
    }
  }, [input, addMessage]);

  const confirmClear = useCallback(() => {
    Alert.alert('Clear conversation', 'This will delete all messages.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearMessages },
    ]);
  }, [clearMessages]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"          // use "padding" not "height" with WindowCompat false
        keyboardVerticalOffset={0}
      >
        {/* header */}
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <ChevronLeft size={20} color={t.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerTitle}>
              <LinearGradient
                colors={[tokens.accent1, tokens.accent2]}
                style={styles.dot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={[styles.title, { color: t.text, fontFamily: fonts.sans }]}>
                Drift
              </Text>
            </View>
            <MonoLabel style={{ fontSize: 9.5, marginTop: 2 }}>
              ONLINE · GPT-VOICE
            </MonoLabel>
          </View>
          <Pressable
            onPress={confirmClear}
            style={[styles.backBtn, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <Trash2 size={18} color={t.textDim} />
          </Pressable>
        </View>

        {/* messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.msgList}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          {typing && <TypingBubble />}
        </ScrollView>

        {/* input bar */}
        <View style={[styles.inputBar, { backgroundColor: t.bg, borderTopColor: t.border }]}>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: t.surface, borderColor: t.border },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              placeholder="Message Drift…"
              placeholderTextColor={t.textFaint}
              returnKeyType="send"
              blurOnSubmit={false}
              style={[
                styles.input,
                { color: t.text, fontFamily: fonts.sans },
              ]}
            />
          </View>
          <Pressable
            onPress={send}
            disabled={!input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, opacity: 0.5 },
            ]}
          >
            {input.trim() ? (
              <LinearGradient
                colors={[tokens.accent1, tokens.accent2]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            ) : null}
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Bubble = React.memo(function Bubble({ msg }: { msg: ChatMessage }) {
  const t = useThemeTokens();
  const me = msg.role === 'user';
  if (me) {
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '78%' }}>
        <LinearGradient
          colors={[tokens.accent1, tokens.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleMe]}
        >
          <Text style={[styles.bubbleText, { color: '#fff', fontFamily: fonts.sans }]}>
            {msg.text}
          </Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.bubble,
        styles.bubbleAi,
        { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, maxWidth: '78%' },
      ]}
    >
      <Text style={[styles.bubbleText, { color: t.text, fontFamily: fonts.sans }]}>
        {msg.text}
      </Text>
    </View>
  );
});

const TypingBubble = React.memo(function TypingBubble() {
  const t = useThemeTokens();
  return (
    <View
      style={[
        styles.bubble,
        styles.bubbleAi,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: 1,
          alignSelf: 'flex-start',
          paddingVertical: 12,
        },
      ]}
    >
      <TypingDots />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  msgList: { padding: 14, gap: 10 },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  bubbleMe: { borderBottomRightRadius: 6 },
  bubbleAi: { borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  bubbleText: { fontSize: 15, lineHeight: 21, letterSpacing: -0.2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});