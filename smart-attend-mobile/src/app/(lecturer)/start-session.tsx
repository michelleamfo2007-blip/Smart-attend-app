import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, useColorScheme, Platform, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch, isNetworkError } from '../../lib/api';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import QRCode from 'react-native-qrcode-svg';
import { saveOfflineLecturerAction } from '../../hooks/useOfflineSync';

const { width } = Dimensions.get('window');

export default function StartSessionScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [awaitingLocationConfirm, setAwaitingLocationConfirm] = useState(false);
  const router = useRouter();

  // Active Session State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [qrTimestamp, setQrTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    fetchLecturerClasses();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const restoreActiveSession = async () => {
        try {
          const data = await apiFetch('/api/lecturer/sessions');
          const active = (data.sessions || []).find((session: any) => session.status === 'active');
          if (active) {
            setActiveSessionId(active.id);
            setCheckedInCount(active.records?.length || 0);
            setSelectedClassId(active.class_id || active.class?.id || null);
          } else {
            setActiveSessionId((current) => (
              current && String(current).startsWith('offline-') ? current : null
            ));
          }
        } catch (err) {
          console.error('Failed to restore active session', err);
        }
      };
      restoreActiveSession();
    }, [])
  );

  // Listen to realtime attendance updates for the active session
  useEffect(() => {
    if (!activeSessionId || String(activeSessionId).startsWith('offline-')) return;

    const poll = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/lecturer/sessions/${activeSessionId}`);
        setCheckedInCount(data.checkedInCount || 0);
      } catch (err) {
        console.error('Failed to poll session', err);
      }
    }, 4000);

    const interval = setInterval(() => {
      setQrTimestamp(Date.now());
    }, 10000);

    return () => {
      clearInterval(poll);
      clearInterval(interval);
    };
  }, [activeSessionId]);

  const fetchLecturerClasses = async () => {
    setFetchingClasses(true);
    try {
      const data = await apiFetch('/api/lecturer/courses');
      const courses = data.courses || [];
      setClasses(courses);
      if (courses.length > 0) {
        setSelectedClassId(courses[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load classes');
    } finally {
      setFetchingClasses(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedClassId) {
      Alert.alert('Error', 'Please select a class first.');
      return;
    }
    setErrorMsg(null);
    setAwaitingLocationConfirm(true);
  };

  const startSessionWithLocation = async () => {
    setAwaitingLocationConfirm(false);
    setLoading(true);
    setErrorMsg(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Location permission was denied. Enable it in Settings, then try again.');
      setLoading(false);
      return;
    }

    try {
      // Force a fresh GPS fix for this class (do not reuse an old cached position)
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Location timed out. Check GPS is on and try again.')),
          20000
        )
      );

      const location: any = await Promise.race([locationPromise, timeoutPromise]);

      try {
        const data = await apiFetch('/api/lecturer/sessions', {
          method: 'POST',
          body: JSON.stringify({
            courseId: selectedClassId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }),
        });
        setActiveSessionId(data.session.id);
        setCheckedInCount(0);
      } catch (error: any) {
        if (isNetworkError(error)) {
          const mockSessionId = 'offline-' + Date.now();
          await saveOfflineLecturerAction({
            type: 'START_SESSION',
            payload: {
              class_id: selectedClassId,
              courseId: selectedClassId,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              id: mockSessionId,
            },
          });
          setActiveSessionId(mockSessionId);
          setCheckedInCount(0);
          Alert.alert('Offline Mode', 'Session started offline. It will sync when connection is restored.');
          return;
        }
        throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to get location or save session');
      if (Platform.OS === 'web') {
        window.alert(`Error: ${err.message || 'Failed to get location'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSessionId) return;
    
    setLoading(true);
    try {
      // If it's an offline session that hasn't synced yet, we can't reliably update the DB, just queue the end action
      if (activeSessionId.startsWith('offline-')) {
         await saveOfflineLecturerAction({ type: 'END_SESSION', payload: { sessionId: activeSessionId } });
         setActiveSessionId(null);
         Alert.alert('Offline Mode', 'Session ended offline.');
         return;
      }

      await apiFetch(`/api/lecturer/sessions/${activeSessionId}`, { method: 'PATCH' });
      
      setActiveSessionId(null);
      if (Platform.OS === 'web') {
        window.alert('Session ended successfully.');
      } else {
        Alert.alert('Success', 'Session ended successfully.');
      }
    } catch (err: any) {
      if (isNetworkError(err)) {
        await saveOfflineLecturerAction({ type: 'END_SESSION', payload: { sessionId: activeSessionId } });
        setActiveSessionId(null);
        Alert.alert('Offline Mode', 'Session ended offline. It will sync later.');
        return;
      }
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (activeSessionId) {
    // QR Code Display State (Dynamic with timestamp)
    const qrData = JSON.stringify({ sessionId: activeSessionId, t: qrTimestamp, timestamp: qrTimestamp, source: 'dynamic_qr' });
    
    return (
      <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
        <ThemedView style={styles.container}>
          <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}>
            <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
              <SymbolView name="qrcode.viewfinder" size={32} tintColor={theme.primary} style={{ marginBottom: 12 }} />
              <ThemedText type="title" style={[styles.titleText, { textAlign: 'center' }]}>Scan to Check In</ThemedText>
              <ThemedText style={[styles.subtitle, { textAlign: 'center' }]} themeColor="textSecondary">Students can scan this QR code to mark attendance.</ThemedText>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(600).delay(300)} style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
              <QRCode
                value={qrData}
                size={Math.min(width * 0.7, 300)}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(600).delay(400)} style={[styles.statsContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText style={{ fontSize: 16, fontWeight: '600' }} themeColor="textSecondary">Students Checked In</ThemedText>
              <ThemedText style={{ fontSize: 48, fontWeight: '800', color: theme.primary, marginTop: 8 }}>{checkedInCount}</ThemedText>
            </Animated.View>
          </ScrollView>

          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.footer}>
            <TouchableOpacity 
              style={[
                styles.startButton, 
                { backgroundColor: '#ef4444' },
                loading && styles.buttonDisabled
              ]} 
              onPress={handleEndSession}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <SymbolView name="xmark.circle.fill" size={24} tintColor="white" />
                  <Text style={styles.startButtonText}>End Session</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ThemedView>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
          <SymbolView name="location.fill" size={32} tintColor={theme.primary} style={{ marginBottom: 12 }} />
          <ThemedText type="title" style={styles.titleText}>Start Session</ThemedText>
          <ThemedText style={styles.subtitle} themeColor="textSecondary">GPS Location-Based Attendance</ThemedText>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={{ width: '100%' }}>
            {fetchingClasses ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }} />
            ) : classes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <SymbolView name="exclamationmark.triangle.fill" size={48} tintColor={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
                <ThemedText style={styles.errorText}>You are not assigned to any classes yet. Claim a module on the web dashboard first.</ThemedText>
              </View>
            ) : (
              <View style={{ width: '100%', marginBottom: Spacing.six }}>
                <ThemedText style={styles.sectionTitle}>Select a Class</ThemedText>
                <View style={styles.classList}>
                  {classes.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    return (
                      <TouchableOpacity
                        key={cls.id}
                        activeOpacity={0.7}
                        style={[
                          styles.classItem,
                          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                          isSelected && { borderColor: theme.primary, backgroundColor: theme.primaryLight }
                        ]}
                        onPress={() => setSelectedClassId(cls.id)}
                      >
                        <View style={styles.classItemRow}>
                          <View style={styles.classItemInfo}>
                            <ThemedText style={[styles.classItemTitle, isSelected && { color: theme.primary }]}>
                              {cls.name}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 13 }} themeColor="textSecondary">
                              L{cls.level} • {cls.semester} Semester
                            </ThemedText>
                          </View>
                          {isSelected && (
                            <SymbolView name="checkmark.circle.fill" size={24} tintColor={theme.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <Animated.View entering={FadeInUp.duration(600).delay(400)} style={[styles.infoBox, { backgroundColor: theme.backgroundSelected }]}>
              <SymbolView name="info.circle.fill" size={20} tintColor={theme.textSecondary} />
              <ThemedText style={styles.instructions} themeColor="textSecondary">
                Each time you start a session, the app asks for your current classroom location (fresh GPS). Students must scan the rotating QR within about 50 meters of that point.
              </ThemedText>
            </Animated.View>
            
            {errorMsg ? (
              <Animated.View entering={FadeInUp.duration(400)} style={styles.errorBox}>
                <SymbolView name="exclamationmark.circle.fill" size={20} tintColor="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : null}

          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.footer}>
          {awaitingLocationConfirm ? (
            <View style={[styles.locationPrompt, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>
                Classroom location required
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={{ marginBottom: 14, fontSize: 13, lineHeight: 18 }}>
                Every session uses your current GPS so students nearby can check in. Tap below to allow location and start.
              </ThemedText>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: theme.primary, marginBottom: 10 }]}
                onPress={startSessionWithLocation}
                activeOpacity={0.85}
              >
                <SymbolView name="location.fill" size={20} tintColor="white" />
                <Text style={styles.startButtonText}>Share location & start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelLocationButton, { borderColor: theme.border }]}
                onPress={() => setAwaitingLocationConfirm(false)}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.startButton, 
                { backgroundColor: theme.primary },
                (loading || classes.length === 0) && styles.buttonDisabled
              ]} 
              onPress={handleStartSession}
              disabled={loading || classes.length === 0}
              activeOpacity={0.8}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text style={styles.startButtonText}>Getting location…</Text>
                </>
              ) : (
                <>
                  <SymbolView name="location.fill" size={22} tintColor="white" />
                  <Text style={styles.startButtonText}>Confirm location & start</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six, alignItems: 'center' },
  titleText: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '500' },
  content: { paddingBottom: 100 },
  sectionTitle: { marginBottom: 12, fontWeight: '700', fontSize: 16 },
  classList: { gap: Spacing.three },
  classItem: {
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  classItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  classItemInfo: { flex: 1 },
  classItemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Spacing.six,
  },
  instructions: { flex: 1, fontSize: 14, lineHeight: 20 },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.six,
  },
  errorText: { color: '#ef4444', fontWeight: '600', flex: 1 },
  emptyContainer: { alignItems: 'center', paddingVertical: Spacing.six },
  footer: {
    position: 'absolute',
    bottom: Spacing.six,
    left: Spacing.four,
    right: Spacing.four,
  },
  locationPrompt: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cancelLocationButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  startButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 },
  qrContainer: {
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: Spacing.six,
  },
  statsContainer: {
    width: '100%',
    padding: Spacing.five,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  }
});
