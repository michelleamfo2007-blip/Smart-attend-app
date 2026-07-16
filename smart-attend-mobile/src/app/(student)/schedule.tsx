import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchSchedule = async () => {
        try {
          const { data: matchedClasses } = await supabase
            .from('classes')
            .select('id, name, schedule_time')
            .eq('level', user?.level)
            .eq('semester', user?.semester);

          if (matchedClasses) {
            setSchedule(matchedClasses);
          }
        } catch (err) {
          console.error("Failed to fetch schedule", err);
        } finally {
          setLoading(false);
        }
      };

      fetchSchedule();
    }, [user])
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <View style={styles.header}>
          <ThemedText type="title">Class Schedule</ThemedText>
          <ThemedText themeColor="textSecondary">Your weekly timetable</ThemedText>
        </View>

        {schedule.length === 0 ? (
          <ThemedText style={{ textAlign: 'center', marginTop: 40 }} themeColor="textSecondary">No classes assigned to your level and semester.</ThemedText>
        ) : (
          <View style={styles.timeline}>
            {schedule.map((cls, index) => {
              // Extract a friendly name
              let friendlyName = cls.name;
              let code = '';
              if (cls.name.includes('_')) {
                 const parts = cls.name.split('_');
                 friendlyName = parts[0];
                 code = parts.slice(1).join(' ');
              }

              return (
                <Animated.View 
                  entering={FadeInDown.duration(400).delay(index * 100)} 
                  key={cls.id} 
                  style={styles.timelineItem}
                >
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: theme.primary, borderColor: theme.background }]} />
                    {index !== schedule.length - 1 && <View style={[styles.timelineTrack, { backgroundColor: theme.border }]} />}
                  </View>
                  
                  <View style={[styles.classCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText style={styles.className}>{friendlyName}</ThemedText>
                    {code ? <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>{code}</ThemedText> : null}
                    
                    <View style={styles.detailRow}>
                      <SymbolView name="clock.fill" size={14} tintColor={theme.primary} />
                      <ThemedText style={styles.detailText}>{cls.schedule_time || 'Time TBD'}</ThemedText>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <SymbolView name="mappin.and.ellipse" size={14} tintColor={theme.primary} />
                      <ThemedText style={styles.detailText}>Campus</ThemedText>
                    </View>
                  </View>
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
  timeline: { paddingLeft: 10, marginTop: Spacing.four },
  timelineItem: { flexDirection: 'row', marginBottom: Spacing.six },
  timelineLine: { width: 30, alignItems: 'center', marginRight: Spacing.three },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, zIndex: 10 },
  timelineTrack: { position: 'absolute', top: 14, bottom: -Spacing.six, width: 2 },
  classCard: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
  },
  className: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detailText: { fontSize: 13, fontWeight: '500' }
});
