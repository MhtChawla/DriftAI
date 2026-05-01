// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { usePermissions } from '../hooks/usePermissions';
import { useAppStore } from '../store/useAppStore';
import { fonts, tokens } from '../theme/tokens';
import { MonoLabel } from '../components/MonoLabel';
import { Toggle } from '../components/Toggle';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabsParamList } from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen({ navigation }: Props) {
  const t = useThemeTokens();
  const name = useAppStore((s) => s.user.name);
  const commandCount = useAppStore((s) => s.commandCount);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const perms = useAppStore((s) => s.permissions);
  const { requestMic, requestContacts, requestNotifications, requestMedia, syncPermissions } = usePermissions();
  const ttsEnabled = useAppStore((s) => s.ttsEnabled);
  const setTtsEnabled = useAppStore((s) => s.setTtsEnabled);
  const clearMessages = useAppStore((s) => s.clearMessages);

  useFocusEffect(
    React.useCallback(() => {
      syncPermissions();
    }, [syncPermissions])
  );

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text, fontFamily: fonts.sans }]}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile card */}
        <LinearGradient
          colors={['rgba(91,140,255,0.12)', 'rgba(168,85,247,0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.profile, { borderColor: 'rgba(91,140,255,0.3)' }]}
        >
          <LinearGradient
            colors={[tokens.accent1, tokens.accent2]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{name[0]?.toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: t.text, fontFamily: fonts.sans }]}>
              {name}
            </Text>
            <Text style={{ color: t.textDim, fontSize: 13 }}>
              Drift AI · {commandCount} {commandCount === 1 ? 'command' : 'commands'}
            </Text>
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </LinearGradient>

        <Section label="PERMISSIONS">
          <ToggleRow label="Microphone" sub="Required for voice input" value={perms.mic} onChange={requestMic} disabled={perms.mic} />
          <ToggleRow label="Contacts" sub="To send messages and place calls" value={perms.contacts} onChange={requestContacts} disabled={perms.contacts} />
          <ToggleRow label="Notifications" sub="Reminders and reply suggestions" value={perms.notifications} onChange={requestNotifications} disabled={perms.notifications} />
          <ToggleRow label="Media & Storage" sub="Access photos and files" value={perms.media} onChange={requestMedia} disabled={perms.media} isLast />
        </Section>

        <Section label="AI">
          <DetailRow label="API Key" detail="243248***3984239" />
          <ToggleRow
            label="Voice responses (TTS)"
            sub="Drif speaks AI answers aloud"
            value={ttsEnabled}
            onChange={setTtsEnabled}
            isLast
          />
        </Section>

        <Section label="APP">
          <ToggleRow
            label="Dark mode"
            sub="Quiet & glow"
            value={theme === 'dark'}
            onChange={(v) => setTheme(v ? 'dark' : 'light')}
          />
          <Pressable
            onPress={() =>
              Alert.alert('Clear history', 'This will remove all messages.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearMessages },
              ])
            }
            style={styles.btnRow}
          >
            <Text style={[styles.rowLabel, { color: tokens.danger, fontFamily: fonts.sans }]}>
              Clear conversation history
            </Text>
          </Pressable>
        </Section>

        <Section label="ABOUT">
          <DetailRow label="Version" detail="1.0.0" />
          <DetailRow label="Developer" detail="Mohit Chawla" />
          <NavRow label="Privacy policy" onPress={() => navigation.navigate('PrivacyPolicy')} isLast />
        </Section>

        <Text
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontFamily: fonts.mono,
            fontSize: 10,
            color: t.textFaint,
            letterSpacing: 1,
          }}
        >
          DRIFTAI · MADE FOR VOICE
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useThemeTokens();
  return (
    <View style={{ marginBottom: 22 }}>
      <MonoLabel style={{ marginBottom: 8, paddingHorizontal: 6 }}>{label}</MonoLabel>
      <View
        style={{
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
  disabled,
  isLast,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}) {
  const t = useThemeTokens();
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: t.border },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: t.text, fontFamily: fonts.sans }]}>{label}</Text>
        {sub && (
          <Text style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>{sub}</Text>
        )}
      </View>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

function NavRow({
  label,
  detail,
  onPress,
  isLast,
}: {
  label: string;
  detail?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const t = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: t.border },
      ]}
    >
      <Text style={[styles.rowLabel, { flex: 1, color: t.text, fontFamily: fonts.sans }]}>
        {label}
      </Text>
      {detail && (
        <Text style={{ fontSize: 14, color: t.textDim, marginRight: 6 }}>{detail}</Text>
      )}
      <ChevronRight size={16} color={t.textFaint} />
    </Pressable>
  );
}

function DetailRow({ label, detail }: { label: string; detail: string }) {
  const t = useThemeTokens();
  return (
    <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: t.border }]}>
      <Text style={[styles.rowLabel, { flex: 1, color: t.text, fontFamily: fonts.sans }]}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: t.textDim,
          fontFamily: /\d/.test(detail) ? fonts.mono : fonts.sans,
        }}
      >
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14 },
  title: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 16, paddingBottom: 130 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  profileName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  proBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(91,140,255,0.3)',
  },
  proBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: tokens.accent1,
    letterSpacing: 0.6,
    fontWeight: '500',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowLabel: { fontSize: 15, letterSpacing: -0.2 },
  btnRow: { paddingVertical: 14, paddingHorizontal: 14 },
});
