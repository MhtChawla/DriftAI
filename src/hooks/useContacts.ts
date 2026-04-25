import { useState, useCallback } from 'react';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import { useAppStore } from '../store/appStore';

export interface Contact {
  recordID: string;
  displayName: string;
  phoneNumbers: Array<{ label?: string; number: string }>;
  emailAddresses: Array<{ label?: string; email: string }>;
}

interface UseContactsReturn {
  contacts: Contact[];
  isLoading: boolean;
  hasPermission: boolean;
  fetchContacts: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

export const useContacts = (): UseContactsReturn => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const setAppError = useAppStore((state) => state.setError);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await requestMultiple([
        PERMISSIONS.IOS.CONTACTS,
        PERMISSIONS.ANDROID.READ_CONTACTS,
      ]);

      const hasAccess =
        result[PERMISSIONS.IOS.CONTACTS] === 'granted' ||
        result[PERMISSIONS.ANDROID.READ_CONTACTS] === 'granted';

      setHasPermission(hasAccess);
      return hasAccess;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to request permissions';
      setAppError(errorMsg);
      return false;
    }
  }, [setAppError]);

  const fetchContacts = useCallback(async () => {
    try {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setAppError('Contacts permission denied');
          return;
        }
      }

      setIsLoading(true);
      const loadedContacts = await Contacts.getAll();
      setContacts(loadedContacts);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch contacts';
      setAppError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission, requestPermission, setAppError]);

  return {
    contacts,
    isLoading,
    hasPermission,
    fetchContacts,
    requestPermission,
  };
};
