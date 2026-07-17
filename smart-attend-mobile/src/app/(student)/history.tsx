import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCallback } from 'react';

export default function HistoryScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [records, setRecords] = useState<any[]>([]);
  const [filter, setFilter] = useState<'All' | 'Present' | 'Missed'>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // 1. Fetch the student's classes
        const { data: matchedClasses } = await supabase
          .from('classes')
          .select('id, name')
          .eq('level', user?.level)
          .eq('semester', user?.semester);

        if (!matchedClasses || matchedClasses.length === 0) {
          setRecords([]);
          setLoading(false);
          return;
        }

        const classIds = matchedClasses.map(c => c.id);
        const classMap = new Map(matchedClasses.map(c => [c.id, c.name]));

        // 2. Fetch all sessions for these classes
        const { data: allSessions } = await supabase
          .from('attendance_sessions')
          .select('id, class_id, created_at')
          .in('class_id', classIds)
          .order('created_at', { ascending: false });

        // 3. Fetch the student's attendance records
        const { data: myRecords, error } = await supabase
          .from('attendance_records')
          .select('session_id')
          .eq('student_id', user?.id);

        if (error) throw error;

        const attendedSessionIds = new Set(myRecords?.map(r => r.session_id) || []);

        // 4. Combine and determine status
        const combinedHistory = (allSessions || []).map(session => {
          const isPresent = attendedSessionIds.has(session.id);
          return {
            id: session.id,
            className: classMap.get(session.class_id) || 'Unknown Class',
            timestamp: session.created_at,
            status: isPresent ? 'Present' : 'Missed'
          };
        });
        
        setRecords(combinedHistory);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id, user?.level, user?.semester]);

  // Helper to format class name
  const formatClassName = (name: string) => {
    // Basic formatting: if it has underscores, split and take first part as primary
    if (name.includes('_')) {
      const parts = name.split('_');
      return { primary: parts[0], secondary: parts.slice(1).join(' ') };
    }
    return { primary: name, secondary: '' };
  };

  const filteredRecords = records.filter(r => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  const renderItem = ({ item }: { item: any }) => {
    const date = new Date(item.timestamp).toLocaleString();
    const formatted = formatClassName(item.className);
    
    return (
      <View style={[styles.recordCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <View style={styles.recordHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.classNameText}>{formatted.primary}</ThemedText>
            {formatted.secondary ? <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{formatted.secondary}</ThemedText> : null}
          </View>
          <View style={[styles.badge, item.status === 'Missed' && styles.badgeMissed]}>
            <Text style={[styles.badgeText, item.status === 'Missed' && styles.badgeTextMissed]}>{item.status}</Text>
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

      <View style={styles.filterContainer}>
        {['All', 'Present', 'Missed'].map((f) => (
          <TouchableOpacity 
            key={f}
            style={[styles.filterPill, filter === f && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setFilter(f as any)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText themeColor="textSecondary">No {filter.toLowerCase()} records found.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
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
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  classNameText: { fontWeight: 'bold', fontSize: 16 },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  badgeMissed: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  badgeTextMissed: { color: '#ef4444' },
  dateText: { fontSize: 12, marginTop: 4 },
  filterContainer: { flexDirection: 'row', gap: 8, marginBottom: Spacing.four },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: 'transparent' },
  filterText: { fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: 'white' }
});
