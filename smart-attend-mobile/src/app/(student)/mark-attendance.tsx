import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { saveOfflineScan } from '../../hooks/useOfflineSync';
import { apiFetch, isNetworkError } from '../../lib/api';
import { getDeviceBinding } from '../../lib/deviceId';
import { Colors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const theme = Colors.light;
const SCAN_SIZE = Math.min(width - 64, 280);

type ReadyLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

async function getFreshStudentLocation(): Promise<ReadyLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required before you can scan.');
  }

  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) {
    throw new Error('Turn on Location / GPS in phone settings, then try again.');
  }

  // Warm GPS, then take a high-accuracy reading (indoor phones often need this).
  try {
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    // ignore warm-up failure
  }

  const locationPromise = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Location timed out. Stand near a window and try again.')), 20000)
  );

  const studentLocation = await Promise.race([locationPromise, timeoutPromise]);

  if ((studentLocation as any).mocked) {
    throw new Error('Fake GPS detected. Disable mock location to check in.');
  }

  return {
    latitude: studentLocation.coords.latitude,
    longitude: studentLocation.coords.longitude,
    accuracy:
      typeof studentLocation.coords.accuracy === 'number'
        ? studentLocation.coords.accuracy
        : null,
  };
}

export default function MarkAttendanceScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [readyLocation, setReadyLocation] = useState<ReadyLocation | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Share your location, then scan the lecturer QR.');
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  const openScanner = async () => {
    setStatusType('info');
    setStatusMsg('Checking your classroom location…');
    setGettingLocation(true);

    try {
      const location = await getFreshStudentLocation();
      setReadyLocation(location);

      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setStatusType('error');
          setStatusMsg('Camera permission is required to scan.');
          return;
        }
      }

      setScanned(false);
      setProcessing(false);
      setStatusType('info');
      setStatusMsg(
        location.accuracy != null
          ? `Location ready (±${Math.round(location.accuracy)}m). Point at the lecturer QR.`
          : 'Location ready. Point at the lecturer QR code.'
      );
      setScannerOpen(true);
    } catch (error: any) {
      setReadyLocation(null);
      setStatusType('error');
      setStatusMsg(error.message || 'Could not get your location.');
      Alert.alert(
        'Location needed',
        error.message || 'Allow location access before scanning so we can confirm you are in class.'
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    setStatusType('info');
    setStatusMsg('QR detected! Refreshing location…');

    try {
      let qrData: any;
      try {
        qrData = JSON.parse(data);
      } catch {
        throw new Error('Invalid QR Code format.');
      }

      if (!qrData.sessionId) {
        if (qrData.type === 'smartattend_student') {
          throw new Error('This is a student ID code. Ask an attendance officer to scan it.');
        }
        throw new Error('Invalid QR Code. Use the live class QR from your lecturer.');
      }

      const qrTimestamp = qrData.t || qrData.timestamp;
      if (!qrTimestamp) {
        throw new Error('Invalid QR Code format. Dynamic QR required.');
      }

      const qrAgeMs = Date.now() - qrTimestamp;
      if (qrAgeMs > 30000 || qrAgeMs < -10000) {
        throw new Error('This QR code has expired. Scan the current code on screen.');
      }

      const sessionId = qrData.sessionId;
      const method =
        qrData.source === 'desktop_qr' || qrData.method === 'desktop_qr'
          ? 'desktop_qr'
          : 'dynamic_qr';

      // Fresh high-accuracy fix at scan time (fallback to pre-check location).
      let studentLocation = readyLocation;
      try {
        studentLocation = await getFreshStudentLocation();
        setReadyLocation(studentLocation);
      } catch (locErr: any) {
        if (!studentLocation) throw locErr;
      }

      const binding = await getDeviceBinding();
      const scanData = {
        sessionId,
        latitude: studentLocation!.latitude,
        longitude: studentLocation!.longitude,
        accuracy: studentLocation!.accuracy,
        qrTimestamp,
        device_id: binding.deviceId,
        device_fingerprint: binding.deviceFingerprint,
        method,
      };

      try {
        await apiFetch('/api/student/attendance', {
          method: 'POST',
          body: JSON.stringify(scanData),
        });
      } catch (insertError: any) {
        if (isNetworkError(insertError)) {
          await saveOfflineScan(scanData);
          setStatusType('info');
          setStatusMsg('Offline: Scan saved and will sync later.');
          setTimeout(() => {
            setScannerOpen(false);
            router.replace('/(student)');
          }, 2500);
          return;
        }
        throw insertError;
      }

      setStatusType('success');
      setStatusMsg('Successfully checked in!');
      setTimeout(() => {
        setScannerOpen(false);
        router.replace('/(student)');
      }, 2000);
    } catch (error: any) {
      setStatusType('error');
      setStatusMsg(error.message || 'Could not mark attendance.');
      setProcessing(false);
      setTimeout(() => setScanned(false), 2500);
    }
  };

  const statusColor =
    statusType === 'error' ? '#ef4444' : statusType === 'success' ? '#34d399' : theme.primary;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Mark Present</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Share your location first, then scan the live QR from your lecturer.
          </Text>
        </View>

        {!scannerOpen ? (
          <View style={[styles.readyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="location-outline" size={36} color={theme.primary} />
            </View>
            <Text style={[styles.readyTitle, { color: theme.text }]}>Location before scan</Text>
            <Text style={[styles.readyText, { color: theme.textSecondary }]}>
              1. Allow location when asked{'\n'}
              2. Wait until GPS locks your position{'\n'}
              3. Scanner opens — point at the lecturer QR
            </Text>
            {statusType === 'error' ? (
              <Text style={styles.preError}>{statusMsg}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: gettingLocation ? 0.75 : 1 }]}
              onPress={openScanner}
              activeOpacity={0.85}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="navigate-outline" size={20} color="#fff" />
              )}
              <Text style={styles.primaryButtonText}>
                {gettingLocation ? 'Getting location…' : 'Share location & open scanner'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerSection}>
            <View style={styles.cameraCard}>
              {permission?.granted ? (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
              ) : (
                <View style={styles.cameraFallback}>
                  <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                    Camera permission needed
                  </Text>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.primary }]}
                    onPress={requestPermission}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={[styles.statusBox, { backgroundColor: statusColor }]}>
              {processing && statusType === 'info' ? (
                <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              ) : null}
              {statusType === 'success' ? (
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 10 }} />
              ) : null}
              {statusType === 'error' ? (
                <Ionicons name="alert-circle" size={20} color="#fff" style={{ marginRight: 10 }} />
              ) : null}
              <Text style={styles.statusText}>{statusMsg}</Text>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={() => {
                setScannerOpen(false);
                setScanned(false);
                setProcessing(false);
              }}
            >
              <Text style={{ color: theme.text, fontWeight: '700' }}>Close Scanner</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.eight,
  },
  header: { marginBottom: Spacing.five },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  readyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  readyTitle: { fontSize: 20, fontWeight: '800' },
  readyText: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
  preError: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  scannerSection: { gap: 12 },
  cameraCard: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  camera: { flex: 1 },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
