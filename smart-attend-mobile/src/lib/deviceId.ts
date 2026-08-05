import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'smart_attend_device_id';

export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate a new UUID for this device installation
      deviceId = Crypto.randomUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Error getting/generating device ID:', error);
    // Fallback to a temporary random ID in case AsyncStorage fails, though this is rare
    return Crypto.randomUUID();
  }
}
