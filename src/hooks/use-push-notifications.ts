import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface PushNotificationState {
  expoPushToken: string | null;
  permissionGranted: boolean;
  lastNotification: unknown | null;
}

export function usePushNotifications(userId: string | undefined): PushNotificationState {
  const [expoPushToken, setExpoPushToken]         = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastNotification, setLastNotification] = useState<unknown | null>(null);

  useEffect(() => {
    if (
      !userId
      || Platform.OS === 'web'
      || !Device.isDevice
      || Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ) return;

    let cancelled = false;
    let notificationSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('cas-assist', {
            name: 'CAS Assist',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#208AEF',
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        const finalStatus = existing.status === 'granted'
          ? existing.status
          : (await Notifications.requestPermissionsAsync()).status;
        if (cancelled || finalStatus !== 'granted') return;

        setPermissionGranted(true);
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId
          ?? Constants.easConfig?.projectId;
        if (projectId) {
          const token = await Notifications.getExpoPushTokenAsync({ projectId });
          if (!cancelled) setExpoPushToken(token.data);
        }

        notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
          setLastNotification(notification);
        });
        responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
          // Typed payload routing is added with the notification infrastructure phase.
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('Push notifications are unavailable in this runtime.', {
            name: error instanceof Error ? error.name : 'UnknownError',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      notificationSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [userId]);

  return { expoPushToken, permissionGranted, lastNotification };
}

// ── Push token registration ───────────────────────────────────
