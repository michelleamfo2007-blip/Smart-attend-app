import { Platform } from 'react-native';

// When running on physical device, change this to your computer's local IP address (e.g. '192.168.1.5')
const LOCAL_IP = '192.168.1.100'; // REPLACE THIS with your local IP if testing on a physical phone

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  } else if (Platform.OS === 'android') {
    // Android emulator alias to host localhost
    return 'http://10.0.2.2:3000';
  } else {
    // iOS simulator or physical device (fallback to local IP)
    return `http://${LOCAL_IP}:3000`;
  }
};

export const API_URL = getBaseUrl();

/**
 * Helper to make API calls to the Next.js backend
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  
  // Ensure headers exist
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `API Error: ${response.status}`);
  }

  return data;
}
