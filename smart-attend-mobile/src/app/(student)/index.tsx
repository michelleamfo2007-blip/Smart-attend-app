import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Platform, TextInput, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { apiFetch } from '../../lib/api';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function StudentOverviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = Colors.light;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    attended: 0,
    totalSessions: 0,
    attendanceRate: 100,
    coursesCount: 0,
  });
  const [nextClass, setNextClass] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Greeting logic
  const currentHour = new Date().getHours();
  let greeting = 'Good Evening';
  if (currentHour < 12) greeting = 'Good Morning';
  else if (currentHour < 17) greeting = 'Good Afternoon';

  const todayStr = new Date().toLocaleDateString(undefined, { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await apiFetch('/api/student/dashboard');
      const myRecords = data.records || [];
      const matchedClasses = data.classes || [];
      const allSessions = data.sessions || [];
      const live = data.activeSessions || [];

      const attendedCount = myRecords.length;
      setRecentAttendance(myRecords.slice(0, 3));
      setActiveSessions(live);

      const totalSessionsCount = allSessions.length;
      const upcoming = matchedClasses[0] || null;
      const total = Math.max(totalSessionsCount, attendedCount);
      const rate = total === 0 ? 100 : Math.round((attendedCount / total) * 100);

      setStats({
        attended: attendedCount,
        totalSessions: totalSessionsCount,
        attendanceRate: rate,
        coursesCount: matchedClasses.length,
      });

      setNextClass(upcoming);
    } catch (err) {
      // keep empty overview if dashboard fails
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      const refresh = setInterval(fetchData, 15000);
      return () => clearInterval(refresh);
    }, [fetchData])
  );

  const handleJoinClass = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Join Class', 'Enter the class invite code from your lecturer.');
      return;
    }

    setJoining(true);
    try {
      const data = await apiFetch('/api/student/courses/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: code }),
      });
      setJoinCode('');
      Alert.alert('Joined', data.message || 'You joined the class.');
      setLoading(true);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Could not join', err.message || 'Invalid class code.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.background }} color={theme.primary} />;
  }

  return (
    <Animated.View entering={FadeIn.duration(600)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION - Web Dashboard Style */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.headerTextContainer}>
             <Text style={[styles.greetingText, { color: theme.text }]}>{greeting}, {user?.name?.split(' ')[0]} 👋</Text>
             <Text style={[styles.dateText, { color: theme.textSecondary }]}>{todayStr}</Text>
          </View>
          <View style={styles.headerActions}>
             <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => router.push('/(student)/notifications')}>
               <Ionicons name="notifications-outline" size={20} color={theme.text} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.avatarButton]} onPress={() => router.push('/(student)/profile')}>
               <LinearGradient colors={['#e01e37', '#85101f']} style={styles.avatarGradient}>
                 <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
               </LinearGradient>
             </TouchableOpacity>
          </View>
        </Animated.View>

        {/* LIVE ATTENDANCE SESSION */}
        <Animated.View entering={FadeInDown.duration(500).delay(80)} style={{ marginBottom: Spacing.five }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Live now</Text>
          {activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                activeOpacity={0.88}
                onPress={() => router.push('/(student)/mark-attendance')}
                style={{ marginBottom: 12 }}
              >
                <LinearGradient
                  colors={session.alreadyMarked ? ['#15803d', '#166534'] : ['#e01e37', '#9f1239']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liveCard}
                >
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>
                      {session.alreadyMarked ? 'MARKED PRESENT' : 'ATTENDANCE OPEN'}
                    </Text>
                  </View>
                  <Text style={styles.liveClassName}>
                    {session.class?.course_code ? `${session.class.course_code} · ` : ''}
                    {session.class?.name || 'Class session'}
                  </Text>
                  <Text style={styles.liveHint}>
                    {session.alreadyMarked
                      ? 'You are already checked in for this session.'
                      : 'Tap to open scanner and mark attendance'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyLiveCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons name="radio-outline" size={22} color={theme.textSecondary} />
              <Text style={[styles.emptyLiveTitle, { color: theme.text }]}>No live attendance session</Text>
              <Text style={[styles.emptyLiveText, { color: theme.textSecondary }]}>
                When your lecturer starts a session for a class you joined, it will show up here so you can scan.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* JOIN CLASS */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={{ marginBottom: Spacing.five }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Join Class</Text>
          <View style={[styles.joinCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.joinHint, { color: theme.textSecondary }]}>
              Enter the invite code your lecturer shared to add that class.
            </Text>
            <View style={styles.joinRow}>
              <TextInput
                style={[
                  styles.joinInput,
                  {
                    backgroundColor: theme.backgroundSelected,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="e.g. A1B2C3"
                placeholderTextColor={theme.textSecondary}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: theme.primary, opacity: joining ? 0.7 : 1 }]}
                onPress={handleJoinClass}
                disabled={joining}
                activeOpacity={0.85}
              >
                {joining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.joinButtonText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* LARGE SCAN BUTTON */}
        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={{ marginBottom: Spacing.six }}>
           <TouchableOpacity onPress={() => router.push('/(student)/mark-attendance')} activeOpacity={0.85}>
             <LinearGradient 
                colors={['#e01e37', '#b91c2c']} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.largeScanButton}
             >
               <Ionicons name="qr-code-outline" size={32} color="#FFF" />
               <View style={styles.scanButtonTextContainer}>
                  <Text style={styles.scanButtonTitle}>Scan QR Code</Text>
                  <Text style={styles.scanButtonSubtitle}>
                    {activeSessions.length > 0 ? 'A session is open — tap to scan' : 'Opens scanner when a session is live'}
                  </Text>
               </View>
               <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
             </LinearGradient>
           </TouchableOpacity>
        </Animated.View>

        {/* STATISTICS GRID - Clean Web Style */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.statsGrid}>
           <View style={[styles.statBox, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Sessions</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.attended}</Text>
           </View>
           <View style={[styles.statBox, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: stats.attendanceRate < 75 ? '#fef2f2' : '#f0fdf4' }]}>
                <Ionicons name="pie-chart-outline" size={18} color={stats.attendanceRate < 75 ? '#ef4444' : '#22c55e'} />
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Attendance Rate</Text>
              <Text style={[styles.statValue, { color: stats.attendanceRate < 75 ? '#ef4444' : theme.text }]}>{stats.attendanceRate}%</Text>
           </View>
           <View style={[styles.statBox, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="book-outline" size={18} color={theme.textSecondary} />
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Joined Classes</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.coursesCount}</Text>
           </View>
        </Animated.View>

        {/* SCHEDULED CLASS (timetable — not the live session) */}
        {nextClass && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ marginBottom: Spacing.six }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Joined class</Text>
            <LinearGradient
              colors={['#e01e37', '#b76e79', '#c9a07a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextClassCard}
            >
              <View style={styles.nextClassContent}>
                <View style={styles.nextClassHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextClassCodeLight}>{nextClass.course_code || 'Course'}</Text>
                    <Text style={styles.nextClassNameLight}>{nextClass.name}</Text>
                  </View>
                </View>

                <View style={styles.nextClassDividerLight} />

                <View style={styles.nextClassDetails}>
                  <View style={styles.nextClassDetailItem}>
                    <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.nextClassDetailTextLight}>
                      Timetable: {nextClass.start_time ? `${nextClass.start_time.substring(0,5)} - ${nextClass.end_time?.substring(0,5)}` : (nextClass.schedule_time || 'Not set')}
                    </Text>
                  </View>
                  <View style={styles.nextClassDetailItem}>
                    <Ionicons name="school-outline" size={16} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.nextClassDetailTextLight}>
                      {nextClass.classroom?.name || (nextClass.level ? `Level ${nextClass.level}` : 'Joined class')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.scheduleNoteLight}>
                  Timetable time is just the weekly schedule. Use Live now above when the lecturer starts attendance.
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* RECENT ATTENDANCE - Clean List */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} style={{ marginBottom: Spacing.six }}>
           <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
           <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement }]}>
              {recentAttendance.length > 0 ? recentAttendance.map((record, index) => (
                 <View key={record.id || index} style={[styles.listItem, { borderBottomWidth: index === recentAttendance.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
                    <View style={[styles.listIconWrapper, { backgroundColor: '#f0fdf4' }]}>
                       <Ionicons name="checkmark-outline" size={20} color="#22C55E" />
                    </View>
                    <View style={styles.listItemTextContainer}>
                       <Text style={[styles.listItemText, { color: theme.text }]}>Marked Present</Text>
                       <Text style={[styles.listItemTime, { color: theme.textSecondary }]}>
                          {new Date(record.timestamp).toLocaleDateString()}
                       </Text>
                    </View>
                 </View>
              )) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.textSecondary }}>No recent activity yet.</Text>
                </View>
              )}
           </View>
        </Animated.View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  joinCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  joinHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  joinInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  liveCard: {
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  liveClassName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  liveHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyLiveCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  emptyLiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyLiveText: {
    fontSize: 13,
    lineHeight: 18,
  },
  scheduleNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
  },
  largeScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#e01e37',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scanButtonTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  scanButtonTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  scanButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  nextClassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#e01e37',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  nextClassContent: {
    padding: 20,
  },
  nextClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nextClassCodeLight: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
    color: 'rgba(255,245,238,0.9)',
  },
  nextClassNameLight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  nextClassDividerLight: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginVertical: 16,
  },
  nextClassDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nextClassDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextClassDetailTextLight: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  scheduleNoteLight: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.78)',
  },
  listContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  listIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItemText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  listItemTime: {
    fontSize: 13,
    fontWeight: '500',
  },
});
