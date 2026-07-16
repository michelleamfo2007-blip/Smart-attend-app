import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, SectionList, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RosterScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [groupedRecords, setGroupedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .eq('lecturer_id', user?.id);

        if (classes && classes.length > 0) {
          const classIds = classes.map(c => c.id);
          const { data: attendanceRecords, error } = await supabase
            .from('attendance_records')
            .select(`
              id,
              timestamp,
              users ( name ),
              classes ( name )
            `)
            .in('class_id', classIds)
            .order('timestamp', { ascending: false });

          if (attendanceRecords && !error) {
            // Group by "ClassName - Date"
            const groups: { [key: string]: any[] } = {};
            attendanceRecords.forEach(record => {
              const className = (record as any).classes?.name || 'Unknown Class';
              const dateStr = new Date(record.timestamp).toLocaleDateString();
              const groupKey = `${className}  |  ${dateStr}`;
              
              if (!groups[groupKey]) groups[groupKey] = [];
              groups[groupKey].push(record);
            });

            const sections = Object.keys(groups).map(key => ({
              title: key,
              data: groups[key]
            }));

            setGroupedRecords(sections);
          }
        }
      } catch (err) {
        console.error("Failed to fetch roster", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoster();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => {
    const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const studentName = item.users?.name || item.student_name || 'Unknown Student';
    return (
      <View style={[styles.recordCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <View style={styles.recordHeader}>
          <ThemedText style={styles.studentName}>{studentName}</ThemedText>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Present</Text>
          </View>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.dateText}>Checked in at {time}</ThemedText>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={styles.sectionHeaderText}>{title}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Class Roster</ThemedText>
        <ThemedText themeColor="textSecondary">Attendance grouped by class and day</ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : groupedRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText themeColor="textSecondary">No attendance records found.</ThemedText>
        </View>
      ) : (
        <SectionList
          sections={groupedRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContainer}
          stickySectionHeadersEnabled={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingBottom: Spacing.eight },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  sectionHeaderText: {
    fontWeight: '800',
    fontSize: 14,
  },
  recordCard: {
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one },
  studentName: { fontWeight: 'bold', fontSize: 16 },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  dateText: { fontSize: 12 },
});
