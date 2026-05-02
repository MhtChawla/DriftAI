// src/screens/CommandsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppStore, type Command, type CommandAction } from '../store/useAppStore';
import { fonts, tokens } from '../theme/tokens';
import { MonoLabel } from '../components/MonoLabel';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { TabsParamList } from '../navigation/RootNavigator';

type Props = BottomTabScreenProps<TabsParamList, 'Commands'>;

// Each option carries the action detail string that executeCommandAction will handle
type ActionOption = CommandAction & {
  title: string;
  subtitle: string;
};

type ActionGroupKey = 'device' | 'time' | 'apps';

type ActionGroup = {
  key: ActionGroupKey;
  label: string;
  categories: {
    title: string;
    subtitle: string;
    options: ActionOption[];
  }[];
};

const ACTION_GROUPS: ActionGroup[] = [
  {
    key: 'device',
    label: 'DEVICE CONTROLS',
    categories: [
      {
        title: 'Set Brightness',
        subtitle: 'Instant screen brightness change',
        options: [
          { key: 'set', detail: 'brightness 25', title: '25%', subtitle: 'Low brightness' },
          { key: 'set', detail: 'brightness 50', title: '50%', subtitle: 'Medium brightness' },
          { key: 'set', detail: 'brightness 75', title: '75%', subtitle: 'High brightness' },
          { key: 'set', detail: 'brightness 100', title: '100%', subtitle: 'Full brightness' },
        ],
      },
      {
        title: 'Set Volume Mode',
        subtitle: 'Change ringer / sound mode',
        options: [
          { key: 'set', detail: 'silent mode', title: 'Silent', subtitle: 'Mute all sounds' },
          { key: 'set', detail: 'vibrate mode', title: 'Vibrate', subtitle: 'Vibrate only' },
          { key: 'set', detail: 'ringer mode', title: 'Ring', subtitle: 'Normal ring' },
        ],
      },
      {
        title: 'Set Media Volume',
        subtitle: 'Adjust media playback volume',
        options: [
          { key: 'set', detail: 'volume low', title: 'Low', subtitle: 'Set volume to 25%' },
          { key: 'set', detail: 'volume medium', title: 'Medium', subtitle: 'Set volume to 50%' },
          { key: 'set', detail: 'volume high', title: 'High', subtitle: 'Set volume to 100%' },
          { key: 'set', detail: 'volume mute', title: 'Mute', subtitle: 'Mute media volume' },
        ],
      },
      {
        title: 'Enable DND',
        subtitle: 'Do Not Disturb mode',
        options: [
          { key: 'set', detail: 'dnd on 30min', title: '30 min', subtitle: 'DND for 30 minutes' },
          { key: 'set', detail: 'dnd on 60min', title: '60 min', subtitle: 'DND for 60 minutes' },
          { key: 'set', detail: 'do not disturb on', title: 'Until turned off', subtitle: 'DND indefinitely' },
        ],
      },
      {
        title: 'Toggle Flashlight',
        subtitle: 'Turn torch on or off',
        options: [
          { key: 'set', detail: 'flashlight on', title: 'On', subtitle: 'Turn flashlight on' },
          { key: 'set', detail: 'flashlight off', title: 'Off', subtitle: 'Turn flashlight off' },
        ],
      },
      {
        title: 'Toggle Bluetooth',
        subtitle: 'Enable or disable Bluetooth',
        options: [
          { key: 'set', detail: 'bluetooth on', title: 'On', subtitle: 'Turn Bluetooth on' },
          { key: 'set', detail: 'bluetooth off', title: 'Off', subtitle: 'Turn Bluetooth off' },
        ],
      },
      {
        title: 'Toggle WiFi',
        subtitle: 'Opens WiFi settings (system restriction)',
        options: [
          { key: 'set', detail: 'wifi on', title: 'On', subtitle: 'Open WiFi settings to enable' },
          { key: 'set', detail: 'wifi off', title: 'Off', subtitle: 'Open WiFi settings to disable' },
        ],
      },
      {
        title: 'Lock Screen',
        subtitle: 'Minimize / lock the device',
        options: [
          { key: 'set', detail: 'lock screen', title: 'Lock Now', subtitle: 'Minimize app to lock screen' },
        ],
      },
    ],
  },
  {
    key: 'time',
    label: 'TIME-BASED ACTIONS',
    categories: [
      {
        title: 'Set Alarm',
        subtitle: 'Opens clock with preset time',
        options: [
          { key: 'set', detail: 'alarm 6am', title: '6:00 AM', subtitle: 'Morning alarm' },
          { key: 'set', detail: 'alarm 7am', title: '7:00 AM', subtitle: 'Morning alarm' },
          { key: 'set', detail: 'alarm 8am', title: '8:00 AM', subtitle: 'Morning alarm' },
          { key: 'set', detail: 'alarm custom', title: 'Custom', subtitle: 'Open clock to set time' },
        ],
      },
      {
        title: 'Set Timer',
        subtitle: 'Countdown timer via Clock',
        options: [
          { key: 'timer', detail: 'Timer for 5 minutes', title: '5 min', subtitle: 'Quick timer' },
          { key: 'timer', detail: 'Timer for 10 minutes', title: '10 min', subtitle: 'Short timer' },
          { key: 'timer', detail: 'Timer for 25 minutes', title: '25 min', subtitle: 'Pomodoro timer' },
          { key: 'timer', detail: 'Timer custom', title: 'Custom', subtitle: 'Open clock to set timer' },
        ],
      },
      {
        title: 'Start Stopwatch',
        subtitle: 'Launch stopwatch in Clock app',
        options: [
          { key: 'open', detail: 'stopwatch', title: 'Start', subtitle: 'Open Clock stopwatch' },
        ],
      },
      {
        title: 'Create Reminder',
        subtitle: 'Scheduled notification reminder',
        options: [
          { key: 'set', detail: 'reminder drink water', title: 'Drink water', subtitle: 'Remind me to drink water' },
          { key: 'set', detail: 'reminder gym', title: 'Go to gym', subtitle: 'Remind me to go to gym' },
          { key: 'set', detail: 'reminder custom', title: 'Custom', subtitle: 'Set your own reminder text + time' },
        ],
      },
      {
        title: 'Schedule Notification',
        subtitle: 'Timed in-app notification',
        options: [
          { key: 'set', detail: 'notify in 10min', title: 'After 10 min', subtitle: 'Notification in 10 minutes' },
          { key: 'set', detail: 'notify in 30min', title: 'After 30 min', subtitle: 'Notification in 30 minutes' },
          { key: 'set', detail: 'notify custom', title: 'Custom', subtitle: 'Set custom notification delay' },
        ],
      },
    ],
  },
  {
    key: 'apps',
    label: 'APP / INTENT ACTIONS',
    categories: [
      {
        title: 'Music (Spotify)',
        subtitle: 'Play playlist or open app',
        options: [
          { key: 'play', detail: 'spotify gym playlist', title: 'Gym playlist', subtitle: 'Play gym music on Spotify' },
          { key: 'play', detail: 'spotify sleep music', title: 'Sleep music', subtitle: 'Play sleep sounds on Spotify' },
          { key: 'play', detail: 'spotify lofi focus', title: 'Lofi focus', subtitle: 'Play lofi beats on Spotify' },
          { key: 'open', detail: 'spotify', title: 'Open app', subtitle: 'Launch Spotify' },
        ],
      },
      {
        title: 'Maps',
        subtitle: 'Navigate or search locations',
        options: [
          { key: 'open', detail: 'maps navigate home', title: 'Navigate to Home', subtitle: 'Open Maps to home' },
          { key: 'open', detail: 'maps navigate work', title: 'Navigate to Work', subtitle: 'Open Maps to work' },
          { key: 'open', detail: 'maps search gyms near me', title: 'Gyms near me', subtitle: 'Search gyms in Maps' },
          { key: 'open', detail: 'maps search custom', title: 'Search location', subtitle: 'Open Maps search' },
        ],
      },
      {
        title: 'YouTube',
        subtitle: 'Search or open YouTube',
        options: [
          { key: 'open', detail: 'youtube search workout videos', title: 'Workout videos', subtitle: 'Search on YouTube' },
          { key: 'open', detail: 'youtube search meditation', title: 'Meditation', subtitle: 'Search on YouTube' },
          { key: 'open', detail: 'youtube', title: 'Open home', subtitle: 'Launch YouTube app' },
        ],
      },
      {
        title: 'Browser',
        subtitle: 'Open URL or search',
        options: [
          { key: 'open', detail: 'browser google.com', title: 'Google.com', subtitle: 'Open google.com in browser' },
          { key: 'open', detail: 'browser search custom', title: 'Search query', subtitle: 'Open browser with search' },
        ],
      },
      {
        title: 'WhatsApp',
        subtitle: 'Open app or start a chat',
        options: [
          { key: 'open', detail: 'whatsapp', title: 'Open', subtitle: 'Launch WhatsApp' },
          { key: 'msg', detail: 'whatsapp contact', title: 'Open chat', subtitle: 'Open WhatsApp chat with contact' },
        ],
      },
      {
        title: 'Instagram',
        subtitle: 'Open Instagram app',
        options: [
          { key: 'open', detail: 'instagram', title: 'Open', subtitle: 'Launch Instagram' },
        ],
      },
    ],
  },
];

