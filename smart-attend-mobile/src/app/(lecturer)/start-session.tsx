import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, useColorScheme, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

export default function StartSessionScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLecturerClasses();
  }, []);

  const fetchLecturerClasses = async () => {
    setFetchingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, level, semester')
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

      // Invalidate old active sessions for this class
      await supabase
        .from('active_sessions')
        .update({ active: false })
        .eq('class_id', selectedClassId);

      // Create new active session
      const { error } = await supabase
        .from('active_sessions')
        .insert({
          class_id: selectedClassId,
          lecturer_id: user?.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          active: true
        });

      if (error) throw error;

      if (Platform.OS === 'web') {
        window.alert(`Session Started! Location saved securely.\nLat: ${location.coords.latitude.toFixed(4)}\nLon: ${location.coords.longitude.toFixed(4)}`);
        router.back();
      } else {
        Alert.alert(
          "Session Started",
          `Location saved securely!\nLat: ${location.coords.latitude.toFixed(4)}\nLon: ${location.coords.longitude.toFixed(4)}`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
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
                Starting a session will record your current GPS location. Students will need to be physically within 50 meters of this exact location to mark themselves present.
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
                <SymbolView name="location.circle.fill" size={24} tintColor="white" />
                <Text style={styles.startButtonText}>Broadcast GPS Location</Text>
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
  content: { paddingBottom: 100 }, // spacing for floating button
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
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  startButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 },
});
