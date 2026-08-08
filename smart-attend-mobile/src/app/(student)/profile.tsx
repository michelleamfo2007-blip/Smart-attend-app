import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Spacing, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0, 
    rate: 100,
    courses: 0,
    classesToday: 3, 
  });
  const [loading, setLoading] = useState(true);
  const [institutionName, setInstitutionName] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.institution_id) {
          const { data: instData } = await supabase.from('institutions').select('name').eq('id', user.institution_id).maybeSingle();
          if (instData?.name) {
            setInstitutionName(instData.name);
          }
        }

        const { data: myRecords } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('student_id', user?.id);

        const attendedCount = myRecords ? myRecords.length : 0;

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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerTop}>
        <View style={{ width: 24 }} /> 
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#e01e37', '#85101f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: `https://api.dicebear.com/7.x/lorelei/png?seed=${encodeURIComponent(user?.name || 'student')}&backgroundColor=transparent` }}
            style={{ width: 72, height: 72, borderRadius: 36 }}
          />
        </View>
        <Text style={styles.studentName}>{user?.name}</Text>
        <Text style={styles.studentRoleBadge}>STUDENT</Text>
        
        <Text style={styles.studentDetails}>
          {user?.level?.replace('Level ', 'Level ')} • {user?.semester} Semester
        </Text>
        
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      </LinearGradient>

      {/* QUICK ACTIONS */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/mark-attendance')}>
          <View style={[styles.quickActionIcon, { backgroundColor: theme.backgroundElement }]}>
             <Ionicons name="qr-code-outline" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/analytics')}>
          <View style={[styles.quickActionIcon, { backgroundColor: theme.backgroundElement }]}>
             <Ionicons name="stats-chart-outline" size={24} color={theme.textSecondary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/edit-profile')}>
          <View style={[styles.quickActionIcon, { backgroundColor: theme.backgroundElement }]}>
             <Ionicons name="person-outline" size={24} color={theme.textSecondary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBox} onPress={() => router.push('/(student)/history')}>
          <View style={[styles.quickActionIcon, { backgroundColor: theme.backgroundElement }]}>
             <Ionicons name="time-outline" size={24} color={theme.textSecondary} />
          </View>
          <Text style={[styles.quickActionText, { color: theme.textSecondary }]}>History</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.infoRow}>
          <Ionicons name="id-card-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Student ID</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{user?.id?.substring(0, 8).toUpperCase()}</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Institution</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{institutionName || 'N/A'}</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{user?.name?.split(' ')[0].toLowerCase()}@gmail.com</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity style={styles.settingsRow}>
          <Ionicons name="notifications-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.settingsText, { color: theme.text }]}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
        <TouchableOpacity style={styles.settingsRow}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.settingsText, { color: theme.text }]}>Security & Password</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#fbe8ea' }]} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={theme.primary} />
        <Text style={[styles.logoutText, { color: theme.primary }]}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  gradientHeader: {
    borderRadius: 24,
    padding: Spacing.five,
    alignItems: 'center',
    marginBottom: Spacing.six,
    ...Platform.select({
      ios: {
        shadowColor: '#e01e37',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
    padding: 4,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
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
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  verifiedText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    borderRadius: 20,
    marginBottom: Spacing.six,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
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
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    marginLeft: 52,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingsText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.six,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
