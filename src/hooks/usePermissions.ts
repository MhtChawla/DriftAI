import { useCallback } from 'react';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { useAppStore } from '../store/useAppStore';

function showSettingsAlert(permissionName: string, usage: string) {
  Alert.alert(
    `${permissionName} Blocked`,
    `Drift needs ${permissionName.toLowerCase()} access for ${usage}. Enable it in your device settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}

export function usePermissions() {
  const setPermission = useAppStore((s) => s.setPermission);

  const requestMic = useCallback(
    async (enable: boolean) => {
      if (!enable) {
        setPermission('mic', false);
        return;
      }
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Drift needs microphone access for voice input.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        const granted = result === PermissionsAndroid.RESULTS.GRANTED;
        setPermission('mic', granted);
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          showSettingsAlert('Microphone', 'voice input');
        }
      } else {
        Alert.alert(
          'Microphone',
          'Enable microphone access in Settings > DriftAI.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    },
    [setPermission]
  );

  const requestContacts = useCallback(
    async (enable: boolean) => {
      if (!enable) {
        setPermission('contacts', false);
        return;
      }
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'Drift needs contacts access to send messages and place calls.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        const granted = result === PermissionsAndroid.RESULTS.GRANTED;
        setPermission('contacts', granted);
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          showSettingsAlert('Contacts', 'sending messages and calls');
        }
      } else {
        Alert.alert(
          'Contacts',
          'Enable contacts access in Settings > tAI.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    },
    [setPermission]
  );

  const requestNotifications = useCallback(
    (enable: boolean) => {
      // System permission is requested at startup (useStartupPermissions).
      // This toggle just controls whether the app sends notifications.
      setPermission('notifications', enable);
    },
    [setPermission]
  );

  const requestMedia = useCallback(
    async (enable: boolean) => {
      if (!enable) {
        setPermission('media', false);
        return;
      }
      if (Platform.OS === 'android') {
        // Android 13+ uses READ_MEDIA_IMAGES; older versions use READ_EXTERNAL_STORAGE
        const permsToRequest = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        const results = await PermissionsAndroid.requestMultiple(permsToRequest);
        const granted =
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED ||
          results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
        setPermission('media', granted);
        const blockedAny = Object.values(results).some(
          (r) => r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        );
        if (blockedAny && !granted) {
          showSettingsAlert('Media & Storage', 'accessing photos and files');
        }
      } else {
        Alert.alert(
          'Media & Storage',
          'Enable photo library access in Settings > DriftAI.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    },
    [setPermission]
  );

  return { requestMic, requestContacts, requestNotifications, requestMedia };
}
