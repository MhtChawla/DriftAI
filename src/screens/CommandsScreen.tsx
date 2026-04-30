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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Plus, Trash2, Check, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppStore, type Command, type CommandAction, type CommandActionKey } from '../store/useAppStore';
import { fonts, tokens } from '../theme/tokens';
import { MonoLabel } from '../components/MonoLabel';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { TabsParamList } from '../navigation/RootNavigator';

type Props = BottomTabScreenProps<TabsParamList, 'Commands'>;

type ActionOption = CommandAction & {
  title: string;
  subtitle: string;
};

type ActionGroupKey = 'device' | 'native' | 'apps';

type ActionGroup = {
  key: ActionGroupKey;
  title: string;
  placeholder: string;
  options: ActionOption[];
};

const ACTION_GROUPS: ActionGroup[] = [
  {
    key: 'device',
    title: 'Device',
    placeholder: 'Choose device action',
    options: [
      { key: 'set', detail: 'Brightness low to 20%', title: 'Brightness low', subtitle: 'Set brightness to 20%' },
      { key: 'set', detail: 'Full brightness', title: 'Full brightness', subtitle: 'Set brightness to 100%' },
      { key: 'set', detail: 'Silent mode', title: 'Silent', subtitle: 'Switch phone to silent mode' },
      { key: 'set', detail: 'Ringer mode', title: 'Ringer Mode', subtitle: 'Switch from silent to ringer' },
      { key: 'set', detail: 'Flashlight on', title: 'Flashlight on', subtitle: 'Turn on flashlight' },
      { key: 'set', detail: 'Turn off Wi-Fi', title: 'Turn off wifi', subtitle: 'Disable Wi-Fi' },
    ],
  },
  {
    key: 'native',
    title: 'Native apps',
    placeholder: 'Choose native app action',
    options: [
      { key: 'set', detail: 'Set an alarm for 7am', title: 'Set an alarm for 7am', subtitle: 'Clock alarm' },
      { key: 'set', detail: 'Set an alarm for 11pm', title: 'Set an alarm for 11pm', subtitle: 'Clock alarm' },
      { key: 'timer', detail: 'Timer for 60 minutes', title: 'Timer for 60 minutes', subtitle: 'Clock timer' },
      { key: 'timer', detail: 'Timer for 20 minutes', title: 'Timer for 20 minutes', subtitle: 'Clock timer' },
      { key: 'timer', detail: 'Timer for 5 minutes', title: 'Timer for 5 minutes', subtitle: 'Clock timer' },
      { key: 'open', detail: 'Open calendar', title: 'Open calendar', subtitle: 'View schedule' },
      { key: 'open', detail: 'Create calendar event', title: 'Create calendar event', subtitle: 'Prepare a new event' },
      { key: 'open', detail: 'Open contacts', title: 'Open contacts', subtitle: 'Find a person' },
      { key: 'open', detail: 'Open camera', title: 'Open camera', subtitle: 'Launch camera' },
      { key: 'open', detail: 'Open maps', title: 'Open maps', subtitle: 'Search or navigate' },
    ],
  },
  {
    key: 'apps',
    title: 'Apps',
    placeholder: 'Choose installed app action',
    options: [
      { key: 'msg', detail: 'WhatsApp Business message', title: 'WhatsApp Business', subtitle: 'Send message to a contact' },
      { key: 'play', detail: 'Spotify playback', title: 'Spotify', subtitle: 'Play music or playlist' },
      { key: 'open', detail: 'Instagram open', title: 'Instagram', subtitle: 'Open app or prepare post' },
      { key: 'open', detail: 'Snapchat open', title: 'Snapchat', subtitle: 'Open camera/chat' },
      { key: 'open', detail: 'LinkedIn open', title: 'LinkedIn', subtitle: 'Open feed or profile search' },
      { key: 'open', detail: 'Facebook open', title: 'Facebook', subtitle: 'Open app' },
      { key: 'open', detail: 'YouTube search', title: 'YouTube', subtitle: 'Open or search videos' },
      { key: 'play', detail: 'YouTube Music playback', title: 'YouTube Music', subtitle: 'Play music' },
      { key: 'open', detail: 'Chrome search', title: 'Chrome', subtitle: 'Open browser search' },
      { key: 'open', detail: 'Google Maps directions', title: 'Google Maps', subtitle: 'Search or navigate' },
      { key: 'open', detail: 'Google Photos search', title: 'Google Photos', subtitle: 'Open gallery/search photos' },
      { key: 'open', detail: 'Files open', title: 'Files', subtitle: 'Open file manager' },
      { key: 'open', detail: 'OneDrive open', title: 'OneDrive', subtitle: 'Open cloud files' },
      { key: 'open', detail: 'Airtel open', title: 'Airtel', subtitle: 'Open account app' },
      { key: 'open', detail: 'Myntra open', title: 'Myntra', subtitle: 'Open shopping app' },
    ],
  },
];

