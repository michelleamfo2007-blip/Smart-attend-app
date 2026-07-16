import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function StudentOverviewScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [upcomingClass, setUpcomingClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useFocusEffect(
    useCallback(() => {
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
              .from('attendance_sessions')
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

          // 3. Fetch Upcoming Class (mock logic: just get the next class the student is enrolled in)
          if (matchedClasses && matchedClasses.length > 0) {
             const { data: upcoming } = await supabase
               .from('classes')
               .select('name, schedule_time')
               .in('id', matchedClasses.map(c => c.id))
               .limit(1)
               .maybeSingle();
             setUpcomingClass(upcoming);
          }
        } catch (err) {
          console.error("Failed to fetch stats", err);
        } finally {
          setLoading(false);
        }
      };

      fetchStats();
    }, [user])
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
          <ThemedText type="title" style={styles.welcomeText}>Welcome, {user?.name?.split(' ')[0]}</ThemedText>
          <ThemedText style={styles.subtitle} themeColor="textSecondary">Student Portal</ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
              <SymbolView name="calendar.badge.clock" size={24} tintColor={theme.primary} />
            </View>
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats?.attended}/{stats?.totalSessions}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.statLabel}>Sessions Attended</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: stats?.attendanceRate < 85 ? '#ef4444' : theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: stats?.attendanceRate < 85 ? 'rgba(239, 68, 68, 0.1)' : theme.primaryLight }]}>
              <SymbolView name="chart.bar.fill" size={24} tintColor={stats?.attendanceRate < 85 ? '#ef4444' : theme.primary} />
            </View>
            <ThemedText style={[styles.statValue, { color: stats?.attendanceRate < 85 ? '#ef4444' : theme.primary }]}>{stats?.attendanceRate}%</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.statLabel}>Attendance Rate</ThemedText>
            
            {/* Progress Bar */}
            <View style={[styles.progressContainer, { backgroundColor: theme.backgroundSelected }]}>
               <View style={[styles.progressBar, { width: `${stats?.attendanceRate}%`, backgroundColor: stats?.attendanceRate < 85 ? '#ef4444' : theme.primary }]} />
            </View>
            
            {stats?.attendanceRate < 85 && (
              <View style={styles.warningBadge}>
                 <Text style={styles.warningText}>Warning: Below target</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {upcomingClass && (
          <Animated.View entering={FadeInDown.duration(600).delay(350)} style={[styles.upcomingCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <SymbolView name="calendar" size={20} tintColor={theme.text} />
                <ThemedText style={{ fontWeight: 'bold' }}>Upcoming Class</ThemedText>
             </View>
             <ThemedText style={{ color: theme.primary, fontWeight: '800', fontSize: 16 }}>{upcomingClass.name}</ThemedText>
             <ThemedText themeColor="textSecondary">{upcomingClass.schedule_time || 'Schedule not set'}</ThemedText>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.primary }]} 
            onPress={() => router.push('/(student)/scan-qr')}
            activeOpacity={0.8}
          >
            <SymbolView name="qrcode.viewfinder" size={24} tintColor="white" />
            <Text style={styles.primaryButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton, { borderColor: theme.primary }]} 
            onPress={() => router.push('/(student)/history')}
            activeOpacity={0.8}
          >
            <SymbolView name="clock.arrow.circlepath" size={24} tintColor={theme.primary} />
            <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>View My History</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
            <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  header: {
    marginBottom: Spacing.six,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.six,
  },
  statCard: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionContainer: {
    gap: Spacing.four,
  },
  actionButton: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButton: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: Spacing.two,
  },
  logoutButton: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 15,
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  warningBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  warningText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  upcomingCard: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.six,
  }
});
