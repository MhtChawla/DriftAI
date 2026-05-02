import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

// Requests permissions that the app needs silently at startup.
// WAKE_LOCK is a normal permission — auto-granted from manifest, no runtime request needed.
export function useStartupPermissions() {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const request = async () => {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      ]);
    };
    request();
  }, []);
}
