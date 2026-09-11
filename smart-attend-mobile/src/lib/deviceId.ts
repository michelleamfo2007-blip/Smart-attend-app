import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'smart_attend_device_id_v2';
const LEGACY_ASYNC_KEY = 'smart_attend_device_id';

export type DeviceBindingPayload = {
  deviceId: string;
  deviceFingerprint: string;
};

async function readSecure(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeSecure(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn('SecureStore write failed, falling back to AsyncStorage', error);
    await AsyncStorage.setItem(key, value);
  }
}

async function getStableHardwareId() {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() || null;
    }
    if (Platform.OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) || null;
    }
  } catch {
    return null;
  }
  return null;
}

async function sha256(value: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

/** Stable install/device id — prefers hardware ID, else SecureStore UUID. */
export async function getDeviceId(): Promise<string> {
  const binding = await getDeviceBinding();
  return binding.deviceId;
}

/** deviceId + hardware fingerprint for stronger server-side binding. */
export async function getDeviceBinding(): Promise<DeviceBindingPayload> {
  const hardwareId = await getStableHardwareId();

  let deviceId =
    (await readSecure(DEVICE_ID_KEY)) ||
    (await AsyncStorage.getItem(DEVICE_ID_KEY)) ||
    (await AsyncStorage.getItem(LEGACY_ASYNC_KEY));

  if (!deviceId) {
    if (hardwareId) {
      deviceId = await sha256(`smartattend-hw:${Platform.OS}:${hardwareId}`);
    } else {
      deviceId = Crypto.randomUUID();
    }
    await writeSecure(DEVICE_ID_KEY, deviceId);
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  } else {
    // Migrate legacy AsyncStorage id into SecureStore when possible.
    await writeSecure(DEVICE_ID_KEY, deviceId);
  }

  const fingerprintSource = [
    Platform.OS,
    Device.brand || 'unknown',
    Device.modelName || 'unknown',
    Device.osName || Platform.OS,
    String(Device.osVersion || '').split('.')[0] || '0',
    hardwareId || 'no-hw',
    Application.applicationId || 'app',
  ].join('|');

  const deviceFingerprint = await sha256(fingerprintSource);

  return { deviceId, deviceFingerprint };
}