type Draft = {
  id: string;
  name: string;
  phrase: string;
  // one selected option per group key
  selectedOptions: Partial<Record<ActionGroupKey, { option: ActionOption; categoryTitle: string }>>;
};

export function CommandsScreen(_: Props) {
  const t = useThemeTokens();
  const commands = useAppStore((s) => s.commands);
  const upsert = useAppStore((s) => s.upsertCommand);
  const deleteCommand = useAppStore((s) => s.deleteCommand);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const openNew = useCallback(() => {
    setDraft({ id: Math.random().toString(36).slice(2), name: '', phrase: '', selectedOptions: {} });
    setExpandedGroup(null);
    setExpandedCategory(null);
    setEditing(true);
  }, []);

  const pickOption = useCallback((groupKey: ActionGroupKey, categoryTitle: string, option: ActionOption) => {
    setDraft((current) => {
      if (!current) return current;
      const existing = current.selectedOptions[groupKey];
      // deselect if same option tapped again
      if (existing?.option.detail === option.detail && existing?.categoryTitle === categoryTitle) {
        const next = { ...current.selectedOptions };
        delete next[groupKey];
        return { ...current, selectedOptions: next };
      }
      return { ...current, selectedOptions: { ...current.selectedOptions, [groupKey]: { option, categoryTitle } } };
    });
    setExpandedCategory(null);
  }, []);

  const closeSheet = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setExpandedGroup(null);
    setExpandedCategory(null);
  }, []);

  const save = useCallback(() => {
    if (!draft || !draft.name.trim() || !draft.phrase.trim()) return;
    const allActions = Object.values(draft.selectedOptions).map(({ option }) => ({
      key: option.key,
      detail: option.detail,
    }));
    if (allActions.length === 0) {
      Alert.alert('No action', 'Select at least one action.');
      return;
    }
    upsert({
      id: draft.id,
      name: draft.name.trim(),
      phrase: draft.phrase.trim(),
      desc: Object.values(draft.selectedOptions).map(({ option }) => option.title).join(' · '),
      actions: allActions,
      enabled: true,
    });
    setEditing(false);
    setDraft(null);
    setExpandedGroup(null);
    setExpandedCategory(null);
  }, [draft, upsert]);

  const canSave = Boolean(draft?.name.trim() && draft?.phrase.trim() && Object.keys(draft?.selectedOptions ?? {}).length > 0);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text, fontFamily: fonts.sans }]}>
            Custom Commands
          </Text>
          <MonoLabel style={{ fontSize: 10, marginTop: 2 }}>
            {commands.length} ACTIVE
          </MonoLabel>
        </View>
        <Pressable onPress={openNew} style={styles.newBtn}>
          <LinearGradient
            colors={[tokens.accent1, tokens.accent2]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Plus size={16} color="#fff" />
          <Text style={styles.newBtnLabel}>New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {commands.map((c) => (
          <CommandRow key={c.id} c={c} onDelete={deleteCommand} />
        ))}
      </ScrollView>

      <Modal visible={editing} animationType="slide" transparent onRequestClose={closeSheet}>
        {draft && (
          <Pressable style={styles.modalBackdrop} onPress={closeSheet}>
            <Pressable
              style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={() => { }}
            >
              <View style={[styles.grabber, { backgroundColor: t.borderStrong }]} />
              <View style={styles.sheetHeader}>
                <Pressable onPress={closeSheet}>
                  <Text style={[styles.sheetAction, { color: t.textDim }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.sheetTitle, { color: t.text }]}>New Command</Text>
                <Pressable onPress={save} disabled={!canSave}>
                  <Text style={[styles.sheetAction, { color: canSave ? tokens.accent1 : t.textFaint, fontWeight: '600' }]}>
                    Save
                  </Text>
                </Pressable>
              </View>

              <Field label="NAME">
                <TextInput
                  value={draft.name}
                  onChangeText={(v) => setDraft({ ...draft, name: v })}
                  placeholder="e.g. Focus Mode"
                  placeholderTextColor={t.textFaint}
                  style={[styles.fieldInput, { backgroundColor: t.surface2, borderColor: t.border, color: t.text }]}
                />
              </Field>
              <Field label="TRIGGER PHRASE">
                <TextInput
                  value={draft.phrase}
                  onChangeText={(v) => setDraft({ ...draft, phrase: v })}
                  placeholder="e.g. Start focus"
                  placeholderTextColor={t.textFaint}
                  style={[styles.fieldInput, { backgroundColor: t.surface2, borderColor: t.border, color: t.text }]}
                />
              </Field>

              <View style={styles.actionsHeader}>
                <MonoLabel>ACTIONS</MonoLabel>
                <MonoLabel style={{ color: tokens.accent1 }}>
                  {Object.keys(draft.selectedOptions).length > 0
                    ? `${Object.keys(draft.selectedOptions).length} SELECTED`
                    : 'ONE PER GROUP'}
                </MonoLabel>
              </View>

              <ScrollView style={styles.actionPicker} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {ACTION_GROUPS.map((group) => {
                  const isGroupOpen = expandedGroup === group.key;
                  const groupSelection = draft.selectedOptions[group.key];

                  return (
                    <View key={group.key} style={styles.groupBlock}>
                      <Pressable
                        onPress={() => setExpandedGroup(isGroupOpen ? null : group.key)}
                        style={[styles.groupHeader, { backgroundColor: t.surface2, borderColor: groupSelection ? tokens.accent1 : isGroupOpen ? tokens.accent1 : t.border }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.groupLabel, { color: t.text, fontFamily: fonts.sans }]}>
                            {group.label}
                          </Text>
                          {groupSelection && (
                            <Text style={[styles.groupSub, { color: tokens.accent1, fontFamily: fonts.mono }]}>
                              {groupSelection.option.title}
                            </Text>
                          )}
                        </View>
                        {isGroupOpen ? <ChevronDown size={16} color={t.textDim} /> : <ChevronRight size={16} color={t.textDim} />}
                      </Pressable>

                      {isGroupOpen && (
                        <View style={[styles.categoryList, { borderColor: t.border }]}>
                          {group.categories.map((cat) => {
                            const compositeKey = `${group.key}:${cat.title}`;
                            const isThisCatSelected = groupSelection?.categoryTitle === cat.title;
                            const selectedOpt = isThisCatSelected ? groupSelection.option : null;
                            const isCatOpen = expandedCategory === compositeKey;

                            return (
                              <View key={cat.title} style={[styles.categoryBlock, { borderBottomColor: t.border }]}>
                                <Pressable
                                  onPress={() => {
                                    if (cat.options.length === 1) {
                                      pickOption(group.key, cat.title, cat.options[0]);
                                    } else {
                                      setExpandedCategory(isCatOpen ? null : compositeKey);
                                    }
                                  }}
                                  style={styles.categoryRow}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.categoryTitle, { color: t.text, fontFamily: fonts.sans }]}>
                                      {cat.title}
                                    </Text>
                                    <Text style={[styles.categorySub, { color: selectedOpt ? tokens.accent1 : t.textDim, fontFamily: fonts.sans }]}>
                                      {selectedOpt ? selectedOpt.title : cat.subtitle}
                                    </Text>
                                  </View>
                                  {cat.options.length === 1 ? (
                                    <View style={[styles.radioOuter, { borderColor: selectedOpt ? tokens.accent1 : t.borderStrong }]}>
                                      {selectedOpt && <View style={[styles.radioDot, { backgroundColor: tokens.accent1 }]} />}
                                    </View>
                                  ) : (
                                    <>
                                      {selectedOpt && (
                                        <View style={[styles.selectedDot, { backgroundColor: tokens.accent1 }]} />
                                      )}
                                      {isCatOpen ? <ChevronDown size={15} color={t.textDim} /> : <ChevronRight size={15} color={t.textDim} />}
                                    </>
                                  )}
                                </Pressable>

                                {isCatOpen && cat.options.length > 1 && (
                                  <View style={[styles.optionList, { borderTopColor: t.border }]}>
                                    {cat.options.map((opt) => {
                                      const isSelected = isThisCatSelected && groupSelection?.option.detail === opt.detail;
                                      return (
                                        <Pressable
                                          key={opt.detail}
                                          onPress={() => pickOption(group.key, cat.title, opt)}
                                          style={[styles.optionRow, { borderBottomColor: t.border }]}
                                        >
                                          <View style={{ flex: 1 }}>
                                            <Text style={[styles.optionTitle, { color: t.text, fontFamily: fonts.sans }]}>
                                              {opt.title}
                                            </Text>
                                            <Text style={[styles.optionSub, { color: t.textDim, fontFamily: fonts.sans }]}>
                                              {opt.subtitle}
                                            </Text>
                                          </View>
                                          <View style={[styles.radioOuter, { borderColor: isSelected ? tokens.accent1 : t.borderStrong }]}>
                                            {isSelected && <View style={[styles.radioDot, { backgroundColor: tokens.accent1 }]} />}
                                          </View>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        )}
      </Modal>
    </View>
  );
}

const CommandRow = React.memo(function CommandRow({
  c,
  onDelete,
}: {
  c: Command;
  onDelete: (id: string) => void;
}) {
  const t = useThemeTokens();
  return (
    <View style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}>
      <LinearGradient
        colors={[tokens.accent1, tokens.accent2]}
        style={styles.rowAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowName, { color: t.text, fontFamily: fonts.sans }]}>{c.name}</Text>
          <Text style={[styles.rowPhrase, { color: tokens.accent1, fontFamily: fonts.mono }]}>
            "{c.phrase}"
          </Text>
        </View>
        <Pressable
          onPress={() => onDelete(c.id)}
          style={[styles.deleteBtn, { backgroundColor: t.surface2, borderColor: t.border }]}
        >
          <Trash2 size={14} color={t.textDim} />
        </Pressable>
      </View>
      <Text style={[styles.rowDesc, { color: t.textDim, fontFamily: fonts.sans }]}>{c.desc}</Text>
      <View style={styles.rowFooter}>
        <MonoLabel style={{ fontSize: 9.5 }}>
          {c.actions.length} ACTION{c.actions.length !== 1 ? 'S' : ''}
        </MonoLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.enabled ? tokens.online : t.textFaint }} />
          <Text style={{ fontFamily: fonts.mono, fontSize: 9.5, color: t.textFaint, letterSpacing: 0.6 }}>
            {c.enabled ? 'ENABLED' : 'OFF'}
          </Text>
        </View>
      </View>
    </View>
  );
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <MonoLabel style={{ marginBottom: 6 }}>{label}</MonoLabel>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: '600', letterSpacing: -0.4 },
  newBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    overflow: 'hidden',
  },
  newBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '500', fontFamily: fonts.sans },
  list: { padding: 14, paddingBottom: 130, gap: 10 },
  row: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10, overflow: 'hidden' },
  rowAccent: { position: 'absolute', top: 0, left: 0, width: 3, height: '100%', opacity: 0.7 },
  rowName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  rowPhrase: { fontSize: 11.5, marginTop: 3, letterSpacing: 0.2 },
  rowDesc: { fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
  },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 16, fontWeight: '600' },
  sheetAction: { fontSize: 15 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.sans,
  },
  actionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  actionPicker: { maxHeight: 400 },

  groupBlock: { marginBottom: 10 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  groupLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  groupSub: { fontSize: 11, marginTop: 2, letterSpacing: 0.2 },

  categoryList: { borderWidth: 1, borderRadius: 14, marginTop: 6, overflow: 'hidden' },
  categoryBlock: { borderBottomWidth: 1 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  categoryTitle: { fontSize: 14, fontWeight: '600' },
  categorySub: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  selectedDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },

  optionList: { borderTopWidth: 1, paddingLeft: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingRight: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  optionTitle: { fontSize: 13, fontWeight: '600' },
  optionSub: { fontSize: 11.5, lineHeight: 16, marginTop: 1 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
