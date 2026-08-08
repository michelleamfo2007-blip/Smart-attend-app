import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [moduleStats, setModuleStats] = useState<any[]>([]);
  const [overall, setOverall] = useState({ expected: 0, attended: 0, missed: 0, rate: 0 });
  const [missedSessions, setMissedSessions] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: matchedClasses } = await supabase
          .from('classes')
          .select('id, name')
          .eq('level', user?.level)
          .eq('semester', user?.semester);

        if (!matchedClasses || matchedClasses.length === 0) {
          setLoading(false);
          return;
        }

        const classIds = matchedClasses.map(c => c.id);

        const { data: allSessions } = await supabase
          .from('attendance_sessions')
          .select('id, class_id, created_at')
          .in('class_id', classIds)
          .order('created_at', { ascending: false });

        const { data: myRecords } = await supabase
          .from('attendance_records')
          .select('session_id')
          .eq('student_id', user?.id);

        const attendedSessionIds = new Set(myRecords?.map(r => r.session_id) || []);

        let totalExpected = 0;
        let totalAttended = 0;
        const missed: any[] = [];

        const stats = matchedClasses.map(cls => {
          const classSessions = allSessions?.filter(s => s.class_id === cls.id) || [];
          const totalSessions = classSessions.length;
          const attendedCount = classSessions.filter(s => attendedSessionIds.has(s.id)).length;
          
          totalExpected += totalSessions;
          totalAttended += attendedCount;

          classSessions.forEach(s => {
            if (!attendedSessionIds.has(s.id)) {
              missed.push({
                ...s,
                className: cls.name.split('_')[0]
              });
            }
          });

          return {
            id: cls.id,
            name: cls.name.split('_')[0],
            total: totalSessions,
            attended: attendedCount,
            rate: totalSessions === 0 ? 100 : Math.round((attendedCount / totalSessions) * 100),
          };
        });

        const totalMissed = totalExpected - totalAttended;
        const overallRate = totalExpected === 0 ? 100 : Math.round((totalAttended / totalExpected) * 100);

        setModuleStats(stats);
        setOverall({ expected: totalExpected, attended: totalAttended, missed: totalMissed, rate: overallRate });
        setMissedSessions(missed);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user?.id, user?.level, user?.semester]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, marginTop: 4 }}>
            <SymbolView name="chevron.left" size={24} tintColor={theme.text} />
          </TouchableOpacity>
          <View>
            <ThemedText type="title">Performance Analytics</ThemedText>
            <ThemedText themeColor="textSecondary">Your overall attendance summary</ThemedText>
          </View>
        </View>

        {/* Overall Performance Card */}
        <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.overallRow}>
            
            {/* Circular Ring (Simulated with views for React Native) */}
            <View style={styles.progressRingContainer}>
              <View style={[styles.progressRing, { borderColor: overall.rate >= 85 ? '#10b981' : '#ef4444' }]}>
                <ThemedText style={{ fontSize: 28, fontWeight: '800' }}>{overall.rate}%</ThemedText>
                <View style={[styles.zoneBadge, { backgroundColor: overall.rate >= 85 ? '#dcfce7' : '#fee2e2' }]}>
                   <Text style={{ fontSize: 10, fontWeight: 'bold', color: overall.rate >= 85 ? '#166534' : '#991b1b' }}>
                     {overall.rate >= 85 ? 'SAFE ZONE' : 'AT RISK'}
                   </Text>
                </View>
              </View>
            </View>

            <View style={styles.statsColumn}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>EXPECTED</Text>
                <Text style={styles.statValue}>{overall.expected}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>ATTENDED</Text>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{overall.attended}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>MISSED</Text>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>{overall.missed}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Missed Sessions Section */}
        <ThemedText style={[styles.sectionTitle, { marginTop: 32 }]}>ACTION REQUIRED</ThemedText>
        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Missed Sessions</ThemedText>
        
        {missedSessions.length === 0 ? (
          <ThemedText style={{ textAlign: 'center', marginTop: 20 }} themeColor="textSecondary">No missed sessions! Great job!</ThemedText>
        ) : (
          <View style={styles.list}>
            {missedSessions.map((session, index) => (
              <Animated.View 
                entering={FadeInDown.duration(400).delay(index * 100)} 
                key={session.id} 
                style={[styles.missedCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              >
                {/* Red left border accent */}
                <View style={styles.cardAccent} />
                
                <View style={styles.missedHeader}>
                  <View style={styles.unexcusedBadge}>
                    <SymbolView name="exclamationmark.triangle.fill" size={10} tintColor="#ef4444" />
                    <Text style={styles.unexcusedText}>UNEXCUSED ABSENCE</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                
                <ThemedText style={styles.className}>{session.className}</ThemedText>
                
                <View style={styles.dateRow}>
                  <SymbolView name="calendar" size={14} tintColor={theme.textSecondary} />
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 6 }}>
                    {new Date(session.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.submitReasonBtn}
                  onPress={() => router.push('/(student)/disputes')}
                >
                  <SymbolView name="doc.text.fill" size={16} tintColor="#b45309" />
                  <Text style={styles.submitReasonText}>SUBMIT REASON</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.six, marginTop: Spacing.two },
  overallCard: {
    padding: Spacing.six,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.six,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressRingContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statsColumn: {
    flex: 1,
    marginLeft: 24,
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#94a3b8', marginBottom: 4 },
  list: { gap: Spacing.four },
  missedCard: {
    padding: Spacing.four,
    paddingLeft: 20,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#ef4444',
  },
  missedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unexcusedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  unexcusedText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },
  className: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitReasonBtn: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  submitReasonText: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 14,
  }
});
