import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function StudentOverviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    attended: 0,
    totalSessions: 0,
    attendanceRate: 100,
    coursesCount: 0,
  });
  const [nextClass, setNextClass] = useState<any>(null);
  const [todaysClasses, setTodaysClasses] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('Calculated soon...');

  // Greeting logic
  const currentHour = new Date().getHours();
  let greeting = 'Good Evening';
  if (currentHour < 12) greeting = 'Good Morning';
  else if (currentHour < 17) greeting = 'Good Afternoon';

  const todayStr = new Date().toLocaleDateString(undefined, { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: myRecords } = await supabase
          .from('attendance_records')
          .select('id, timestamp, class_id')
          .eq('student_id', user?.id)
          .order('timestamp', { ascending: false });

        const attendedCount = myRecords ? myRecords.length : 0;
        setRecentAttendance((myRecords || []).slice(0, 3)); 

        const { data: matchedClasses } = await supabase
          .from('classes')
          .select('id, name, schedule_time, start_time, end_time, course_code')
          .eq('level', user?.level)
          .eq('semester', user?.semester);

        let totalSessionsCount = 0;
        let todays: any[] = [];
        let upcoming: any = null;

        if (matchedClasses && matchedClasses.length > 0) {
          const classIds = matchedClasses.map(c => c.id);
          const { data: allSessions } = await supabase
            .from('attendance_sessions')
            .select('id')
            .in('class_id', classIds);
            
          totalSessionsCount = allSessions ? allSessions.length : 0;
          
          todays = matchedClasses.slice(0, 2);
          upcoming = matchedClasses[0];
        }

        const total = Math.max(totalSessionsCount, attendedCount);
        const rate = total === 0 ? 100 : Math.round((attendedCount / total) * 100);

        setStats({
          attended: attendedCount,
          totalSessions: totalSessionsCount,
          attendanceRate: rate,
          coursesCount: matchedClasses ? matchedClasses.length : 0,
        });

        setTodaysClasses(todays);
        setNextClass(upcoming);
        
      } catch (err) {
        console.error("Failed to fetch overview data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  useEffect(() => {
    if (!nextClass || !nextClass.start_time) return;

    const updateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = nextClass.start_time.split(':').map(Number);
      const classTime = new Date();
      classTime.setHours(hours, minutes, 0, 0);

      const diffMs = classTime.getTime() - now.getTime();
      
      if (diffMs < 0) {
        setTimeRemaining('In progress or completed');
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffHours > 0) {
        const remainingMins = diffMins % 60;
        setTimeRemaining(`Starts in ${diffHours}h ${remainingMins}m`);
      } else {
        setTimeRemaining(`Starts in ${diffMins} mins`);
      }
    };

    updateCountdown(); 
    const intervalId = setInterval(updateCountdown, 60000); 

    return () => clearInterval(intervalId);
  }, [nextClass]);

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

        {/* LARGE SCAN BUTTON - Premium Pill Style */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={{ marginBottom: Spacing.six }}>
           <TouchableOpacity onPress={() => router.push('/(student)/mark-attendance')} activeOpacity={0.85}>
             <LinearGradient 
                colors={['#e01e37', '#b91c2c']} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.largeScanButton}
             >
               <Ionicons name="qr-code-outline" size={32} color="#FFF" />
               <View style={styles.scanButtonTextContainer}>
                  <Text style={styles.scanButtonTitle}>Scan QR Code</Text>
                  <Text style={styles.scanButtonSubtitle}>Tap to mark attendance instantly</Text>
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
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Courses</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.coursesCount}</Text>
           </View>
        </Animated.View>

        {/* NEXT CLASS HERO CARD - Web Dashboard Style with subtle shadow */}
        {nextClass && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ marginBottom: Spacing.six }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Up Next</Text>
            <View style={[styles.nextClassCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.nextClassTopBanner} />
              <View style={styles.nextClassContent}>
                <View style={styles.nextClassHeader}>
                  <View>
                    <Text style={[styles.nextClassCode, { color: theme.primary }]}>{nextClass.course_code || 'Course'}</Text>
                    <Text style={[styles.nextClassName, { color: theme.text }]}>{nextClass.name}</Text>
                  </View>
                  <View style={styles.countdownBadge}>
                    <Text style={[styles.countdownText, { color: theme.primary }]}>{timeRemaining}</Text>
                  </View>
                </View>
                
                <View style={styles.nextClassDivider} />
                
                <View style={styles.nextClassDetails}>
                  <View style={styles.nextClassDetailItem}>
                    <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.nextClassDetailText, { color: theme.textSecondary }]}>
                      {nextClass.start_time ? `${nextClass.start_time.substring(0,5)} - ${nextClass.end_time?.substring(0,5)}` : (nextClass.schedule_time || '09:00 - 12:00')}
                    </Text>
                  </View>
                  <View style={styles.nextClassDetailItem}>
                    <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.nextClassDetailText, { color: theme.textSecondary }]}>Main Campus</Text>
                  </View>
                </View>
              </View>
            </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  nextClassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  nextClassTopBanner: {
    height: 6,
    backgroundColor: '#e01e37',
    width: '100%',
  },
  nextClassContent: {
    padding: 20,
  },
  nextClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nextClassCode: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  nextClassName: {
    fontSize: 18,
    fontWeight: '800',
  },
  countdownBadge: {
    backgroundColor: '#fbe8ea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nextClassDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  nextClassDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  nextClassDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextClassDetailText: {
    fontSize: 13,
    fontWeight: '500',
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
