import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
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
        setSelectedClassId(data[0].id); // default to first class
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
      let location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced
      });

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

      Alert.alert(
        "Session Started",
        `Location saved successfully!\nLat: ${location.coords.latitude.toFixed(4)}\nLon: ${location.coords.longitude.toFixed(4)}`,
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
        {fetchingClasses ? (
          <ActivityIndicator size="large" color="#8b5cf6" style={{ marginBottom: 20 }} />
        ) : classes.length === 0 ? (
          <ThemedText style={styles.errorText}>You are not assigned to any classes.</ThemedText>
        ) : (
          <View style={{ width: '100%', marginBottom: 20 }}>
            <ThemedText style={{ marginBottom: 10, fontWeight: 'bold' }}>Select Class:</ThemedText>
            <ScrollView style={styles.classList} nestedScrollEnabled>
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.classItem,
                    selectedClassId === cls.id && styles.classItemSelected
                  ]}
                  onPress={() => setSelectedClassId(cls.id)}
                >
                  <Text style={[
                    styles.classItemText,
                    selectedClassId === cls.id && styles.classItemTextSelected
                  ]}>
                    {cls.name} (L{cls.level}, {cls.semester})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ThemedText style={styles.instructions}>
          Starting a session will record your current GPS location. Students will need to be within 50 meters of this location to mark themselves as present.
        </ThemedText>
        
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : null}

        <TouchableOpacity 
          style={[
            styles.startButton, 
            (loading || classes.length === 0) && styles.buttonDisabled
          ]} 
          onPress={handleStartSession}
          disabled={loading || classes.length === 0}
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
  content: { flex: 1, justifyContent: 'flex-start', alignItems: 'center' },
  classList: { maxHeight: 200, width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  classItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  classItemSelected: { backgroundColor: '#8b5cf6' },
  classItemText: { fontSize: 16, color: '#333' },
  classItemTextSelected: { color: '#fff', fontWeight: 'bold' },
  instructions: { textAlign: 'center', marginBottom: Spacing.eight, fontSize: 14, lineHeight: 20, marginTop: 10 },
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
