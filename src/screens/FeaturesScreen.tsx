import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { fonts } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Features'>;

const features = [
  {
    title: 'WhatsApp Messaging',
    body: 'Speak a message request, let DriftAI resolve the contact, and open WhatsApp with a ready-to-send drafted message.',
    example: 'Say: "Send Sahil a happy birthday text." DriftAI understands the context, finds Sahil in your contacts, and drafts a warm birthday message.',
  },
  {
    title: 'Email Drafts',
    body: 'Generate a subject and polished email body from casual instructions, then open Gmail with the draft prepared.',
    example: 'Say: "Draft an email wishing Mohit a happy birthday." DriftAI writes the subject and body, adds a sign-off, fills the recipient if found, and opens Gmail.',
  },
  {
    title: 'Instagram Smart Post',
    body: 'Pick a recent image, generate a caption and hashtags, copy the caption, and continue posting through Instagram.',
    example: 'Say: "Post my recent picture on Instagram." DriftAI selects your latest photo, creates a caption with hashtags, copies it, and opens Instagram for posting.',
  },
  {
    title: 'AI Translation',
    body: 'Translate spoken or typed text into another language and optionally hear the translated result aloud.',
    example: 'Say: "Translate I am going to school into Hindi." DriftAI shows the Hindi translation and can read it aloud.',
  },
  {
    title: 'Call Contact',
    body: 'Resolve a contact by name and start a phone call intent from a natural voice command.',
    example: 'Say: "Call Ram." DriftAI finds Ram in your contacts and starts the phone call flow.',
  },
  {
    title: 'Custom Commands',
    body: 'Create personal command phrases that map to one or more actions saved locally on the device.',
    example: 'Use the Commands screen to build your own action set, then trigger it later with a phrase you choose.',
  },
  {
    title: 'Events And Reminders',
    body: 'Create local reminders or calendar-style actions from natural requests like birthday wishes or recurring hydration nudges.',
    example: 'Say: "Remind me to drink water every four hours." DriftAI creates reminder notifications for the day.',
  },
  {
    title: 'Voice AI Chat',
    body: 'Ask questions by voice or chat and get AI responses, with optional text-to-speech playback.',
    example: 'Ask a question naturally. DriftAI answers in chat and can speak the response aloud when voice responses are enabled.',
  },
  {
    title: 'Smart Gallery Search',
    body: 'Open gallery results for date-based photo requests, such as photos from a specific day.',
    example: 'Say: "Show me photos from February 24." DriftAI opens your gallery around that date.',
  },
  {
    title: 'Multi-step Execution',
    body: 'Parse compound instructions and run action chains sequentially, including custom multi-action automations.',
    example: 'Create a command that runs multiple actions together, then trigger the full automation with one phrase.',
  },
];

export function FeaturesScreen({ navigation }: Props) {
  const t = useThemeTokens();
  const [showExamples, setShowExamples] = useState(true);
  const ExampleIcon = showExamples ? EyeOff : Eye;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: t.surface, borderColor: t.border }]}
        >
          <ChevronLeft size={20} color={t.text} />
        </Pressable>
        <Text style={[styles.title, { color: t.text, fontFamily: fonts.sans }]}>
          Features
        </Text>
        <Pressable
          onPress={() => setShowExamples((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={showExamples ? 'Hide examples' : 'Show examples'}
          style={[styles.backBtn, { backgroundColor: t.surface, borderColor: t.border }]}
        >
          <ExampleIcon size={18} color={t.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.updated, { color: t.textDim, fontFamily: fonts.mono }]}>
          DRIFTAI · MVP FEATURES
        </Text>
        {features.map((feature, index) => (
          <View key={feature.title} style={[styles.feature, { borderBottomColor: t.border }]}>
            <Text style={[styles.number, { color: t.textFaint, fontFamily: fonts.mono }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: t.text, fontFamily: fonts.sans }]}>
                {feature.title}
              </Text>
              <Text style={[styles.body, { color: t.textDim, fontFamily: fonts.sans }]}>
                {feature.body}
              </Text>
              {showExamples && (
                <Text style={[styles.example, { color: t.textDim, fontFamily: fonts.sans }]}>
                  <Text style={{ color: t.text }}>Example: </Text>
                  {feature.example}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 58,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', letterSpacing: -0.2 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 36 },
  updated: { fontSize: 10, letterSpacing: 1, marginBottom: 14 },
  feature: { flexDirection: 'row', gap: 14, borderBottomWidth: 1, paddingVertical: 16 },
  number: { width: 26, fontSize: 12, marginTop: 3 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
  example: { fontSize: 13, lineHeight: 20, marginTop: 8 },
});
