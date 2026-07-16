import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [loading, setLoading] = useState(true);
  const [moduleStats, setModuleStats] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchAnalytics = async () => {
        try {
          // 1. Get student's enrolled classes
          const { data: matchedClasses } = await supabase
            .from('classes')
            .select('id, name')
            .eq('level', user?.level)
            .eq('semester', user?.semester);

          if (!matchedClasses || matchedClasses.length === 0) {
            setModuleStats([]);
            setLoading(false);
            return;
          }

          const classIds = matchedClasses.map(c => c.id);

          // 2. Get all sessions for these classes
          const { data: allSessions } = await supabase
            .from('attendance_sessions')
            .select('id, class_id')
            .in('class_id', classIds);

          // 3. Get student's attendance records
          const { data: myRecords } = await supabase
            .from('attendance_records')
            .select('session_id')
            .eq('student_id', user?.id);

          const attendedSessionIds = new Set(myRecords?.map(r => r.session_id) || []);

          // 4. Calculate stats per module
          const stats = matchedClasses.map(cls => {
            const classSessions = allSessions?.filter(s => s.class_id === cls.id) || [];
            const totalSessions = classSessions.length;
            const attendedCount = classSessions.filter(s => attendedSessionIds.has(s.id)).length;
            
            const rate = totalSessions === 0 ? 100 : Math.round((attendedCount / totalSessions) * 100);

            // Clean name
            let friendlyName = cls.name;
            if (cls.name.includes('_')) friendlyName = cls.name.split('_')[0];

            return {
              id: cls.id,
              name: friendlyName,
              total: totalSessions,
              attended: attendedCount,
              rate: rate,
            };
          });

          setModuleStats(stats);
        } catch (err) {
          console.error("Failed to fetch analytics", err);
        } finally {
          setLoading(false);
        }
      };

      fetchAnalytics();
    }, [user])
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <View style={styles.header}>
          <ThemedText type="title">Module Analytics</ThemedText>
          <ThemedText themeColor="textSecondary">Detailed breakdown of your attendance</ThemedText>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.infoIcon}>
            <SymbolView name="info.circle.fill" size={24} tintColor={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: 'bold', marginBottom: 4 }}>NCC Compliance</ThemedText>
            <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
              You must maintain at least an 85% attendance rate in every module to be eligible for exams.
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.sectionTitle}>Your Progress</ThemedText>
        
        {moduleStats.length === 0 ? (
          <ThemedText style={{ textAlign: 'center', marginTop: 40 }} themeColor="textSecondary">No classes found.</ThemedText>
        ) : (
          <View style={styles.list}>
            {moduleStats.map((mod, index) => {
              const isDanger = mod.rate < 85;
              return (
                <Animated.View 
                  entering={FadeInDown.duration(400).delay(index * 100)} 
                  key={mod.id} 
                  style={[styles.moduleCard, { backgroundColor: theme.backgroundElement, borderColor: isDanger ? 'rgba(239, 68, 68, 0.3)' : theme.border }]}
                >
                  <View style={styles.modHeader}>
                    <ThemedText style={styles.modName}>{mod.name}</ThemedText>
                    <ThemedText style={[styles.modRate, { color: isDanger ? '#ef4444' : theme.text }]}>{mod.rate}%</ThemedText>
                  </View>
                  <ThemedText style={styles.modDetail} themeColor="textSecondary">
                    Attended {mod.attended} of {mod.total} sessions
                  </ThemedText>
                  
                  {/* Progress Bar Container */}
                  <View style={[styles.progressContainer, { backgroundColor: theme.backgroundSelected }]}>
                    {/* Target Line (85%) */}
                    <View style={styles.targetLine} />
                    
                    {/* Actual Progress */}
                    <View style={[styles.progressBar, { width: `${mod.rate}%`, backgroundColor: isDanger ? '#ef4444' : theme.primary }]} />
                  </View>
                  
                  {isDanger && (
                    <View style={styles.dangerBadge}>
                      <SymbolView name="exclamationmark.triangle.fill" size={12} tintColor="#ef4444" />
                      <Text style={styles.dangerText}>Below 85% Threshold</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        )}
      </Animated.View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six, marginTop: Spacing.two },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.six,
    alignItems: 'center',
    gap: Spacing.four,
  },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: Spacing.four, marginLeft: 4, opacity: 0.5 },
  list: { gap: Spacing.four },
  moduleCard: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
  },
  modHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  modName: { fontWeight: 'bold', fontSize: 16 },
  modRate: { fontWeight: '800', fontSize: 18 },
  modDetail: { fontSize: 12, marginBottom: Spacing.four },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  targetLine: {
    position: 'absolute',
    left: '85%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ef4444',
    zIndex: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  dangerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.three,
  },
  dangerText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' }
});
