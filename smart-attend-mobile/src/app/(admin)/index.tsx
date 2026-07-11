import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function AdminOverviewScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Welcome, {user?.name}</ThemedText>
        <ThemedText themeColor="textSecondary">Admin Portal</ThemedText>
      </View>

      <TouchableOpacity 
        style={styles.manageButton} 
        onPress={() => router.push('/(admin)/manage-users')}
      >
        <Text style={styles.manageButtonText}>Manage Users</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.manageButton} 
        onPress={() => router.push('/(admin)/manage-classes')}
      >
        <Text style={styles.manageButtonText}>Manage Classes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six },
  manageButton: {
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  manageButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  logoutButton: {
    padding: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  logoutText: { color: 'white', fontWeight: 'bold' }
});
