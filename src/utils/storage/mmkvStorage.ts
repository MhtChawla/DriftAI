import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({
  id: 'drift-ai-storage',
});

export const setItem = (key: string, value: any): boolean => {
  try {
    storage.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('MMKV setItem error:', error);
    return false;
  }
};

export const getItem = <T = any>(key: string): T | null => {
  try {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('MMKV getItem error:', error);
    return null;
  }
};

export const removeItem = (key: string): boolean => {
  try {
    storage.remove(key);
    return true;
  } catch (error) {
    console.error('MMKV removeItem error:', error);
    return false;
  }
};

export const clear = (): boolean => {
  try {
    storage.clearAll();
    return true;
  } catch (error) {
    console.error('MMKV clear error:', error);
    return false;
  }
};

export const getAllKeys = (): string[] => {
  try {
    return storage.getAllKeys();
  } catch (error) {
    console.error('MMKV getAllKeys error:', error);
    return [];
  }
};

export default storage;
