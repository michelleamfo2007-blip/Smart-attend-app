import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, FlatList, useColorScheme, Platform } from 'react-native';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

const ACCEPTABLE_RADIUS_METERS = 50;

export default function MarkAttendanceScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    setLoading(true);
    try {
      const { data: activeSessions, error } = await supabase
        .from('active_sessions')
        .select(`
          id,
          class_id,
          latitude,
          longitude,
          created_at,
          classes!inner(name, level, semester, schedule_time, users(name))
        `)
        .eq('active', true)
        .eq('classes.level', user?.level)
        .eq('classes.semester', user?.semester)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(activeSessions || []);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (session: any) => {
    setMarkingId(session.id);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('Permission Denied: Location access is required for attendance.');
      } else {
        Alert.alert('Permission Denied', 'Location access is required for attendance.');
      }
      setMarkingId(null);
      return;
    }

    try {
      // Get student's current location with a timeout to prevent hanging on emulators
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Location fetch timed out. Please check your GPS/Location settings.")), 10000)
      );

      let location: any = await Promise.race([locationPromise, timeoutPromise]);
      
      // Calculate distance
      const distance = getDistance(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: session.latitude, longitude: session.longitude }
      );

      if (distance <= ACCEPTABLE_RADIUS_METERS) {
        // Save the successful attendance record
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            class_id: session.class_id,
            student_id: user?.id,
            student_name: user?.name,
          });
        
        if (insertError) {
          throw insertError;
        }

        if (Platform.OS === 'web') {
          window.alert(`Success! 🎉\nAttendance marked securely.\nYou were ${distance} meters from the lecturer.`);
          router.back();
        } else {
          Alert.alert(
            "Success! 🎉",
            `Attendance marked securely.\nYou were ${distance} meters from the lecturer.`,
            [{ text: "Awesome", onPress: () => router.back() }]
          );
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Out of Range 📍\nYou are ${distance} meters away from the class.\nYou must be within ${ACCEPTABLE_RADIUS_METERS} meters to mark your attendance.`);
        } else {
          Alert.alert(
            "Out of Range 📍",
            `You are ${distance} meters away from the class.\n\nYou must be within ${ACCEPTABLE_RADIUS_METERS} meters to mark your attendance. Please move closer.`,
            [{ text: "Try Again", style: 'cancel' }]
          );
        }
      }
    } catch (err: any) {
      console.error("Attendance Error:", err);
      if (Platform.OS === 'web') {
        window.alert(`Check-In Failed. Error details: ${err?.message || JSON.stringify(err) || 'Unknown error'}`);
      } else {
        Alert.alert('Check-In Failed', `Error details: ${err?.message || JSON.stringify(err) || 'Unknown error'}`);
      }
    } finally {
      setMarkingId(null);
    }
  };

  const renderSession = ({ item, index }: { item: any; index: number }) => {
    const isMarking = markingId === item.id;
    const lecturerName = item.classes?.users?.name || 'Unknown Lecturer';
    const timeFormatted = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <Animated.View entering={FadeInUp.duration(500).delay(index * 100)}>
        <View style={[styles.sessionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          
          <View style={styles.cardHeader}>
            <View style={styles.classInfo}>
              <ThemedText style={styles.className}>{item.classes?.name}</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 13 }}>{lecturerName}</ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.badgeText}>Live</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardFooter}>
            <View style={styles.timeInfo}>
              <SymbolView name="clock.fill" size={14} tintColor={theme.textSecondary} />
              <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>Started at {timeFormatted}</ThemedText>
            </View>
            
            <TouchableOpacity 
              style={[styles.markBtn, isMarking && { opacity: 0.7 }]}
              onPress={() => handleMarkAttendance(item)}
              disabled={isMarking || markingId !== null}
              activeOpacity={0.8}
            >
              {isMarking ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <SymbolView name="location.viewfinder" size={16} tintColor="white" />
                  <Text style={styles.markBtnText}>Check In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </Animated.View>
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
          <SymbolView name="antenna.radiowaves.left.and.right" size={32} tintColor={theme.primary} style={{ marginBottom: 12 }} />
          <ThemedText type="title" style={styles.titleText}>Live Sessions</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Searching for active classes near you...
          </ThemedText>
        </Animated.View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
        ) : sessions.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.emptyContainer}>
            <SymbolView name="moon.zzz.fill" size={48} tintColor={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
            <ThemedText style={{ textAlign: 'center', fontSize: 16 }} themeColor="textSecondary">No active sessions found for your Level and Semester right now.</ThemedText>
          </Animated.View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSession}
            contentContainerStyle={{ gap: Spacing.four, paddingBottom: Spacing.six }}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchActiveSessions}
          />
        )}
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six, alignItems: 'center' },
  titleText: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.six },
  sessionCard: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  classInfo: { flex: 1, paddingRight: 12 },
  className: { fontWeight: '700', fontSize: 18, marginBottom: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { color: '#10b981', fontWeight: '700', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#E2E8F0', opacity: 0.5, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markBtn: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  markBtnText: { color: 'white', fontWeight: '700', fontSize: 14 }
});
