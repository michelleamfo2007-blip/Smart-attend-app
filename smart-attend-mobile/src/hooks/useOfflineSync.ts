import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as Network from 'expo-network';

const OFFLINE_SCANS_KEY = '@offline_scans';
const OFFLINE_LECTURER_ACTIONS_KEY = '@offline_lecturer_actions';

export const saveOfflineScan = async (scanData: any) => {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_SCANS_KEY);
    const scans = existing ? JSON.parse(existing) : [];
    scans.push({ ...scanData, _queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(OFFLINE_SCANS_KEY, JSON.stringify(scans));
  } catch (error) {
    console.error("Failed to save offline scan", error);
  }
};

export const saveOfflineLecturerAction = async (actionData: any) => {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_LECTURER_ACTIONS_KEY);
    const actions = existing ? JSON.parse(existing) : [];
    actions.push({ ...actionData, _queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(OFFLINE_LECTURER_ACTIONS_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error("Failed to save offline lecturer action", error);
  }
};

export function useOfflineSync() {
  useEffect(() => {
    const syncOfflineData = async () => {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) return;

      // Sync Student Scans
      try {
        const offlineScansStr = await AsyncStorage.getItem(OFFLINE_SCANS_KEY);
        if (offlineScansStr) {
          const scans = JSON.parse(offlineScansStr);
          if (scans.length > 0) {
            console.log(`Syncing ${scans.length} offline scans to Supabase...`);
            
            for (const scan of scans) {
              const { error } = await supabase
                .from('attendance_records')
                .insert([
                  {
                    student_id: scan.student_id,
                    class_id: scan.class_id,
                    session_id: scan.session_id,
                    location: scan.location,
                    timestamp: scan.timestamp,
                  }
                ]);
              if (error) console.error("Error syncing scan", error);
            }
            
            // Clear queue on success
            await AsyncStorage.removeItem(OFFLINE_SCANS_KEY);
            console.log("Offline scans synced successfully.");
          }
        }
      } catch (err) {
        console.error("Failed during offline scan sync", err);
      }

      // Sync Lecturer Actions
      try {
         const offlineActionsStr = await AsyncStorage.getItem(OFFLINE_LECTURER_ACTIONS_KEY);
         if (offlineActionsStr) {
            const actions = JSON.parse(offlineActionsStr);
            if (actions.length > 0) {
               console.log(`Syncing ${actions.length} offline lecturer actions...`);
               for (const action of actions) {
                 if (action.type === 'START_SESSION') {
                   await supabase.from('attendance_sessions').insert([action.payload]);
                 } else if (action.type === 'END_SESSION') {
                   await supabase.from('attendance_sessions').update({ status: 'closed' }).eq('id', action.payload.sessionId);
                 }
               }
               await AsyncStorage.removeItem(OFFLINE_LECTURER_ACTIONS_KEY);
               console.log("Offline lecturer actions synced successfully.");
            }
         }
      } catch (err) {
         console.error("Failed during offline lecturer actions sync", err);
      }
    };

    // Run sync on mount
    syncOfflineData();

    // Could set up an interval to periodically check as well
    const interval = setInterval(syncOfflineData, 60000); // every minute
    return () => clearInterval(interval);
  }, []);
}
