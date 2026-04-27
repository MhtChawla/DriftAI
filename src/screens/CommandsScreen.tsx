// src/screens/CommandsScreen.tsx
import React, { useState } from 'react';
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
import { Plus, X, Pencil } from 'lucide-react-native';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { useAppStore, type Command, type CommandActionKey } from '../store/useAppStore';
import { fonts, tokens } from '../theme/tokens';
import { MonoLabel } from '../components/MonoLabel';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { TabsParamList } from '../navigation/RootNavigator';

type Props = BottomTabScreenProps<TabsParamList, 'Commands'>;

const ACTION_LABELS: Record<CommandActionKey, string> = {
  open: 'Open app',
  msg: 'Send message',
  timer: 'Start timer',
  play: 'Play media',
  set: 'Set device state',
};

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

  const [editing, setEditing] = useState<null | 'new' | string>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  function openNew() {
    setDraft({ id: Math.random().toString(36).slice(2), name: '', phrase: '', actions: [{ key: 'open', detail: '' }] });
    setEditing('new');
  }

  function openEdit(c: Command) {
    setDraft({ id: c.id, name: c.name, phrase: c.phrase, actions: c.actions });
    setEditing(c.id);
  }

  function save() {
    if (!draft || !draft.name.trim()) return;
    upsert({
      id: draft.id,
      name: draft.name,
      phrase: draft.phrase,
      desc: draft.actions.map((a) => ACTION_LABELS[a.key]).join(' · '),
      actions: draft.actions,
      enabled: true,
    });
    setEditing(null);
    setDraft(null);
  }

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
            style={StyleSheet.absoluteFillObject as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Plus size={16} color="#fff" />
          <Text style={styles.newBtnLabel}>New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {commands.map((c) => (
          <CommandRow key={c.id} c={c} onEdit={() => openEdit(c)} />
        ))}
      </ScrollView>

      <Modal
        visible={editing !== null}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setEditing(null);
          setDraft(null);
        }}
      >
        {draft && (
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setEditing(null);
              setDraft(null);
            }}
          >
            <Pressable
              style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={() => {}}
            >
              <View style={[styles.grabber, { backgroundColor: t.borderStrong }]} />
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => { setEditing(null); setDraft(null); }}>
                  <Text style={[styles.sheetAction, { color: t.textDim }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.sheetTitle, { color: t.text }]}>
                  {editing === 'new' ? 'New Command' : 'Edit Command'}
                </Text>
                <Pressable onPress={save} disabled={!draft.name.trim()}>
                  <Text
                    style={[
                      styles.sheetAction,
                      {
                        color: draft.name.trim() ? tokens.accent1 : t.textFaint,
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
                  placeholder="What you'll say"
                  placeholderTextColor={t.textFaint}
                  style={[styles.fieldInput, { backgroundColor: t.surface2, borderColor: t.border, color: t.text }]}
                />
              </Field>

              <MonoLabel style={{ marginTop: 16, marginBottom: 8 }}>ACTIONS</MonoLabel>
              <View style={{ gap: 8 }}>
                {draft.actions.map((a, i) => (
                  <View
                    key={i}
                    style={[
                      styles.actionRow,
                      { backgroundColor: t.surface2, borderColor: t.border },
                    ]}
                  >
                    <View style={styles.actionIdx}>
                      <LinearGradient
                        colors={[tokens.accent1, tokens.accent2]}
                        style={StyleSheet.absoluteFillObject as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Text style={styles.actionIdxText}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, color: t.text, fontSize: 14, fontFamily: fonts.sans }}>
                      {ACTION_LABELS[a.key]}
                    </Text>
                    {draft.actions.length > 1 && (
                      <Pressable
                        onPress={() =>
                          setDraft({
                            ...draft,
                            actions: draft.actions.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <X size={14} color={t.textFaint} />
                      </Pressable>
                    )}
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    setDraft({
                      ...draft,
                      actions: [...draft.actions, { key: 'open', detail: '' }],
                    })
                  }
                  style={[styles.addAction, { borderColor: t.borderStrong }]}
                >
                  <Plus size={14} color={t.textDim} />
                  <Text style={{ color: t.textDim, fontFamily: fonts.sans, fontSize: 13 }}>
                    Add action
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        )}
      </Modal>
    </View>
  );
}

function CommandRow({ c, onEdit }: { c: Command; onEdit: () => void }) {
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
          onPress={onEdit}
          style={[styles.editBtn, { backgroundColor: t.surface2, borderColor: t.border }]}
        >
          <Pencil size={14} color={t.textDim} />
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
  editBtn: {
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionIdx: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIdxText: { color: '#fff', fontFamily: fonts.mono, fontSize: 13, fontWeight: '600' },
  addAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
