import { create } from 'zustand';
import { getItem, setItem } from '../utils/storage/mmkvStorage';

export type Theme = 'dark' | 'light';
export type VizStyle = 'rings' | 'bars' | 'orb';
export type ResponseStyle = 'short' | 'balanced' | 'detailed';

export type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: number;
};

export type Command = {
  id: string;
  name: string;
  phrase: string;
  desc: string;
  actions: CommandAction[];
  enabled: boolean;
};

export type CommandActionKey = 'open' | 'msg' | 'timer' | 'play' | 'set';
export type CommandAction = { key: CommandActionKey; detail: string };

export type Permissions = {
  mic: boolean;
  contacts: boolean;
  notifications: boolean;
  media: boolean;
};

export type TTSEnabled = boolean;

export type AppState = {
  // API / loading / error
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // User / appearance
  user: { name: string };
  theme: Theme;
  vizStyle: VizStyle;
  accentHue: number;

  // Preferences
  permissions: Permissions;
  responseStyle: ResponseStyle;
  language: string;
  ttsEnabled: boolean;

  // Chat & commands
  messages: ChatMessage[];
  commands: Command[];

  // Actions
  setName: (name: string) => void;
  setTheme: (t: Theme) => void;
  setVizStyle: (v: VizStyle) => void;
  setAccentHue: (h: number) => void;
  setPermission: (k: keyof Permissions, v: boolean) => void;
  setResponseStyle: (s: ResponseStyle) => void;
  setLanguage: (l: string) => void;
  setTtsEnabled: (v: boolean) => void;

  addMessage: (m: Omit<ChatMessage, 'id' | 'ts'>) => void;
  clearMessages: () => void;

  upsertCommand: (c: Command) => void;
  deleteCommand: (id: string) => void;
  toggleCommand: (id: string) => void;
};

const seedCommands: Command[] = [
  {
    id: 'standup',
    name: 'Standup Brief',
    phrase: 'Standup brief',
    desc: 'Open calendar · Open Slack · Open Linear',
    actions: [
      { key: 'open', detail: 'Calendar' },
      { key: 'open', detail: 'Slack' },
      { key: 'open', detail: 'Linear' },
    ],
    enabled: true,
  },
];

const seedMessages: ChatMessage[] = [
  { id: '1', role: 'ai', text: "Hey Mohit. What's on your mind?", ts: Date.now() - 60000 },
];

const COMMANDS_STORAGE_KEY = 'commands';

const getInitialCommands = () => getItem<Command[]>(COMMANDS_STORAGE_KEY) ?? seedCommands;

const persistCommands = (commands: Command[]) => {
  setItem(COMMANDS_STORAGE_KEY, commands);
};

export const useAppStore = create<AppState>((set) => ({
  apiKey: null,
  isLoading: false,
  error: null,
  setApiKey: (key) => set({ apiKey: key }),
  clearApiKey: () => set({ apiKey: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  user: { name: 'Mohit' },
  theme: 'dark',
  vizStyle: 'rings',
  accentHue: 255,

  permissions: { mic: true, contacts: true, notifications: false, media: false },
  responseStyle: 'balanced',
  language: 'English (US)',
  ttsEnabled: true,

  messages: seedMessages,
  commands: getInitialCommands(),

  setName: (name) => set((s) => ({ user: { ...s.user, name } })),
  setTheme: (theme) => set({ theme }),
  setVizStyle: (vizStyle) => set({ vizStyle }),
  setAccentHue: (accentHue) => set({ accentHue }),
  setPermission: (k, v) => set((s) => ({ permissions: { ...s.permissions, [k]: v } })),
  setResponseStyle: (responseStyle) => set({ responseStyle }),
  setLanguage: (language) => set({ language }),
  setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),

  addMessage: (m) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...m, id: Math.random().toString(36).slice(2), ts: Date.now() },
      ],
    })),
  clearMessages: () => set({ messages: [] }),

  upsertCommand: (c) =>
    set((s) => {
      const exists = s.commands.find((x) => x.id === c.id);
      const commands = exists
        ? s.commands.map((x) => (x.id === c.id ? c : x))
        : [...s.commands, c];
      persistCommands(commands);
      return { commands };
    }),
  deleteCommand: (id) =>
    set((s) => {
      const commands = s.commands.filter((c) => c.id !== id);
      persistCommands(commands);
      return { commands };
    }),
  toggleCommand: (id) =>
    set((s) => {
      const commands = s.commands.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
      persistCommands(commands);
      return { commands };
    }),
}));

export const useTheme = () => useAppStore((s) => s.theme);