type Draft = {
  id: string;
  name: string;
  phrase: string;
  actions: { key: CommandActionKey; detail: string }[];
};

export function CommandsScreen(_: Props) {
  const t = useThemeTokens();
  const commands = useAppStore((s) => s.commands);
  const upsert = useAppStore((s) => s.upsertCommand);
  const deleteCommand = useAppStore((s) => s.deleteCommand);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activePicker, setActivePicker] = useState<ActionGroupKey | null>(null);

  const openNew = useCallback(() => {
    setDraft({ id: Math.random().toString(36).slice(2), name: '', phrase: '', actions: [] });
    setEditing(true);
  }, []);

  const selectDraftAction = useCallback((groupKey: ActionGroupKey, action: CommandAction) => {
    setDraft((current) => {
      if (!current) return current;
      const groupDetails = ACTION_GROUPS.find((group) => group.key === groupKey)?.options.map((option) => option.detail) ?? [];
      const actions = current.actions.filter((item) => !groupDetails.includes(item.detail));
      return { ...current, actions: [...actions, action] };
    });
    setActivePicker(null);
  }, []);

  const closeSheet = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setActivePicker(null);
  }, []);

  const save = useCallback(() => {
    if (!draft || !draft.name.trim() || !draft.phrase.trim() || draft.actions.length === 0) return;
    const orderedActions = ACTION_GROUPS.flatMap((group) =>
      draft.actions.filter((action) => group.options.some((option) => option.detail === action.detail)),
    );
    upsert({
      id: draft.id,
      name: draft.name.trim(),
      phrase: draft.phrase.trim(),
      desc: orderedActions.map((a) => a.detail).join(' · '),
      actions: orderedActions,
      enabled: true,
    });
    setEditing(false);
    setDraft(null);
    setActivePicker(null);
  }, [draft, upsert]);

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

      <Modal
        visible={editing}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        {draft && (
          <Pressable style={styles.modalBackdrop} onPress={closeSheet}>
            <Pressable
              style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={() => {}}
            >
              <View style={[styles.grabber, { backgroundColor: t.borderStrong }]} />
              <View style={styles.sheetHeader}>
                <Pressable onPress={closeSheet}>
                  <Text style={[styles.sheetAction, { color: t.textDim }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.sheetTitle, { color: t.text }]}>New Command</Text>
                <Pressable
                  onPress={save}
                  disabled={!draft.name.trim() || !draft.phrase.trim() || draft.actions.length === 0}
                >
                  <Text
                    style={[
                      styles.sheetAction,
                      {
                        color:
                          draft.name.trim() && draft.phrase.trim() && draft.actions.length > 0
                            ? tokens.accent1
                            : t.textFaint,
                        fontWeight: '600',
                      },
                    ]}
                  >
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
                  placeholder="e.g. Start focus; context can match later"
                  placeholderTextColor={t.textFaint}
                  style={[styles.fieldInput, { backgroundColor: t.surface2, borderColor: t.border, color: t.text }]}
                />
              </Field>

              <View style={styles.actionsHeader}>
                <MonoLabel>ACTIONS</MonoLabel>
                <MonoLabel>ONE FROM EACH</MonoLabel>
              </View>
              <ScrollView style={styles.actionPicker} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {ACTION_GROUPS.map((group) => (
                  <View key={group.title} style={styles.actionGroup}>
                    <ActionSelect
                      group={group}
                      selected={draft.actions.find((action) =>
                        group.options.some((option) => option.detail === action.detail),
                      )}
                      expanded={activePicker === group.key}
                      onToggle={() => setActivePicker((current) => (current === group.key ? null : group.key))}
                      onSelect={(action) => selectDraftAction(group.key, action)}
                    />
                  </View>
                ))}
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
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: c.enabled ? tokens.online : t.textFaint,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: 9.5,
              color: t.textFaint,
              letterSpacing: 0.6,
            }}
          >
            {c.enabled ? 'ENABLED' : 'OFF'}
          </Text>
        </View>
      </View>
    </View>
  );
});

