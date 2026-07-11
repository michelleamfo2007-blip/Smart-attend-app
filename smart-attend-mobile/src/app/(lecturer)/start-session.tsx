import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function StartSessionScreen() {
  const { user } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStartSession = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      setLoading(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced
      });
      
      // Find the first class assigned to this lecturer
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('lecturer_id', user?.id)
        .limit(1);

      if (classError || !classes || classes.length === 0) {
        throw new Error('You must be assigned to at least one class to start a session!');
      }

      const classId = classes[0].id;

      // Invalidate old active sessions for this class
      await supabase
        .from('active_sessions')
        .update({ active: false })
        .eq('class_id', classId);

      // Create new active session
      const { error } = await supabase
        .from('active_sessions')
        .insert({
          class_id: classId,
          lecturer_id: user?.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          active: true
        });

      if (error) throw error;

      Alert.alert(
        "Session Started",
        `Location saved to database successfully!\nLat: ${location.coords.latitude.toFixed(4)}\nLon: ${location.coords.longitude.toFixed(4)}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to get location or save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Start Attendance Session</ThemedText>
        <ThemedText themeColor="textSecondary">Create a new GPS-based session</ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.instructions}>
          Starting a session will record your current GPS location. Students will need to be within 50 meters of this location to mark themselves as present.
        </ThemedText>
        
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : null}

        <TouchableOpacity 
          style={[styles.startButton, loading && styles.buttonDisabled]} 
          onPress={handleStartSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.startButtonText}>Start Session Here</Text>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  instructions: { textAlign: 'center', marginBottom: Spacing.eight, fontSize: 16, lineHeight: 24 },
  startButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  startButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  errorText: { color: 'red', marginBottom: Spacing.four, textAlign: 'center' }
});
