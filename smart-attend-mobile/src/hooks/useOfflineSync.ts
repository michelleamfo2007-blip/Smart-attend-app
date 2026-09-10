import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { apiFetch, isNetworkError } from '../lib/api';

const OFFLINE_SCANS_KEY = '@offline_scans';
const OFFLINE_LECTURER_ACTIONS_KEY = '@offline_lecturer_actions';

export const saveOfflineScan = async (scanData: any) => {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_SCANS_KEY);
    const scans = existing ? JSON.parse(existing) : [];
    scans.push({ ...scanData, _queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(OFFLINE_SCANS_KEY, JSON.stringify(scans));
  } catch (error) {
    console.error('Failed to save offline scan', error);
  }
};

export const saveOfflineLecturerAction = async (actionData: any) => {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_LECTURER_ACTIONS_KEY);
    const actions = existing ? JSON.parse(existing) : [];
    actions.push({ ...actionData, _queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(OFFLINE_LECTURER_ACTIONS_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error('Failed to save offline lecturer action', error);
  }
};

export function useOfflineSync() {
  useEffect(() => {
    const syncOfflineData = async () => {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) return;

      try {
        const offlineScansStr = await AsyncStorage.getItem(OFFLINE_SCANS_KEY);
        if (offlineScansStr) {
          const scans = JSON.parse(offlineScansStr);
          if (scans.length > 0) {
            const remaining = [];
            for (const scan of scans) {
              try {
                await apiFetch('/api/student/attendance', {
                  method: 'POST',
                  body: JSON.stringify({
                    sessionId: scan.session_id || scan.sessionId,
                    latitude: scan.latitude,
                    longitude: scan.longitude,
                    qrTimestamp: scan.qrTimestamp,
                    device_id: scan.device_id,
                  }),
                });
              } catch (error) {
                if (isNetworkError(error)) {
                  remaining.push(scan);
                } else {
                  console.error('Error syncing scan', error);
                }
              }
            }
            if (remaining.length > 0) {
              await AsyncStorage.setItem(OFFLINE_SCANS_KEY, JSON.stringify(remaining));
            } else {
              await AsyncStorage.removeItem(OFFLINE_SCANS_KEY);
            }
          }
        }
      } catch (err) {
        console.error('Failed during offline scan sync', err);
      }

      try {
        const offlineActionsStr = await AsyncStorage.getItem(OFFLINE_LECTURER_ACTIONS_KEY);
        if (offlineActionsStr) {
          const actions = JSON.parse(offlineActionsStr);
          if (actions.length > 0) {
            const remaining = [];
            for (const action of actions) {
              try {
                if (action.type === 'START_SESSION') {
                  await apiFetch('/api/lecturer/sessions', {
                    method: 'POST',
                    body: JSON.stringify({
                      courseId: action.payload.class_id || action.payload.courseId,
                      latitude: action.payload.latitude,
                      longitude: action.payload.longitude,
                    }),
                  });
                } else if (action.type === 'END_SESSION') {
                  const sessionId = action.payload.sessionId;
                  if (sessionId && !String(sessionId).startsWith('offline-')) {
                    await apiFetch(`/api/lecturer/sessions/${sessionId}`, { method: 'PATCH' });
                  }
                }
              } catch (error) {
                if (isNetworkError(error)) {
                  remaining.push(action);
                } else {
                  console.error('Error syncing lecturer action', error);
                }
              }
            }
            if (remaining.length > 0) {
              await AsyncStorage.setItem(OFFLINE_LECTURER_ACTIONS_KEY, JSON.stringify(remaining));
            } else {
              await AsyncStorage.removeItem(OFFLINE_LECTURER_ACTIONS_KEY);
            }
          }
        }
      } catch (err) {
        console.error('Failed during offline lecturer actions sync', err);
      }
    };

    syncOfflineData();
    const interval = setInterval(syncOfflineData, 60000);
    return () => clearInterval(interval);
  }, []);
}
