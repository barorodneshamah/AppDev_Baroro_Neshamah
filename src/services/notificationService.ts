// src/services/notificationService.ts
// Call setupPushNotifications(token) from a screen that has access to
// the Redux auth token (e.g. HomeScreen on mount).
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { API_BASE_URL } from '../config/firebase';

const registerDeviceToken = async (fcmToken: string, authToken: string): Promise<void> => {
  await fetch(`${API_BASE_URL}/api/device-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token: fcmToken, platform: Platform.OS }),
  });
};

export const setupPushNotifications = async (authToken: string): Promise<void> => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) return;

  const fcmToken = await messaging().getToken();
  await registerDeviceToken(fcmToken, authToken);

  messaging().onTokenRefresh((newFcmToken) => registerDeviceToken(newFcmToken, authToken));
};

export const listenForNotifications = () =>
  messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground notification:', remoteMessage);
  });
