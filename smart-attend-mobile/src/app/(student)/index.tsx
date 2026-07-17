import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
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
               <SymbolView name="book.fill" size={16} tintColor="#FFF" />
               <Text style={styles.nextClassTitleLabel}>NEXT CLASS</Text>
            </View>
            <Text style={styles.nextClassName}>{nextClass.name}</Text>
            <Text style={styles.nextClassTime}>
              {nextClass.start_time ? `${nextClass.start_time.substring(0,5)} - ${nextClass.end_time?.substring(0,5)}` : (nextClass.schedule_time || '09:00 - 12:00')}
            </Text>
            <View style={styles.nextClassDetails}>
               <View style={styles.nextClassDetailItem}>
                 <SymbolView name="location.fill" size={14} tintColor="rgba(255,255,255,0.8)" />
                 <Text style={styles.nextClassDetailText}>Main Campus</Text>
               </View>
               <View style={styles.nextClassDetailItem}>
                 <SymbolView name="person.fill" size={14} tintColor="rgba(255,255,255,0.8)" />
                 <Text style={styles.nextClassDetailText}>Professor</Text>
               </View>
            </View>
            <View style={styles.countdownBadge}>
               <SymbolView name="clock.fill" size={14} tintColor={theme.primary} />
               <Text style={[styles.countdownText, { color: theme.primary }]}>Starts in 45 mins</Text>
            </View>
          </Animated.View>
        )}

        {/* TODAY'S SCHEDULE */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Schedule</Text>
          <View style={[styles.scheduleContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {todaysClasses.map((cls, index) => (
              <View key={cls.id || index} style={styles.scheduleItem}>
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
              <Text style={{ color: theme.textSecondary, padding: 16 }}>No classes scheduled for today.</Text>
            )}
          </View>
        </Animated.View>

        {/* LARGE SCAN BUTTON */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} style={{ marginVertical: Spacing.six }}>
           <TouchableOpacity 
             style={[styles.largeScanButton, { backgroundColor: theme.primary }]}
             onPress={() => router.push('/(student)/scan-qr')}
             activeOpacity={0.8}
           >
             <SymbolView name="qrcode.viewfinder" size={40} tintColor="#FFF" />
             <View style={styles.scanButtonTextContainer}>
                <Text style={styles.scanButtonTitle}>Scan QR Code</Text>
                <Text style={styles.scanButtonSubtitle}>Tap to mark attendance</Text>
             </View>
           </TouchableOpacity>
        </Animated.View>

        {/* RECENT ATTENDANCE */}
        <Animated.View entering={FadeInUp.duration(500).delay(500)}>
           <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Attendance</Text>
           <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {recentAttendance.length > 0 ? recentAttendance.map((record, index) => (
                 <View key={record.id || index} style={[styles.listItem, { borderBottomColor: theme.border, borderBottomWidth: index === recentAttendance.length - 1 ? 0 : 1 }]}>
                    <View style={styles.listItemLeft}>
                       <SymbolView name="checkmark.circle.fill" size={20} tintColor="#22C55E" />
                       <Text style={[styles.listItemText, { color: theme.text }]}>Present</Text>
                    </View>
                    <Text style={[styles.listItemTime, { color: theme.textSecondary }]}>
                       {new Date(record.timestamp).toLocaleDateString()}
                    </Text>
                 </View>
              )) : (
                <Text style={{ color: theme.textSecondary, padding: 16 }}>No recent attendance records.</Text>
              )}
           </View>
        </Animated.View>

        {/* NOTIFICATIONS */}
        <Animated.View entering={FadeInUp.duration(500).delay(600)} style={{ marginBottom: 40 }}>
           <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
           <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
               <View style={[styles.listItem, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                  <SymbolView name="bell.fill" size={20} tintColor={theme.primary} />
                  <Text style={[styles.listItemText, { color: theme.text }]}>Attendance marked successfully</Text>
               </View>
               <View style={[styles.listItem, { borderBottomColor: theme.border, borderBottomWidth: 0 }]}>
                  <SymbolView name="exclamationmark.circle.fill" size={20} tintColor="#F59E0B" />
                  <Text style={[styles.listItemText, { color: theme.text }]}>Keep up the good work! You are on track.</Text>
               </View>
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
    padding: 16,
    paddingBottom: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    marginHorizontal: 16,
  },
  scheduleName: {
    fontSize: 15,
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
