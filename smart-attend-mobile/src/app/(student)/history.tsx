import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Spacing, Colors } from '@/constants/theme';
import { apiFetch } from '../../lib/api';

const theme = Colors.light;

export default function HistoryScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [filter, setFilter] = useState<'All' | 'Present' | 'Missed'>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiFetch('/api/student/dashboard');
        setRecords(data.history || []);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id, user?.level, user?.semester]);

  const formatClassName = (name: string) => {
    if (name.includes('_')) {
      const parts = name.split('_');
      return { primary: parts[0], secondary: parts.slice(1).join(' ') };
    }
    return { primary: name, secondary: '' };
  };

  const filteredRecords = records.filter((r) => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  const emptyLabel =
    filter === 'All' ? 'No records found.' : `No ${filter.toLowerCase()} records found.`;

  const renderItem = ({ item }: { item: any }) => {
    const date = new Date(item.timestamp).toLocaleString();
    const formatted = formatClassName(item.className);

    return (
      <View style={[styles.recordCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.recordHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.classNameText, { color: theme.text }]}>{formatted.primary}</Text>
            {formatted.secondary ? (
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                {formatted.secondary}
              </Text>
            ) : null}
          </View>
          <View style={[styles.badge, item.status === 'Missed' && styles.badgeMissed]}>
            <Text style={[styles.badgeText, item.status === 'Missed' && styles.badgeTextMissed]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={[styles.dateText, { color: theme.textSecondary }]}>{date}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My History</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your past attendance records
        </Text>
      </View>

      <View style={styles.filterContainer}>
        {(['All', 'Present', 'Missed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              filter === f && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.textSecondary }}>{emptyLabel}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingBottom: Spacing.eight, gap: Spacing.four },
  recordCard: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  classNameText: { fontWeight: 'bold', fontSize: 16 },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  badgeMissed: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  badgeTextMissed: { color: '#ef4444' },
  dateText: { fontSize: 12, marginTop: 4 },
  filterContainer: { flexDirection: 'row', gap: 8, marginBottom: Spacing.four },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'transparent',
  },
  filterText: { fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: 'white' },
});
