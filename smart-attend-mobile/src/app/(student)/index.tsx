import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '../../lib/supabase';

export default function StudentOverviewScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Get how many sessions the student actually attended
        const { data: myRecords } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('student_id', user?.id);

        const attendedCount = myRecords ? myRecords.length : 0;

        // 2. Get total possible sessions for this student's level/semester
        const { data: matchedClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('level', user?.level)
          .eq('semester', user?.semester);

        let totalSessionsCount = 0;
        if (matchedClasses && matchedClasses.length > 0) {
          const classIds = matchedClasses.map(c => c.id);
          const { data: allSessions } = await supabase
            .from('active_sessions')
            .select('id')
            .in('class_id', classIds);
            
          totalSessionsCount = allSessions ? allSessions.length : 0;
        }

        const total = Math.max(totalSessionsCount, attendedCount);
        const rate = total === 0 ? 100 : Math.round((attendedCount / total) * 100);

        setStats({
          totalSessions: totalSessionsCount,
          attended: attendedCount,
          attendanceRate: rate,
        });
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Welcome, {user?.name}</ThemedText>
        <ThemedText themeColor="textSecondary">Student Portal</ThemedText>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{stats?.attended}/{stats?.totalSessions}</ThemedText>
          <ThemedText themeColor="textSecondary">Sessions Attended</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{stats?.attendanceRate}%</ThemedText>
          <ThemedText themeColor="textSecondary">Attendance Rate</ThemedText>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.markAttendanceButton} 
        onPress={() => router.push('/(student)/mark-attendance')}
      >
        <Text style={styles.markAttendanceText}>Mark Attendance</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.historyButton} 
        onPress={() => router.push('/(student)/history')}
      >
        <Text style={styles.historyText}>View My History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  header: {
    marginBottom: Spacing.six,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.six,
  },
  statCard: {
    flex: 1,
    padding: Spacing.four,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // Light blue
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  markAttendanceButton: {
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  markAttendanceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyButton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: Spacing.four,
  },
  historyText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    padding: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
