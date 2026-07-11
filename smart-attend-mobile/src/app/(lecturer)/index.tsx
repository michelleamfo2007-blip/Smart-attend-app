import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function LecturerOverviewScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Welcome, {user?.name}</ThemedText>
        <ThemedText themeColor="textSecondary">Lecturer Portal</ThemedText>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>3</ThemedText>
          <ThemedText themeColor="textSecondary">Active Courses</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>120</ThemedText>
          <ThemedText themeColor="textSecondary">Total Students</ThemedText>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.startSessionButton} 
        onPress={() => router.push('/(lecturer)/start-session')}
      >
        <Text style={styles.startSessionText}>Start Attendance Session</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.rosterButton} 
        onPress={() => router.push('/(lecturer)/roster')}
      >
        <Text style={styles.rosterText}>View Class Roster</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six },
  statsContainer: { flexDirection: 'row', gap: Spacing.four, marginBottom: Spacing.six },
  statCard: {
    flex: 1,
    padding: Spacing.four,
    backgroundColor: 'rgba(139, 92, 246, 0.1)', // Light purple
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 4 },
  startSessionButton: {
    padding: 16,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  startSessionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  rosterButton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    marginBottom: Spacing.four,
  },
  rosterText: { color: '#8b5cf6', fontWeight: 'bold', fontSize: 16 },
  logoutButton: {
    padding: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  logoutText: { color: 'white', fontWeight: 'bold' }
});