function ActionSelect({
  group,
  selected,
  expanded,
  onToggle,
  onSelect,
}: {
  group: ActionGroup;
  selected?: CommandAction;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (action: CommandAction) => void;
}) {
  const t = useThemeTokens();
  const selectedOption = group.options.find((option) => option.detail === selected?.detail);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const submenuGroups = getSubmenuGroups(group);

  return (
    <View>
      <MonoLabel style={{ marginBottom: 6 }}>{group.title.toUpperCase()}</MonoLabel>
      <Pressable
        onPress={onToggle}
        style={[styles.selectInput, { backgroundColor: t.surface2, borderColor: expanded ? tokens.accent1 : t.border }]}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.selectValue,
              {
                color: selectedOption ? t.text : t.textFaint,
                fontFamily: fonts.sans,
              },
            ]}
          >
            {selectedOption?.title ?? group.placeholder}
          </Text>
          {selectedOption && (
            <Text style={[styles.selectSubtitle, { color: t.textDim, fontFamily: fonts.sans }]}>
              {selectedOption.subtitle}
            </Text>
          )}
        </View>
        <ChevronDown size={16} color={t.textDim} />
      </Pressable>

      {expanded && (
        <View style={[styles.dropdown, { backgroundColor: t.surface2, borderColor: t.border }]}>
          {group.key === 'device'
            ? group.options.map((option) => (
                <ActionOptionRow
                  key={option.detail}
                  option={option}
                  selected={option.detail === selectedOption?.detail}
                  onSelect={onSelect}
                />
              ))
            : submenuGroups.map((submenu) => {
                const isOpen = activeSubmenu === submenu.title;
                const selectedInside = submenu.options.some((option) => option.detail === selectedOption?.detail);
                return (
                  <View key={submenu.title}>
                    <Pressable
                      onPress={() => setActiveSubmenu((current) => (current === submenu.title ? null : submenu.title))}
                      style={styles.dropdownItem}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.actionTitle, { color: t.text, fontFamily: fonts.sans }]}>
                          {submenu.title}
                        </Text>
                        <Text style={[styles.actionSubtitle, { color: t.textDim, fontFamily: fonts.sans }]}>
                          {submenu.subtitle}
                        </Text>
                      </View>
                      {selectedInside && (
                        <View style={[styles.smallDot, { backgroundColor: tokens.accent1 }]} />
                      )}
                      {isOpen ? (
                        <ChevronDown size={16} color={t.textDim} />
                      ) : (
                        <ChevronRight size={16} color={t.textDim} />
                      )}
                    </Pressable>
                    {isOpen && (
                      <View style={[styles.submenu, { borderTopColor: t.border }]}>
                        {submenu.options.map((option) => (
                          <ActionOptionRow
                            key={option.detail}
                            option={option}
                            selected={option.detail === selectedOption?.detail}
                            onSelect={onSelect}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
        </View>
      )}
    </View>
  );
}

function ActionOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: ActionOption;
  selected: boolean;
  onSelect: (action: CommandAction) => void;
}) {
  const t = useThemeTokens();

  return (
    <Pressable
      onPress={() => onSelect({ key: option.key, detail: option.detail })}
      style={styles.dropdownItem}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, { color: t.text, fontFamily: fonts.sans }]}>
          {option.title}
        </Text>
        <Text style={[styles.actionSubtitle, { color: t.textDim, fontFamily: fonts.sans }]}>
          {option.subtitle}
        </Text>
      </View>
      <View
        style={[
          styles.checkCircle,
          {
            borderColor: selected ? tokens.accent1 : t.borderStrong,
            backgroundColor: selected ? tokens.accent1 : 'transparent',
          },
        ]}
      >
        {selected && <Check size={13} color="#fff" />}
      </View>
    </Pressable>
  );
}

function getSubmenuGroups(group: ActionGroup) {
  if (group.key === 'native') {
    return group.options.reduce<{ title: string; subtitle: string; options: ActionOption[] }[]>((groups, option) => {
      const existing = groups.find((item) => item.title === option.subtitle);
      if (existing) {
        existing.options.push(option);
        return groups;
      }
      groups.push({ title: option.subtitle, subtitle: 'Choose action', options: [option] });
      return groups;
    }, []);
  }

  if (group.key === 'apps') {
    return group.options.map((option) => ({
      title: option.title,
      subtitle: option.subtitle,
      options: [option],
    }));
  }

  return [];
}

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
  row: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  rowAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    opacity: 0.7,
  },
  rowName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  rowPhrase: { fontSize: 11.5, marginTop: 3, letterSpacing: 0.2 },
  rowDesc: { fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
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
  actionPicker: {
    maxHeight: 360,
  },
  actionGroup: {
    marginBottom: 14,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  submenu: {
    borderTopWidth: 1,
    paddingLeft: 12,
  },
  smallDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
