import { create } from 'zustand';
import { getItem, removeItem, setItem } from '../utils/storage/mmkvStorage';
import { deleteOpenAIKey, loadOpenAIKey, saveOpenAIKey } from '../utils/storage/apiKeyStorage';

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
  apiKeyHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrateApiKey: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
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
  commandCount: number;

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
  { id: '1', role: 'ai', text: "Hey. What's on your mind?", ts: Date.now() - 60000 },
];

const COMMANDS_STORAGE_KEY = 'commands';
const MESSAGES_STORAGE_KEY = 'messages';
const PERMISSIONS_STORAGE_KEY = 'permissions';
const COMMAND_COUNT_STORAGE_KEY = 'command_count';
const USER_NAME_STORAGE_KEY = 'user_name';
const API_KEY_STORAGE_KEY = 'openai_api_key';

const getInitialCommands = () => getItem<Command[]>(COMMANDS_STORAGE_KEY) ?? seedCommands;
const getInitialMessages = () => getItem<ChatMessage[]>(MESSAGES_STORAGE_KEY) ?? seedMessages;
const getInitialName = () => getItem<string>(USER_NAME_STORAGE_KEY) ?? '';
const getInitialCommandCount = () =>
  getItem<number>(COMMAND_COUNT_STORAGE_KEY) ??
  getInitialMessages().filter((message) => message.role === 'user').length;
const getInitialPermissions = () =>
  getItem<Permissions>(PERMISSIONS_STORAGE_KEY) ?? {
    mic: false,
    contacts: false,
    notifications: false,
    media: false,
  };

const persistCommands = (commands: Command[]) => {
  setItem(COMMANDS_STORAGE_KEY, commands);
};

const persistMessages = (messages: ChatMessage[]) => {
  setItem(MESSAGES_STORAGE_KEY, messages);
};

const persistPermissions = (permissions: Permissions) => {
  setItem(PERMISSIONS_STORAGE_KEY, permissions);
};

const persistCommandCount = (count: number) => {
  setItem(COMMAND_COUNT_STORAGE_KEY, count);
};

export const useAppStore = create<AppState>((set) => ({
  apiKey: null,
  apiKeyHydrated: false,
  isLoading: false,
  error: null,
  hydrateApiKey: async () => {
    try {
      const keychainKey = await loadOpenAIKey();
      const mmkvKey = getItem<string>(API_KEY_STORAGE_KEY);
      const key = keychainKey ?? mmkvKey;

      if (!keychainKey && mmkvKey) {
        await saveOpenAIKey(mmkvKey);
        removeItem(API_KEY_STORAGE_KEY);
      }

      set({ apiKey: key, apiKeyHydrated: true });
    } catch (error) {
      console.error('OpenAI API key hydration error:', error);
      set({ apiKey: null, apiKeyHydrated: true });
    }
  },
  setApiKey: async (key) => {
    const trimmed = key.trim();
    await saveOpenAIKey(trimmed);
    removeItem(API_KEY_STORAGE_KEY);
    set({ apiKey: trimmed });
  },
  clearApiKey: async () => {
    await deleteOpenAIKey();
    removeItem(API_KEY_STORAGE_KEY);
    set({ apiKey: null });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  user: { name: getInitialName() },
  theme: 'dark',
  vizStyle: 'rings',
  accentHue: 255,

  permissions: getInitialPermissions(),
  responseStyle: 'balanced',
  language: 'English (US)',
  ttsEnabled: true,

  messages: getInitialMessages(),
  commands: getInitialCommands(),
  commandCount: getInitialCommandCount(),

  setName: (name) => {
    const trimmed = name.trim();
    setItem(USER_NAME_STORAGE_KEY, trimmed);
    set((s) => ({ user: { ...s.user, name: trimmed } }));
  },
  setTheme: (theme) => set({ theme }),
  setVizStyle: (vizStyle) => set({ vizStyle }),
  setAccentHue: (accentHue) => set({ accentHue }),
  setPermission: (k, v) =>
    set((s) => {
      const permissions = { ...s.permissions, [k]: v };
      persistPermissions(permissions);
      return { permissions };
    }),
  setResponseStyle: (responseStyle) => set({ responseStyle }),
  setLanguage: (language) => set({ language }),
  setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),

  addMessage: (m) =>
    set((s) => {
      const messages = [
        ...s.messages,
        { ...m, id: Math.random().toString(36).slice(2), ts: Date.now() },
      ];
      const commandCount = m.role === 'user' ? s.commandCount + 1 : s.commandCount;
      persistMessages(messages);
      persistCommandCount(commandCount);
      return { messages, commandCount };
    }),
  clearMessages: () => {
    persistMessages([]);
    set({ messages: [] });
  },

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

export const getRequiredOpenAIKey = () => {
  const key = useAppStore.getState().apiKey?.trim();

  if (!key) {
    throw new Error('Add your OpenAI API key to continue.');
  }

  if (!key.startsWith('sk-')) {
    throw new Error('OpenAI API key looks invalid. Paste a key that starts with sk-.');
  }

  return key;
};
