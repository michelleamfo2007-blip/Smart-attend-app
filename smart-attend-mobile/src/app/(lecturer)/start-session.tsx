import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, useColorScheme, Platform, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
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
  const router = useRouter();

  // Active Session State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);

  useEffect(() => {
    fetchLecturerClasses();
  }, []);

  // Listen to realtime attendance updates for the active session
  useEffect(() => {
    if (!activeSessionId) return;

    const channel = supabase
      .channel('attendance_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'attendance_records',
        filter: `session_id=eq.${activeSessionId}`
      }, (payload) => {
        console.log('New check-in!', payload);
        setCheckedInCount((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  const fetchLecturerClasses = async () => {
    setFetchingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, level, semester, start_time, end_time')
        .eq('lecturer_id', user?.id);

      if (error) throw error;
      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClassId(data[0].id);
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

    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      setLoading(false);
      return;
    }

    try {
      // Get location with a timeout
      const locationPromise = Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Location fetch timed out. Please check your GPS/Location settings.")), 10000)
      );

      let location: any = await Promise.race([locationPromise, timeoutPromise]);

      // Close old active sessions for this class
      await supabase
        .from('attendance_sessions')
        .update({ status: 'closed' })
        .eq('class_id', selectedClassId)
        .eq('status', 'active');

      let expiresAtStr: string;
      const selectedClassObj = classes.find(c => c.id === selectedClassId);
      if (selectedClassObj && selectedClassObj.end_time) {
        const [h, m] = selectedClassObj.end_time.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m, 0, 0);
        // If the end time has already passed today, assume it's for tomorrow (or keep it as is)
        if (date.getTime() < Date.now()) {
          date.setDate(date.getDate() + 1);
        }
        expiresAtStr = date.toISOString();
      } else {
        // Fallback to 2 hours if no dynamic time is set
        expiresAtStr = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      }

      const sessionPayload = {
          class_id: selectedClassId,
          lecturer_id: user?.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          expires_at: expiresAtStr,
          status: 'active'
      };
      
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert(sessionPayload)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
           // Mock a session ID since we are offline
           const mockSessionId = 'offline-' + Date.now();
           await saveOfflineLecturerAction({ type: 'START_SESSION', payload: { ...sessionPayload, id: mockSessionId } });
           setActiveSessionId(mockSessionId);
           setCheckedInCount(0);
           Alert.alert('Offline Mode', 'Session started offline. It will sync when connection is restored.');
           return;
        }
        throw error;
      }

      setActiveSessionId(data.id);
      setCheckedInCount(0);
      
    } catch (err: any) {
      console.error("Start Session Error:", err);
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

      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'closed' })
        .eq('id', activeSessionId);
        
      if (error) {
         if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
           await saveOfflineLecturerAction({ type: 'END_SESSION', payload: { sessionId: activeSessionId } });
           setActiveSessionId(null);
           Alert.alert('Offline Mode', 'Session ended offline. It will sync later.');
           return;
         }
         throw error;
      }
      
      setActiveSessionId(null);
      if (Platform.OS === 'web') {
        window.alert('Session ended successfully.');
      } else {
        Alert.alert('Success', 'Session ended successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (activeSessionId) {
    // QR Code Display State
    const qrData = JSON.stringify({ sessionId: activeSessionId });
    
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
                <ThemedText style={styles.errorText}>You are not assigned to any classes.</ThemedText>
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
                Starting a session will generate a 2-hour QR code and record your current GPS location. Students must scan the QR code within 50 meters of this location.
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
              <ActivityIndicator color="white" />
            ) : (
              <>
                <SymbolView name="qrcode" size={24} tintColor="white" />
                <Text style={styles.startButtonText}>Start Attendance (Generate QR)</Text>
              </>
            )}
          </TouchableOpacity>
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
