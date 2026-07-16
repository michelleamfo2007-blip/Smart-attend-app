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

export default function HistoryScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: myRecords, error } = await supabase
          .from('attendance_records')
          .select('*, classes (name)')
          .eq('student_id', user?.id)
          .order('timestamp', { ascending: false });
        
        if (myRecords && !error) {
          setRecords(myRecords);
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => {
    const date = new Date(item.timestamp).toLocaleString();
    return (
      <View style={[styles.recordCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <View style={styles.recordHeader}>
          <ThemedText style={styles.studentName}>Attendance: {item.classes?.name || 'Class'}</ThemedText>
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
        <ThemedText type="title">My History</ThemedText>
        <ThemedText themeColor="textSecondary">Your past attendance records</ThemedText>
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
