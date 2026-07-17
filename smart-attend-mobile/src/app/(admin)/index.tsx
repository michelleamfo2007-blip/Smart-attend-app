import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

export default function AdminOverviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [stats, setStats] = useState({ users: 0, classes: 0, lecturers: 0, students: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: lecturersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'LECTURER');
      const { count: studentsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT');
      const { count: classesCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
      
      setStats({ 
        users: usersCount || 0, 
        classes: classesCount || 0,
        lecturers: lecturersCount || 0,
        students: studentsCount || 0
      });

      // Calculate At-Risk Students (Attendance < 75%)
      const { data: allStudents } = await supabase.from('users').select('id, name').eq('role', 'STUDENT');
      const { data: allRecords } = await supabase.from('attendance_records').select('student_id');
      const { count: totalSessions } = await supabase.from('attendance_sessions').select('*', { count: 'exact', head: true });
      
      if (allStudents && allRecords && totalSessions && totalSessions > 0) {
         const studentAttendance = allStudents.map(student => {
            const attendedCount = allRecords.filter(r => r.student_id === student.id).length;
            const rate = (attendedCount / totalSessions) * 100;
            return { ...student, rate, attendedCount };
         });
         
         const atRisk = studentAttendance.filter(s => s.rate < 75 && totalSessions >= 3); // Only flag if at least 3 sessions have occurred
         setAtRiskStudents(atRisk);
      }

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
            <ThemedText type="title" style={styles.welcomeText}>Welcome, {user?.name?.split(' ')[0]}</ThemedText>
            <ThemedText style={styles.subtitle} themeColor="textSecondary">Admin Control Center</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="person.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.students}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Students</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="person.crop.rectangle.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.lecturers}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Lecturers</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="person.3.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.users}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Total Users</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="book.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.classes}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Total Classes</ThemedText>
            </View>
          </Animated.View>

          {atRiskStudents.length > 0 && (
            <Animated.View entering={FadeInDown.duration(600).delay(350)} style={styles.atRiskContainer}>
              <View style={styles.atRiskHeaderRow}>
                <SymbolView name="exclamationmark.triangle.fill" size={20} tintColor="#ef4444" />
                <ThemedText style={styles.atRiskTitle}>At-Risk Students (&lt; 75% Attendance)</ThemedText>
              </View>
              {atRiskStudents.slice(0, 5).map((student, idx) => (
                <View key={student.id} style={[styles.atRiskCard, { backgroundColor: theme.backgroundElement, borderColor: '#ef4444' }]}>
                  <ThemedText style={{ fontWeight: 'bold' }}>{student.name}</ThemedText>
                  <View style={styles.atRiskBadge}>
                    <Text style={styles.atRiskBadgeText}>{Math.round(student.rate)}% Rate</Text>
                  </View>
                </View>
              ))}
              {atRiskStudents.length > 5 && (
                <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 8 }}>
                  + {atRiskStudents.length - 5} more students at risk
                </ThemedText>
              )}
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.actionSection}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.two }}>Quick Actions</ThemedText>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.primary }]} 
              onPress={() => router.push('/(admin)/manage-users')}
              activeOpacity={0.8}
            >
              <SymbolView name="person.crop.circle.badge.plus" size={24} tintColor="white" />
              <Text style={styles.primaryButtonText}>Manage Users</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.primary }]} 
              onPress={() => router.push('/(admin)/manage-classes')}
              activeOpacity={0.8}
            >
              <SymbolView name="folder.fill.badge.plus" size={24} tintColor="white" />
              <Text style={styles.primaryButtonText}>Manage Classes</Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six },
  welcomeText: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '500' },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, marginBottom: Spacing.six },
  statCard: {
    flexGrow: 1, minWidth: '45%', padding: Spacing.four, borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  iconContainer: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '500' },
  actionSection: { gap: Spacing.four, marginBottom: Spacing.six },
  actionButton: {
    flexDirection: 'row', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  primaryButton: {
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  secondaryButtonText: { fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  atRiskContainer: {
    marginBottom: Spacing.six,
    padding: Spacing.four,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)'
  },
  atRiskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.four
  },
  atRiskTitle: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16
  },
  atRiskCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.two
  },
  atRiskBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  atRiskBadgeText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12
  }
});
