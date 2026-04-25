import { create } from 'zustand';

interface AppState {
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  apiKey: null,
  isLoading: false,
  error: null,

  setApiKey: (key: string) => set({ apiKey: key }),
  clearApiKey: () => set({ apiKey: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
}));
