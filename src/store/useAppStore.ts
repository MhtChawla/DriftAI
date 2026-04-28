import { create } from 'zustand';

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

  addMessage: (m: Omit<ChatMessage, 'id' | 'ts'>) => void;
  clearMessages: () => void;

  upsertCommand: (c: Command) => void;
  deleteCommand: (id: string) => void;
  toggleCommand: (id: string) => void;
};

const seedCommands: Command[] = [
  {
    id: 'gym',
    name: 'Gym Mode',
    phrase: "I'm heading to the gym",
    desc: 'Open Spotify · DND on · Start 60-min timer',
    actions: [
      { key: 'open', detail: 'Spotify' },
      { key: 'set', detail: 'DND on' },
      { key: 'timer', detail: '60 min' },
    ],
    enabled: true,
  },
  {
    id: 'wind-down',
    name: 'Wind Down',
    phrase: 'Wind down',
    desc: 'Dim lights · Play sleep playlist · Set 7am alarm',
    actions: [
      { key: 'set', detail: 'Lights 20%' },
      { key: 'play', detail: 'Sleep playlist' },
      { key: 'set', detail: 'Alarm 7:00' },
    ],
    enabled: true,
  },
  {
    id: 'standup',
    name: 'Standup Brief',
    phrase: 'Standup brief',
    desc: 'Read calendar · Summarize Slack · Open Linear',
    actions: [
      { key: 'open', detail: 'Calendar' },
      { key: 'msg', detail: 'Slack summary' },
      { key: 'open', detail: 'Linear' },
    ],
    enabled: true,
  },
];

const seedMessages: ChatMessage[] = [
  { id: '1', role: 'ai', text: "Hey Mohit. What's on your mind?", ts: Date.now() - 60000 },
];

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

  messages: seedMessages,
  commands: seedCommands,

  setName: (name) => set((s) => ({ user: { ...s.user, name } })),
  setTheme: (theme) => set({ theme }),
  setVizStyle: (vizStyle) => set({ vizStyle }),
  setAccentHue: (accentHue) => set({ accentHue }),
  setPermission: (k, v) => set((s) => ({ permissions: { ...s.permissions, [k]: v } })),
  setResponseStyle: (responseStyle) => set({ responseStyle }),
  setLanguage: (language) => set({ language }),

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
      return exists
        ? { commands: s.commands.map((x) => (x.id === c.id ? c : x)) }
        : { commands: [...s.commands, c] };
    }),
  deleteCommand: (id) => set((s) => ({ commands: s.commands.filter((c) => c.id !== id) })),
  toggleCommand: (id) =>
    set((s) => ({
      commands: s.commands.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    })),
}));

export const useTheme = () => useAppStore((s) => s.theme);
