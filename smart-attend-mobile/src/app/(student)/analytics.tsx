import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';
import { apiFetch } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const theme = Colors.light;

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState({ expected: 0, attended: 0, missed: 0, rate: 0 });
  const [missedSessions, setMissedSessions] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await apiFetch('/api/student/dashboard');
        const matchedClasses = data.classes || [];
        const allSessions = data.sessions || [];
        const myRecords = data.records || [];

        if (!matchedClasses.length) {
          setLoading(false);
          return;
        }

        const attendedSessionIds = new Set(myRecords.map((r: any) => r.session_id));

        let totalExpected = 0;
        let totalAttended = 0;
        const missed: any[] = [];

        matchedClasses.forEach((cls: any) => {
          const classSessions = allSessions?.filter((s: any) => s.class_id === cls.id) || [];
          const totalSessions = classSessions.length;
          const attendedCount = classSessions.filter((s: any) => attendedSessionIds.has(s.id)).length;

          totalExpected += totalSessions;
          totalAttended += attendedCount;

          classSessions.forEach((s: any) => {
            if (!attendedSessionIds.has(s.id)) {
              missed.push({
                ...s,
                className: cls.name.split('_')[0],
              });
            }
          });
        });

        const totalMissed = totalExpected - totalAttended;
        const overallRate =
          totalExpected === 0 ? 100 : Math.round((totalAttended / totalExpected) * 100);

        setOverall({
          expected: totalExpected,
          attended: totalAttended,
          missed: totalMissed,
          rate: overallRate,
        });
        setMissedSessions(missed);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user?.id, user?.level, user?.semester]);

  if (loading) {
    return (
      <ActivityIndicator style={{ flex: 1, backgroundColor: theme.background }} color={theme.primary} />
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(600)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Performance Analytics</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Your overall attendance summary
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.overallCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <View style={styles.overallRow}>
            <View style={styles.progressRingContainer}>
              <View
                style={[
                  styles.progressRing,
                  { borderColor: overall.rate >= 85 ? '#10b981' : '#ef4444' },
                ]}
              >
                <Text style={[styles.rateText, { color: theme.text }]}>{overall.rate}%</Text>
                <View
                  style={[
                    styles.zoneBadge,
                    { backgroundColor: overall.rate >= 85 ? '#dcfce7' : '#fee2e2' },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: overall.rate >= 85 ? '#166534' : '#991b1b',
                    }}
                  >
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

        <Text style={styles.sectionTitle}>ACTION REQUIRED</Text>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Missed Sessions</Text>

        {missedSessions.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textSecondary }}>
            No missed sessions! Great job!
          </Text>
        ) : (
          <View style={styles.list}>
            {missedSessions.map((session, index) => (
              <Animated.View
                entering={FadeInDown.duration(400).delay(index * 100)}
                key={session.id}
                style={[
                  styles.missedCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardAccent} />

                <View style={styles.missedHeader}>
                  <View style={styles.unexcusedBadge}>
                    <Ionicons name="warning" size={10} color="#ef4444" />
                    <Text style={styles.unexcusedText}>UNEXCUSED ABSENCE</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {new Date(session.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <Text style={[styles.className, { color: theme.text }]}>{session.className}</Text>

                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 6 }}>
                    {new Date(session.created_at).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.submitReasonBtn}
                  onPress={() => router.push('/(student)/disputes')}
                >
                  <Ionicons name="document-text" size={16} color="#b45309" />
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
  container: { flex: 1 },
  content: { padding: Spacing.four, paddingTop: Spacing.six },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.six,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    marginTop: 2,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500' },
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
  rateText: { fontSize: 28, fontWeight: '800' },
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#94a3b8',
    marginBottom: 4,
  },
  sectionHeading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
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
  },
});
