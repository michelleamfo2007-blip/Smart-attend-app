import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

// Custom Profile Colors (overriding default theme)
const PColors = {
  background: '#0F172A',
  card: '#1E293B',
  primary: '#6366F1',
  accent: '#8B5CF6',
  success: '#22C55E',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  danger: '#EF4444',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0, // Mocked for now
    rate: 100,
    courses: 0,
    classesToday: 3, // Mocked for now
    gpa: 3.78, // Mocked for now
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. My Attendance Records
        const { data: myRecords } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('student_id', user?.id);

        const attendedCount = myRecords ? myRecords.length : 0;

        // 2. Total Sessions for my level/semester
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
        const absentCount = Math.max(0, total - attendedCount);
        const rate = total === 0 ? 100 : Math.round((attendedCount / total) * 100);

        setStats(prev => ({
          ...prev,
          present: attendedCount,
          absent: absentCount,
          rate: rate,
          courses: matchedClasses ? matchedClasses.length : 0,
        }));
      } catch (err) {
        console.error("Failed to fetch profile stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* HEADER SECTION */}
      <View style={styles.headerTop}>
        <View style={{ width: 24 }} /> {/* Spacer */}
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity>
          <Ionicons name="settings" size={24} color={PColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: `https://api.dicebear.com/7.x/lorelei/png?seed=${encodeURIComponent(user?.name || 'student')}&backgroundColor=transparent` }}
            style={{ width: 64, height: 64, borderRadius: 32 }}
          />
        </View>
        <Text style={styles.studentName}>{user?.name}</Text>
        <Text style={styles.studentRoleBadge}>STUDENT</Text>
        
        <Text style={styles.studentDetails}>
          {user?.level?.replace('Level ', 'Level ')} • {user?.semester} Semester
        </Text>
        
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.verifiedText}>Verified Student</Text>
        </View>
      </LinearGradient>

      {/* STUDENT DIGITAL ID CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Student Digital ID</Text>
        <View style={styles.divider} />
        <View style={styles.idCardRow}>
          <View style={styles.idInfo}>
            <View style={styles.idInfoItem}>
              <Ionicons name="person" size={16} color={PColors.textSecondary} />
              <Text style={styles.idValue}>{user?.name}</Text>
            </View>
            <View style={styles.idInfoItem}>
              <Ionicons name="barcode" size={16} color={PColors.textSecondary} />
              <Text style={styles.idLabel}>ID:</Text>
              <Text style={styles.idValue}>{user?.id?.substring(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.idInfoItem}>
              <Ionicons name="business" size={16} color={PColors.textSecondary} />
              <Text style={styles.idLabel}>Dept:</Text>
              <Text style={styles.idValue}>Computer Science</Text>
            </View>
            <View style={styles.idInfoItem}>
              <Ionicons name="calendar" size={16} color={PColors.textSecondary} />
              <Text style={styles.idLabel}>Valid:</Text>
              <Text style={styles.idValue}>2026</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ATTENDANCE SUMMARY */}
      <View style={styles.card}>
        <View style={styles.attendanceHeaderRow}>
          <Text style={styles.cardTitle}>Overall Attendance</Text>
          <Text style={styles.attendanceRateLarge}>{loading ? '-' : stats.rate}%</Text>
        </View>

        <View style={styles.progressBarBg}>
           <View style={[styles.progressBarFill, { width: `${loading ? 0 : stats.rate}%`, backgroundColor: stats.rate < 85 ? PColors.danger : PColors.success }]} />
        </View>

        <View style={styles.attendanceStatsRow}>
          <View style={styles.attendanceStat}>
            <Text style={styles.attendanceStatLabel}>Present</Text>
            <Text style={[styles.attendanceStatValue, { color: PColors.success }]}>{stats.present}</Text>
          </View>
          <View style={styles.attendanceStat}>
            <Text style={styles.attendanceStatLabel}>Absent</Text>
            <Text style={[styles.attendanceStatValue, { color: PColors.danger }]}>{stats.absent}</Text>
          </View>
          <View style={styles.attendanceStat}>
            <Text style={styles.attendanceStatLabel}>Late</Text>
            <Text style={[styles.attendanceStatValue, { color: '#F59E0B' }]}>{stats.late}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.viewHistoryButton} onPress={() => router.push('/(student)/history')}>
          <Text style={styles.viewHistoryText}>View Attendance History</Text>
        </TouchableOpacity>
      </View>

      {/* STATISTICS GRID */}
      <View style={styles.statsGrid}>
        <View style={styles.statsGridBox}>
          <Text style={styles.statsGridLabel}>Classes Today</Text>
          <Text style={styles.statsGridValue}>{stats.classesToday}</Text>
        </View>
        <View style={styles.statsGridBox}>
          <Text style={styles.statsGridLabel}>Courses</Text>
          <Text style={styles.statsGridValue}>{loading ? '-' : stats.courses}</Text>
        </View>
        <View style={[styles.statsGridBox, { width: '100%' }]}>
          <Text style={styles.statsGridLabel}>Overall Attendance</Text>
          <Text style={[styles.statsGridValue, { color: stats.rate < 85 ? PColors.danger : PColors.success }]}>{loading ? '-' : stats.rate}%</Text>
        </View>
      </View>

      {/* QUICK ACTIONS */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/scan-qr')}>
          <View style={styles.quickActionIcon}>
             <Ionicons name="qr-code" size={24} color={PColors.primary} />
          </View>
          <Text style={styles.quickActionText}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/mark-attendance')}>
          <View style={styles.quickActionIcon}>
             <Ionicons name="location" size={24} color={PColors.accent} />
          </View>
          <Text style={styles.quickActionText}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/analytics')}>
          <View style={styles.quickActionIcon}>
             <Ionicons name="stats-chart" size={24} color={PColors.success} />
          </View>
          <Text style={styles.quickActionText}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/edit-profile')}>
          <View style={styles.quickActionIcon}>
             <Ionicons name="pencil" size={24} color={PColors.textSecondary} />
          </View>
          <Text style={styles.quickActionText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* PERSONAL INFORMATION */}
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons name="id-card" size={20} color={PColors.textSecondary} />
          <Text style={styles.infoLabel}>Student ID</Text>
          <Text style={styles.infoValue}>{user?.id?.substring(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Ionicons name="school" size={20} color={PColors.textSecondary} />
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>Computer Science</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Ionicons name="map" size={20} color={PColors.textSecondary} />
          <Text style={styles.infoLabel}>Campus</Text>
          <Text style={styles.infoValue}>Main Campus</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color={PColors.textSecondary} />
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.name?.split(' ')[0].toLowerCase()}@gmail.com</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Ionicons name="call" size={20} color={PColors.textSecondary} />
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>+233 XX XXX XXXX</Text>
        </View>
      </View>

      {/* SETTINGS */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingsRow}>
          <Ionicons name="notifications" size={20} color={PColors.primary} />
          <Text style={styles.settingsText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={PColors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.infoDivider} />
        <TouchableOpacity style={styles.settingsRow}>
          <Ionicons name="lock-closed" size={20} color={PColors.accent} />
          <Text style={styles.settingsText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color={PColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={PColors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PColors.background,
    padding: Spacing.four,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    marginTop: Spacing.two,
  },
  headerTitle: {
    color: PColors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  gradientHeader: {
    borderRadius: 24,
    padding: Spacing.five,
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  studentDetails: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  verifiedText: {
    color: PColors.success,
    fontWeight: 'bold',
    fontSize: 12,
  },
  card: {
    backgroundColor: PColors.card,
    borderRadius: 20,
    padding: Spacing.four,
    marginBottom: Spacing.six,
  },
  cardTitle: {
    color: PColors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 12,
  },
  idCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idInfo: {
    flex: 1,
    gap: 12,
  },
  idInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idLabel: {
    color: PColors.textSecondary,
    fontSize: 13,
    width: 40,
  },
  idValue: {
    color: PColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  qrContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.four,
  },
  attendanceRateLarge: {
    color: PColors.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    marginBottom: Spacing.five,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  attendanceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.five,
  },
  attendanceStat: {
    alignItems: 'center',
  },
  attendanceStatLabel: {
    color: PColors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  attendanceStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewHistoryButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewHistoryText: {
    color: PColors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.six,
  },
  statsGridBox: {
    width: '48%',
    backgroundColor: PColors.card,
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: 'center',
  },
  statsGridLabel: {
    color: PColors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  statsGridValue: {
    color: PColors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: PColors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.four,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.six,
  },
  quickActionBox: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: PColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: PColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    color: PColors.textSecondary,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    color: PColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 32,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingsText: {
    color: PColors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: Spacing.six,
  },
  logoutText: {
    color: PColors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
