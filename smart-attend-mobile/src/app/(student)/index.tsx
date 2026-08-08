import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

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
    lateCount: 0, // Mocked
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
        // 1. Fetch attendance records for stats and recent list
        const { data: myRecords } = await supabase
          .from('attendance_records')
          .select('id, timestamp, class_id')
          .eq('student_id', user?.id)
          .order('timestamp', { ascending: false });

        const attendedCount = myRecords ? myRecords.length : 0;
        setRecentAttendance((myRecords || []).slice(0, 3)); // Grab last 3

        // 2. Fetch matched classes (for schedule and stats)
        const { data: matchedClasses } = await supabase
          .from('classes')
          .select('id, name, schedule_time, start_time, end_time')
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
          
          // Just use matched classes for "Today" mock since we don't have day of week in schema yet
          todays = matchedClasses.slice(0, 1);
          upcoming = matchedClasses[0];
        }

        const total = Math.max(totalSessionsCount, attendedCount);
        const rate = total === 0 ? 100 : Math.round((attendedCount / total) * 100);

        setStats({
          attended: attendedCount,
          totalSessions: totalSessionsCount,
          attendanceRate: rate,
          coursesCount: matchedClasses ? matchedClasses.length : 0,
          lateCount: 0,
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
      
      // Parse nextClass.start_time (assumes HH:MM or HH:MM:SS format)
      const [hours, minutes] = nextClass.start_time.split(':').map(Number);
      const classTime = new Date();
      classTime.setHours(hours, minutes, 0, 0);

      const diffMs = classTime.getTime() - now.getTime();
      
      if (diffMs < 0) {
        setTimeRemaining('In progress or passed');
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

    updateCountdown(); // Initial call
    const intervalId = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [nextClass]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.background }} color={theme.primary} />;
  }

  return (
    <Animated.View entering={FadeIn.duration(600)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.headerTextContainer}>
             <View style={styles.greetingRow}>
               <Ionicons name="hand-left" size={20} color={theme.text} />
               <Text style={[styles.greetingText, { color: theme.text }]}>{greeting}, {user?.name?.split(' ')[0]}</Text>
             </View>
             <Text style={[styles.dateText, { color: theme.textSecondary }]}>{todayStr}</Text>
          </View>
          <View style={styles.headerActions}>
             <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]} onPress={() => router.push('/(student)/notifications')}>
               <Ionicons name="notifications" size={20} color={theme.text} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.primaryLight }]} onPress={() => router.push('/(student)/profile')}>
               <Ionicons name="person-circle" size={20} color={theme.primary} />
             </TouchableOpacity>
          </View>
        </Animated.View>

        {/* STATISTICS GRID */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.statsGrid}>
           <View style={[styles.statBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sessions</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.attended}/{Math.max(stats.attended, stats.totalSessions)}</Text>
           </View>
           <View style={[styles.statBox, { backgroundColor: theme.backgroundElement, borderColor: stats.attendanceRate < 75 ? '#ef4444' : theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Attendance</Text>
              <Text style={[styles.statValue, { color: stats.attendanceRate < 75 ? '#ef4444' : theme.text }]}>{stats.attendanceRate}%</Text>
           </View>
           <View style={[styles.statBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Courses</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.coursesCount}</Text>
           </View>
           <View style={[styles.statBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Late</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.lateCount}</Text>
           </View>
        </Animated.View>

        {/* NEXT CLASS HERO CARD */}
        {nextClass && (
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={[styles.nextClassCard, { backgroundColor: theme.primary }]}>
            <View style={styles.nextClassHeader}>
               <Ionicons name="book" size={16} color="#FFF" />
               <Text style={styles.nextClassTitleLabel}>NEXT CLASS</Text>
            </View>
            <Text style={styles.nextClassName}>{nextClass.name}</Text>
            <Text style={styles.nextClassTime}>
              {nextClass.start_time ? `${nextClass.start_time.substring(0,5)} - ${nextClass.end_time?.substring(0,5)}` : (nextClass.schedule_time || '09:00 - 12:00')}
            </Text>
            <View style={styles.nextClassDetails}>
               <View style={styles.nextClassDetailItem}>
                 <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                 <Text style={styles.nextClassDetailText}>Main Campus</Text>
               </View>
               <View style={styles.nextClassDetailItem}>
                 <Ionicons name="person" size={14} color="rgba(255,255,255,0.8)" />
                 <Text style={styles.nextClassDetailText}>Professor</Text>
               </View>
            </View>
            <View style={styles.countdownBadge}>
               <Ionicons name="time" size={14} color={theme.primary} />
               <Text style={[styles.countdownText, { color: theme.primary }]}>{timeRemaining}</Text>
            </View>
          </Animated.View>
        )}

        {/* TODAY'S SCHEDULE */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ marginBottom: Spacing.six }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Schedule</Text>
          <View style={[styles.scheduleContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {todaysClasses.map((cls, index) => (
              <View key={cls.id || index} style={[styles.scheduleItem, { borderBottomColor: theme.border, borderBottomWidth: index === todaysClasses.length - 1 ? 0 : 1 }]}>
                <Text style={[styles.scheduleTime, { color: theme.textSecondary }]}>
                  {cls.start_time ? cls.start_time.substring(0,5) : '09:00'}
                </Text>
                <View style={[styles.scheduleDivider, { backgroundColor: index === 0 ? theme.primary : theme.border }]} />
                <Text style={[styles.scheduleName, { color: index === 0 ? theme.primary : theme.text, fontWeight: index === 0 ? '700' : '500' }]}>
                  {cls.name}
                </Text>
              </View>
            ))}
            {todaysClasses.length === 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: theme.textSecondary }}>No classes scheduled for today.</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* LARGE SCAN BUTTON */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} style={{ marginBottom: Spacing.six }}>
           <TouchableOpacity 
             style={[styles.largeScanButton, { backgroundColor: theme.primary }]}
             onPress={() => router.push('/(student)/mark-attendance')}
             activeOpacity={0.8}
           >
             <Ionicons name="qr-code-outline" size={40} color="#FFF" />
             <View style={styles.scanButtonTextContainer}>
                <Text style={styles.scanButtonTitle}>Scan QR Code</Text>
                <Text style={styles.scanButtonSubtitle}>Tap to mark attendance</Text>
             </View>
           </TouchableOpacity>
        </Animated.View>

        {/* RECENT ATTENDANCE */}
        <Animated.View entering={FadeInUp.duration(500).delay(500)} style={{ marginBottom: Spacing.six }}>
           <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Attendance</Text>
           <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {recentAttendance.length > 0 ? recentAttendance.map((record, index) => (
                 <View key={record.id || index} style={[styles.listItem, { borderBottomColor: theme.border, borderBottomWidth: index === recentAttendance.length - 1 ? 0 : 1 }]}>
                    <View style={styles.listItemLeft}>
                       <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                       <Text style={[styles.listItemText, { color: theme.text }]}>Present</Text>
                    </View>
                    <Text style={[styles.listItemTime, { color: theme.textSecondary }]}>
                       {new Date(record.timestamp).toLocaleDateString()}
                    </Text>
                 </View>
              )) : (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: theme.textSecondary }}>No recent attendance records.</Text>
                </View>
              )}
           </View>
        </Animated.View>

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
    alignItems: 'flex-start',
    marginBottom: Spacing.six,
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.six,
  },
  statBox: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  nextClassCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: Spacing.six,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nextClassTitleLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  nextClassName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  nextClassTime: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
  },
  nextClassDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  nextClassDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextClassDetailText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  countdownBadge: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  scheduleContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  scheduleTime: {
    width: 50,
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleDivider: {
    width: 3,
    height: 24,
    borderRadius: 2,
    marginHorizontal: 12,
  },
  scheduleName: {
    fontSize: 16,
    flex: 1,
  },
  largeScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 24,
    gap: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  scanButtonTextContainer: {
    alignItems: 'flex-start',
  },
  scanButtonTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scanButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  listContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  listItemTime: {
    fontSize: 13,
  },
});
