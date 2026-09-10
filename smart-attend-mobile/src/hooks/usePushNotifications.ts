import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    const setup = async () => {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const token = await registerForPushNotificationsAsync();
        if (!cancelled) setExpoPushToken(token);

        notificationListener.current = Notifications.addNotificationReceivedListener((next) => {
          setNotification(next);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
          console.log(response);
        });
      } catch (error) {
        console.error('Push setup failed', error);
      }
    };

    setup();

    return () => {
      cancelled = true;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return undefined;
  if (!Device.isDevice) return undefined;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e01e37',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return undefined;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : (await Notifications.getExpoPushTokenAsync()).data;

    return token;
  } catch (error) {
    console.error('Error getting Expo Push Token:', error);
    return undefined;
  }
}

export async function scheduleClassReminder(className: string, startTime: string) {
  if (Platform.OS === 'web') return;

  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const now = new Date();
    const classTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    const reminderTime = new Date(classTime.getTime() - 5 * 60000);

    if (reminderTime > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Class',
          body: `Your class ${className} starts in 5 minutes! Tap here to start attendance.`,
          data: { route: '/(lecturer)/start-session' },
        },
        trigger: reminderTime as any,
      });
    }
  } catch (err) {
    console.error('Failed to schedule class reminder', err);
  }
}
