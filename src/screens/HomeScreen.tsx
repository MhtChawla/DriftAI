// src/screens/HomeScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MessageCircle } from 'lucide-react-native';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppStore } from '../store/useAppStore';
import { useMicCycle, type MicSample } from '../hooks/useMicCycle';
import { fonts, tokens } from '../theme/tokens';
import { MonoLabel } from '../components/MonoLabel';
import { GradientText } from '../components/GradientText';
import { MicButton } from '../components/MicButton';
import { Chip } from '../components/Chip';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabsParamList } from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Voice'>,
  NativeStackScreenProps<RootStackParamList>
>;

const QUICK_ACTIONS: Record<string, MicSample> = {
  'Send message': {
    transcript: 'Send Anya a message — running 10 min late.',
    response: 'Sending to Anya: "Running 10 min late." Send it?',
  },
  'Post on Instagram': {
    transcript: 'Post the studio shot from this morning to Instagram.',
    response: 'Drafting post — 1 image, caption suggested. Review?',
  },
  Translate: {
    transcript: 'Translate "thank you for everything" to French.',
    response: 'Merci pour tout — formal: « Merci pour tout cela ».',
  },
  'Call contact': {
    transcript: 'Call mom on speakerphone.',
    response: 'Calling Mom on speakerphone…',
  },
};

export function HomeScreen({ navigation }: Props) {
  const t = useThemeTokens();
  const name = useAppStore((s) => s.user.name);
  const vizStyle = useAppStore((s) => s.vizStyle);
  const { state, transcript, response, tap, runSample } = useMicCycle();

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
        .toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })
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
        <View style={{ marginTop: 12, }}>
          <MonoLabel>{today}</MonoLabel>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text
              style={[
                styles.greeting,
                { color: t.text, fontFamily: fonts.sans, lineHeight: 50 },
              ]}
            >
              {greeting},{' '}
            </Text>
            <GradientText style={[styles.greeting, { height: 50 }]}>{name}</GradientText>.

          </View>
          <Text
            style={[styles.subtitle, { color: t.textDim, fontFamily: fonts.sans }]}
          >
            What can I help you with?
          </Text>
        </View>

        {/* mic */}
        <View style={styles.micWrap}>
          <MicButton state={state} viz={vizStyle} onTap={tap} />
        </View>

        {/* transcript / response */}
        <View style={styles.tBlock}>
          {!!transcript && (
            <View
              style={[
                styles.card,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              <MonoLabel style={{ fontSize: 9.5 }}>YOU · TRANSCRIBING</MonoLabel>
              <Text style={[styles.cardText, { color: t.text }]}>{transcript}</Text>
            </View>
          )}
          {!!response && (
            <LinearGradient
              colors={['rgba(91,140,255,0.10)', 'rgba(168,85,247,0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.card,
                { borderColor: 'rgba(91,140,255,0.3)', borderWidth: 1 },
              ]}
            >
              <MonoLabel style={{ fontSize: 9.5, color: tokens.accent1 }}>
                DRIFT · REPLY
              </MonoLabel>
              <Text style={[styles.cardText, { color: t.text }]}>{response}</Text>
            </LinearGradient>
          )}
          {!transcript && !response && state === 'idle' && (
            <View style={{ alignItems: 'center', opacity: 0.5 }}>
              <MonoLabel style={{ fontSize: 10 }}>
                TAP · HOLD · OR SAY "HEY DRIF"
              </MonoLabel>
            </View>
          )}
        </View>

        {/* chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 24 }}
          style={{ marginTop: 4 }}
        >
          {Object.keys(QUICK_ACTIONS).map((label) => (
            <Chip
              key={label}
              label={label}
              onPress={() => state === 'idle' && runSample(QUICK_ACTIONS[label])}
            />
          ))}
        </ScrollView>
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
  cardText: {
    fontSize: 15,
    letterSpacing: -0.2,
    lineHeight: 21,
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
