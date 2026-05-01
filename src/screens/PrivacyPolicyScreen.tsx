import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { fonts } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const sections = [
  {
    title: 'What DriftAI Uses',
    body: 'DriftAI uses your microphone to turn voice into text, contacts to help prepare calls or messages, notifications for reminders, and media access when you ask the app to work with photos or files.',
  },
  {
    title: 'Voice, Chat, And Commands',
    body: 'Voice transcripts and chat messages are used to understand your intent and perform requested actions such as drafting emails, preparing WhatsApp messages, translating text, creating reminders, or answering questions.',
  },
  {
    title: 'Local Storage',
    body: 'Settings, permission states, saved commands, and conversation history are stored locally on your device so the app can remember your preferences between launches.',
  },
  {
    title: 'AI Processing',
    body: 'When a request needs AI interpretation or a generated response, relevant text may be sent to the configured AI service. DriftAI does not intentionally send your full device data; it sends only what is needed to complete the action you asked for.',
  },
  {
    title: 'Your Control',
    body: 'You can clear conversation history from Settings. Device permissions can be reviewed or revoked from your system settings at any time.',
  },
];

export function PrivacyPolicyScreen({ navigation }: Props) {
  const t = useThemeTokens();

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
          Privacy Policy
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.updated, { color: t.textDim, fontFamily: fonts.mono }]}>
          DRIFTAI · VERSION 1.0.0
        </Text>
        {sections.map((section) => (
          <View key={section.title} style={[styles.section, { borderBottomColor: t.border }]}>
            <Text style={[styles.sectionTitle, { color: t.text, fontFamily: fonts.sans }]}>
              {section.title}
            </Text>
            <Text style={[styles.body, { color: t.textDim, fontFamily: fonts.sans }]}>
              {section.body}
            </Text>
          </View>
        ))}
        <Text style={[styles.footer, { color: t.textFaint, fontFamily: fonts.sans }]}>
          Developer: Mohit Chawla
        </Text>
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
  headerSpacer: { width: 38 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 36 },
  updated: { fontSize: 10, letterSpacing: 1, marginBottom: 18 },
  section: { borderBottomWidth: 1, paddingVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21 },
  footer: { marginTop: 22, fontSize: 13 },
});
