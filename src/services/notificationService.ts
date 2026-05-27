// src/services/notificationService.ts
// Call setupPushNotifications(token) from a screen that has access to
// the Redux auth token (e.g. HomeScreen on mount).
import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { API_BASE_URL } from '../config/firebase';
import { store } from '../store';
import { addNotification } from '../app/reducers/notifications';

const messagingInstance = getMessaging();

const normalizeNotificationType = (rawType?: unknown): string => {
  const type = String(rawType ?? '').toLowerCase();
  if (type.startsWith('payment')) return 'payment';
  if (type.startsWith('reservation') || type.startsWith('booking')) return 'reservation';
  if (type.startsWith('message') || type.startsWith('contact')) return 'message';
  return type || 'general';
};

const notificationFromRemoteMessage = (remoteMessage: any) => {
  const data = remoteMessage?.data ?? {};
  const type = normalizeNotificationType(data.type);

  return {
    id:        String(remoteMessage?.messageId ?? data.id ?? `${data.type ?? 'push'}-${Date.now()}`),
    title:     remoteMessage?.notification?.title ?? data.title ?? 'Notification',
    body:      remoteMessage?.notification?.body ?? data.body ?? data.message ?? '',
    type,
    read:      false,
    createdAt: new Date().toISOString(),
    data,
  };
};

const registerDeviceToken = async (fcmToken: string, authToken: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/fcm-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ fcmToken, platform: Platform.OS }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`FCM token registration failed (${response.status}) ${body}`.trim());
  }
};

export const setupPushNotifications = async (authToken: string): Promise<void> => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (permission !== PermissionsAndroid.RESULTS.GRANTED) return;
  }

  const authStatus = await requestPermission(messagingInstance);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) return;

  const fcmToken = await getToken(messagingInstance);
  await registerDeviceToken(fcmToken, authToken);

  onTokenRefresh(messagingInstance, (newFcmToken) => registerDeviceToken(newFcmToken, authToken));
};

export const listenForNotifications = () => {
  const unsubscribeForeground = onMessage(messagingInstance, async (remoteMessage) => {
    console.log('Foreground notification:', remoteMessage);
    store.dispatch(addNotification(notificationFromRemoteMessage(remoteMessage)));
  });

  const unsubscribeOpened = onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
    store.dispatch(addNotification(notificationFromRemoteMessage(remoteMessage)));
  });

  getInitialNotification(messagingInstance).then((remoteMessage) => {
    if (remoteMessage) {
      store.dispatch(addNotification(notificationFromRemoteMessage(remoteMessage)));
    }
  });

  return () => {
    unsubscribeForeground();
    unsubscribeOpened();
  };
};
