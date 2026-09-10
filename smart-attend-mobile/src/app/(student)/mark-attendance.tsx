import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { saveOfflineScan } from '../../hooks/useOfflineSync';
import { apiFetch, isNetworkError } from '../../lib/api';
import { getDeviceId } from '../../lib/deviceId';
import { Colors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const theme = Colors.light;
const SCAN_SIZE = Math.min(width - 64, 280);

export default function MarkAttendanceScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Point at the lecturer QR code');
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  const openScanner = async () => {
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
    setStatusMsg('Point at the lecturer QR code');
    setScannerOpen(true);
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    setStatusType('info');
    setStatusMsg('QR detected! Verifying...');

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

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required for attendance.');
      }

      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Location fetch timed out.')), 10000)
      );
      const studentLocation: any = await Promise.race([locationPromise, timeoutPromise]);

      if (studentLocation.mocked) {
        throw new Error('Fake GPS detected. Disable mock location to check in.');
      }

      const scanData = {
        sessionId,
        latitude: studentLocation.coords.latitude,
        longitude: studentLocation.coords.longitude,
        qrTimestamp,
        device_id: await getDeviceId(),
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
    statusType === 'error' ? '#ef4444' : statusType === 'success' ? '#10b981' : theme.primary;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Mark Present</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Scan the live QR from your lecturer after you join that class.
          </Text>
        </View>

        {!scannerOpen ? (
          <View style={[styles.readyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="qr-code-outline" size={36} color={theme.primary} />
            </View>
            <Text style={[styles.readyTitle, { color: theme.text }]}>Ready to check in</Text>
            <Text style={[styles.readyText, { color: theme.textSecondary }]}>
              1. Join the class on Overview{'\n'}
              2. Wait for the lecturer to start a session{'\n'}
              3. Open the scanner and point at the QR
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={openScanner}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Open Scanner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerSection}>
            <View style={[styles.cameraCard, { borderColor: theme.border }]}>
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
              <View style={styles.scanFrame} pointerEvents="none">
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
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
  scannerSection: { gap: 14 },
  cameraCard: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
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
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 28,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
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
