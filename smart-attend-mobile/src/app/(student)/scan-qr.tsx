import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

export default function ScanQRScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Scan the QR code displayed by your lecturer');
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  const MAX_DISTANCE_METERS = 50;

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <ThemedText style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to show the camera</ThemedText>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    setStatusType('info');
    setStatusMsg('Verifying location and checking in...');

    try {
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid QR Code format.');
      }

      if (!qrData.sessionId) {
        throw new Error('Invalid QR Code payload.');
      }

      const sessionId = qrData.sessionId;

      // 1. Fetch Session from Supabase
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Session not found or invalid.');
      }

      // 2. Check if active
      if (sessionData.status !== 'active') {
        throw new Error('This attendance session has been closed.');
      }

      // 3. Check expiry
      if (new Date(sessionData.expires_at) < new Date()) {
        throw new Error('This QR code has expired.');
      }

      // 4. Verify GPS Location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required for attendance.');
      }

      const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Location fetch timed out.")), 10000)
      );
      const studentLocation: any = await Promise.race([locationPromise, timeoutPromise]);

      const distance = getDistanceFromLatLonInM(
        studentLocation.coords.latitude,
        studentLocation.coords.longitude,
        sessionData.latitude,
        sessionData.longitude
      );

      if (distance > MAX_DISTANCE_METERS) {
        throw new Error(`You are too far from the classroom (${Math.round(distance)}m away). You must be within ${MAX_DISTANCE_METERS}m.`);
      }

      // 5. Mark Attendance
      // Due to unique_student_session constraint, if they already scanned, this will throw an error
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          student_id: user?.id,
          class_id: sessionData.class_id,
          session_id: sessionData.id,
          date: new Date().toISOString().split('T')[0],
          status: 'Present',
          marked_by: 'Student'
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          throw new Error('You have already marked attendance for this session.');
        }
        throw insertError;
      }

      setStatusType('success');
      setStatusMsg('Successfully checked in! 🎉');
      
      if (Platform.OS === 'web') {
        window.alert('Successfully checked in!');
      }

      // Auto go back after 2 seconds
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 2500);

    } catch (error: any) {
      console.error(error);
      setStatusType('error');
      setStatusMsg(error.message || 'An unexpected error occurred.');
      setProcessing(false);
      // Wait 3 seconds before allowing another scan
      setTimeout(() => setScanned(false), 3000);
    }
  };

  const getStatusColor = () => {
    if (statusType === 'error') return '#ef4444';
    if (statusType === 'success') return '#10b981';
    return '#3b82f6';
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <SymbolView name="chevron.left" size={24} tintColor="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Scanner Box */}
          <View style={styles.scannerBoxContainer}>
            <View style={styles.scannerBox}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Status Toast */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.footer}>
            <View style={[styles.statusBox, { backgroundColor: getStatusColor() }]}>
              {processing && statusType === 'info' && <ActivityIndicator color="white" style={{ marginRight: 12 }} />}
              {statusType === 'success' && <SymbolView name="checkmark.circle.fill" size={24} tintColor="white" style={{ marginRight: 12 }} />}
              {statusType === 'error' && <SymbolView name="exclamationmark.circle.fill" size={24} tintColor="white" style={{ marginRight: 12 }} />}
              <Text style={styles.statusText}>{statusMsg}</Text>
            </View>
          </Animated.View>

        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  scannerBoxContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerBox: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'white',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  footer: {
    padding: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
