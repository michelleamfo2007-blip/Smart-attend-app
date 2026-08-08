import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const { data: matchedClasses } = await supabase
          .from('classes')
          .select('id, name, course_code, start_time, end_time, schedule_time, users!lecturer_id(name)')
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
  }, [user?.id, user?.level, user?.semester]);

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.background }} color={theme.primary} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Class Schedule</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your weekly timetable</Text>
        </View>

        {schedule.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="calendar-clear-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={{ textAlign: 'center', color: theme.textSecondary }}>No classes assigned to your level and semester.</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {schedule.map((cls, index) => {
              const friendlyName = cls.name;
              const code = cls.course_code || '';
              const timeDisplay = cls.start_time ? `${cls.start_time.substring(0,5)} - ${cls.end_time?.substring(0,5)}` : (cls.schedule_time || 'Time TBD');

              return (
                <Animated.View 
                  entering={FadeInDown.duration(400).delay(index * 100)} 
                  key={cls.id} 
                  style={styles.timelineItem}
                >
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: theme.primary, borderColor: theme.background }]} />
                    {index !== schedule.length - 1 && <View style={[styles.timelineTrack, { backgroundColor: theme.primaryLight }]} />}
                  </View>
                  
                  <View style={[styles.classCard, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.cardHeader}>
                       {code ? <Text style={[styles.classCode, { color: theme.primary }]}>{code}</Text> : null}
                    </View>
                    <Text style={[styles.className, { color: theme.text }]}>{friendlyName}</Text>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.detailsGrid}>
                       <View style={styles.detailRow}>
                         <View style={[styles.iconWrapper, { backgroundColor: '#F1F5F9' }]}>
                            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                         </View>
                         <Text style={[styles.detailText, { color: theme.textSecondary }]}>{timeDisplay}</Text>
                       </View>
                       
                       {cls.users?.name && (
                         <View style={styles.detailRow}>
                           <View style={[styles.iconWrapper, { backgroundColor: '#F1F5F9' }]}>
                              <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
                           </View>
                           <Text style={[styles.detailText, { color: theme.textSecondary }]}>{cls.users.name}</Text>
                         </View>
                       )}
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
  container: { 
    flex: 1, 
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  header: { 
    marginBottom: Spacing.six,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeline: { 
    paddingLeft: 10,
  },
  timelineItem: { 
    flexDirection: 'row', 
    marginBottom: 24,
  },
  timelineLine: { 
    width: 24, 
    alignItems: 'center', 
    marginRight: 16,
  },
  timelineDot: { 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    borderWidth: 3, 
    zIndex: 10,
    marginTop: 6,
  },
  timelineTrack: { 
    position: 'absolute', 
    top: 20, 
    bottom: -24, 
    width: 2,
    borderRadius: 1,
  },
  classCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    marginBottom: 4,
  },
  classCode: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  className: { 
    fontWeight: '800', 
    fontSize: 18, 
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { 
    fontSize: 14, 
    fontWeight: '500' 
  }
});
