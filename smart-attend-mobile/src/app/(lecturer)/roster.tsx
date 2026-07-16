import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function RosterScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const { data: classes } = await supabase
          .from('classes')
          .select('id')
          .eq('lecturer_id', user?.id);

        if (classes && classes.length > 0) {
          const classIds = classes.map(c => c.id);
          const { data: attendanceRecords, error } = await supabase
            .from('attendance_records')
            .select('*')
            .in('class_id', classIds)
            .order('timestamp', { ascending: false });

          if (attendanceRecords && !error) {
            setRecords(attendanceRecords);
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
    const date = new Date(item.timestamp).toLocaleString();
    return (
      <View style={[styles.recordCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <View style={styles.recordHeader}>
          <ThemedText style={styles.studentName}>{item.student_name}</ThemedText>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Present</Text>
          </View>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.dateText}>{date}</ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Class Roster</ThemedText>
        <ThemedText themeColor="textSecondary">Students who checked in</ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText themeColor="textSecondary">No attendance records found.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingBottom: Spacing.eight, gap: Spacing.four },
  recordCard: {
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one },
  studentName: { fontWeight: 'bold', fontSize: 16 },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  dateText: { fontSize: 12 },
});
