import { useState, useCallback, useEffect } from 'react';
import notifee, {
  AndroidImportance,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import { useAppStore } from '../store/useAppStore';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  delay?: number;
}

interface UseNotificationsReturn {
  isInitialized: boolean;
  sendNotification: (payload: NotificationPayload) => Promise<void>;
  sendScheduledNotification: (payload: NotificationPayload) => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const setAppError = useAppStore((state) => state.setError);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Create default channel for Android
        await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });

        // Listen to foreground events
        notifee.onForegroundEvent(({ type, detail }) => {
          if (type === EventType.PRESS) {
            // Handle notification press
            console.log('Notification pressed:', detail);
          }
        });

        // Listen to background events
        notifee.onBackgroundEvent(async ({ type, detail }) => {
          if (type === EventType.PRESS) {
            console.log('Background notification pressed:', detail);
          }
        });

        setIsInitialized(true);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to initialize notifications';
        setAppError(errorMsg);
      }
    };

    initNotifications();
  }, [setAppError]);

  const sendNotification = useCallback(
    async (payload: NotificationPayload) => {
      try {
        await notifee.displayNotification({
          title: payload.title,
          body: payload.body,
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
          data: payload.data || {},
        });
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to send notification';
        setAppError(errorMsg);
      }
    },
    [setAppError]
  );

  const sendScheduledNotification = useCallback(
    async (payload: NotificationPayload) => {
      try {
        const delay = payload.delay || 5000;
        await notifee.createTriggerNotification(
          {
            title: payload.title,
            body: payload.body,
            android: {
              channelId: 'default',
              smallIcon: 'ic_launcher',
              sound: 'default',
            },
            data: payload.data || {},
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: Date.now() + delay,
          }
        );
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to send scheduled notification';
        setAppError(errorMsg);
      }
    },
    [setAppError]
  );

  return {
    isInitialized,
    sendNotification,
    sendScheduledNotification,
  };
};
