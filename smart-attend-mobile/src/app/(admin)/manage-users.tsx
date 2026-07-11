import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { User } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ManageUsersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('role', 'ADMIN');
        
        if (data && !error) {
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const renderItem = ({ item }: { item: User }) => {
    const isLecturer = item.role === 'LECTURER';
    return (
      <View style={[styles.userCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <View>
          <ThemedText style={styles.userName}>{item.name}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.userEmail}>{item.email}</ThemedText>
        </View>
        <View style={[styles.badge, isLecturer ? styles.badgeLecturer : styles.badgeStudent]}>
          <Text style={[styles.badgeText, isLecturer ? styles.badgeTextLecturer : styles.badgeTextStudent]}>
            {item.role}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Manage Users</ThemedText>
        <ThemedText themeColor="textSecondary">All registered Students & Lecturers</ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText themeColor="textSecondary">No users found in database.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={users}
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
  userCard: {
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: { fontWeight: 'bold', fontSize: 16 },
  userEmail: { fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeLecturer: { backgroundColor: '#f3e8ff' },
  badgeStudent: { backgroundColor: '#dbeafe' },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  badgeTextLecturer: { color: '#7e22ce' },
  badgeTextStudent: { color: '#1d4ed8' },
});
