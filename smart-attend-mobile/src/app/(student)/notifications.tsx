import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Colors } from '@/constants/theme';
import { apiFetch } from '../../lib/api';

const theme = Colors.light;

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch('/api/student/notifications');
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={36} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Attendance reminders and dispute updates will show up here.
              </Text>
            </View>
          ) : (
            <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {notifications.map((item, index) => (
                <View
                  key={item.id || index}
                  style={[
                    styles.listItem,
                    { borderBottomColor: theme.border, borderBottomWidth: index === notifications.length - 1 ? 0 : 1 },
                  ]}
                >
                  <Ionicons name="notifications" size={20} color={theme.primary} />
                  <Text style={[styles.listItemText, { color: theme.text }]}>{item.title || item.message}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.four,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  listContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.four,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
  },
});
