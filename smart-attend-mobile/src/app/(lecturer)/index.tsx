import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

export default function LecturerOverviewScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [stats, setStats] = useState({ courses: 0, students: 0 });
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);

  // useFocusEffect ensures data re-fetches when navigating back to this screen
  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Stats
      const { count: coursesCount } = await supabase.from('classes').select('*', { count: 'exact', head: true }).eq('lecturer_id', user?.id);
      const { count: studentsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT');
      setStats({ courses: coursesCount || 0, students: studentsCount || 0 });

      // Fetch Active Sessions
      const { data: sessions, error } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          created_at,
          classes (name)
        `)
        .eq('lecturer_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setActiveSessions(sessions || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    setEndingSessionId(sessionId);
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);
        
      if (error) throw error;
      
      // Remove from list visually
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (Platform.OS === 'web') {
        window.alert("Session ended successfully. Attendance is now closed.");
      }
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') {
        window.alert(`Failed to end session: ${err.message}`);
      } else {
        Alert.alert("Error", "Failed to end the session.");
      }
    } finally {
      setEndingSessionId(null);
    }
  };

  const confirmEndSession = (sessionId: string, className: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to end the session for ${className}? Students will no longer be able to check in.`);
      if (confirmed) {
        handleEndSession(sessionId);
      }
    } else {
      Alert.alert(
        "End Session",
        `Are you sure you want to close attendance for ${className}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "End Session", style: "destructive", onPress: () => handleEndSession(sessionId) }
        ]
      );
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
            <ThemedText type="title" style={styles.welcomeText}>Welcome, {user?.name?.split(' ')[0]}</ThemedText>
            <ThemedText style={styles.subtitle} themeColor="textSecondary">Lecturer Portal</ThemedText>
          </Animated.View>

          {/* Active Sessions Section */}
          <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.activeSessionsContainer}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.two }}>Live Sessions</ThemedText>
            
            {loading && activeSessions.length === 0 ? (
               <ActivityIndicator color={theme.primary} style={{ marginVertical: Spacing.four }} />
            ) : activeSessions.length === 0 ? (
              <View style={[styles.emptySessions, { backgroundColor: theme.backgroundSelected }]}>
                <SymbolView name="moon.zzz.fill" size={24} tintColor={theme.textSecondary} style={{ marginBottom: 8, opacity: 0.5 }} />
                <ThemedText themeColor="textSecondary" style={{ fontSize: 13, textAlign: 'center' }}>
                  No active sessions. Tap below to start one.
                </ThemedText>
              </View>
            ) : (
              activeSessions.map((session, index) => {
                const isEnding = endingSessionId === session.id;
                const className = session.classes?.name || 'Unknown Class';
                return (
                  <Animated.View 
                    key={session.id}
                    layout={Layout.springify()}
                    entering={FadeInUp.delay(index * 100)} 
                    style={[styles.liveCard, { backgroundColor: theme.backgroundElement, borderColor: '#10b981' }]}
                  >
                    <View style={styles.liveCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.liveBadgeRow}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveBadgeText}>ONGOING</Text>
                        </View>
                        <ThemedText style={styles.liveClassName}>{className}</ThemedText>
                        <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>
                          Started at {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </ThemedText>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.endBtn, isEnding && { opacity: 0.7 }]}
                        onPress={() => confirmEndSession(session.id, className)}
                        disabled={isEnding}
                      >
                        {isEnding ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <SymbolView name="stop.circle.fill" size={16} tintColor="white" />
                            <Text style={styles.endBtnText}>End</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                )
              })
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="books.vertical.fill" size={24} tintColor={theme.primary} />
              </View>
              {loading ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.courses}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Active Courses</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="person.3.sequence.fill" size={24} tintColor={theme.primary} />
              </View>
              {loading ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.students}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Total Students</ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.actionSection}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.two }}>Quick Actions</ThemedText>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.primary }]} 
              onPress={() => router.push('/(lecturer)/start-session')}
              activeOpacity={0.8}
            >
              <SymbolView name="play.circle.fill" size={24} tintColor="white" />
              <Text style={styles.primaryButtonText}>Start Attendance Session</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton, { borderColor: theme.primary }]} 
              onPress={() => router.push('/(lecturer)/roster')}
              activeOpacity={0.8}
            >
              <SymbolView name="list.bullet.rectangle.fill" size={24} tintColor={theme.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>View Class Roster</Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>

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
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six },
  welcomeText: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '500' },
  
  activeSessionsContainer: { marginBottom: Spacing.six },
  emptySessions: {
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  liveCard: {
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: Spacing.three,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  liveCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  liveBadgeText: { color: '#10b981', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  liveClassName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  endBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  endBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  statsContainer: { flexDirection: 'row', gap: Spacing.four, marginBottom: Spacing.six },
  statCard: {
    flex: 1, padding: Spacing.four, borderRadius: 16, borderWidth: 1,
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
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 2 },
  secondaryButtonText: { fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  footer: { marginTop: 'auto', marginBottom: Spacing.two },
  logoutButton: {
    flexDirection: 'row', padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 }
});
