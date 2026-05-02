import { useCallback } from 'react';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import type { Permissions } from '../store/useAppStore';

const isAndroid13Plus = () => Number(Platform.Version) >= 33;

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

  const syncPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    const next: Permissions = {
      mic: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO),
      contacts: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS),
      notifications: isAndroid13Plus()
        ? await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
        : true,
      media: await PermissionsAndroid.check(
        isAndroid13Plus()
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      ),
    };

    (Object.keys(next) as (keyof Permissions)[]).forEach((key) => {
      setPermission(key, next[key]);
    });
  }, [setPermission]);

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
    async (enable: boolean) => {
      if (!enable) {
        setPermission('notifications', false);
        return;
      }
      if (Platform.OS === 'android' && isAndroid13Plus()) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notifications Permission',
            message: 'Drift needs notification access for reminders and reply suggestions.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        const granted = result === PermissionsAndroid.RESULTS.GRANTED;
        setPermission('notifications', granted);
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          showSettingsAlert('Notifications', 'reminders and reply suggestions');
        }
      } else {
        setPermission('notifications', true);
      }
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
        const permission = isAndroid13Plus()
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const result = await PermissionsAndroid.request(permission, {
          title: 'Media & Storage Permission',
          message: 'Drift needs media access to work with photos and files.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        });
        const granted = result === PermissionsAndroid.RESULTS.GRANTED;
        setPermission('media', granted);
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
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

  return { requestMic, requestContacts, requestNotifications, requestMedia, syncPermissions };
}
