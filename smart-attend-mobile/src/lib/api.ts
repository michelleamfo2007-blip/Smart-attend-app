import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_STORAGE_KEY = '@smartattend_token';
export const AUTH_STORAGE_KEY = '@smartattend_user';

export function getApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'https://www.smartattend.co';
}

export const API_URL = getApiUrl();

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error: any) {
    const networkError = new Error(error?.message || 'Network request failed');
    (networkError as any).isNetworkError = true;
    throw networkError;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `API Error: ${response.status}`);
  }

  return data;
}

export function isNetworkError(error: any) {
  if (error?.isNetworkError) return true;
  const message = String(error?.message || '');
  return (
    message.includes('Network request failed') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('The Internet connection appears to be offline')
  );
}
