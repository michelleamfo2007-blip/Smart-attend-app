import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const ACCEPTABLE_RADIUS_METERS = 50;

export default function MarkAttendanceScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
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
      Alert.alert('Permission Denied', 'Permission to access location was denied');
      setMarkingId(null);
      return;
    }

    try {
      // Get student's current location
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
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
          // If already checked in, it might fail unique constraint, but we don't have one yet.
          throw insertError;
        }

        Alert.alert(
          "Success",
          `Attendance marked! You are ${distance}m away from the class location.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Out of Range",
          `You are ${distance} meters away from the class location. You must be within ${ACCEPTABLE_RADIUS_METERS} meters.`,
          [{ text: "Try Again", style: 'cancel' }]
        );
      }

    } catch (err) {
      Alert.alert('Error', 'Failed to check in to this session.');
    } finally {
      setMarkingId(null);
    }
  };

  const renderSession = ({ item }: { item: any }) => {
    const isMarking = markingId === item.id;
    const lecturerName = item.classes?.users?.name || 'Unknown Lecturer';
    
    return (
      <View style={[styles.sessionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <View style={styles.sessionInfo}>
          <ThemedText style={styles.className}>{item.classes?.name}</ThemedText>
          {item.classes?.schedule_time ? <ThemedText style={{ color: '#8b5cf6', fontSize: 13, fontWeight: 'bold' }}>{item.classes?.schedule_time}</ThemedText> : null}
          <ThemedText themeColor="textSecondary">Lecturer: {lecturerName}</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontSize: 12, marginTop: 4 }}>
            Started: {new Date(item.created_at).toLocaleTimeString()}
          </ThemedText>
        </View>
        <TouchableOpacity 
          style={[styles.markBtn, isMarking && { opacity: 0.7 }]}
          onPress={() => handleMarkAttendance(item)}
          disabled={isMarking || markingId !== null}
        >
          {isMarking ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.markBtnText}>Check In</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Active Classes</ThemedText>
        <ThemedText themeColor="textSecondary">
          Showing classes for {user?.level}, {user?.semester} Semester
        </ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#3b82f6" />
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={{ textAlign: 'center' }}>No active sessions found for your Level and Semester.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={{ gap: Spacing.four }}
          refreshing={loading}
          onRefresh={fetchActiveSessions}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  sessionCard: {
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: { flex: 1, paddingRight: Spacing.four },
  className: { fontWeight: 'bold', fontSize: 18, marginBottom: 2 },
  markBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  markBtnText: { color: 'white', fontWeight: 'bold' }
});
