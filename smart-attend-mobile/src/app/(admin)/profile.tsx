import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';

export default function AdminProfileScreen() {
  const { user, logout } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">My Profile</ThemedText>
        <ThemedText themeColor="textSecondary">Admin Settings</ThemedText>
      </View>

      <View style={[styles.idBadge, { backgroundColor: scheme === 'dark' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(124, 58, 237, 0.3)' }]}>
        <View style={styles.idBadgeHeader}>
          <Text style={[styles.universityName, { color: theme.primary }]}>University Portal</Text>
          <SymbolView name="graduationcap.fill" size={24} tintColor={theme.primary} />
        </View>
        <View style={styles.idBadgeBody}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
             <SymbolView name="person.fill" size={40} tintColor={theme.primary} />
          </View>
          <View style={styles.studentInfo}>
            <Text style={[styles.studentName, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.studentRole, { color: theme.primary }]}>ADMINISTRATOR</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor="#ef4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six, marginTop: Spacing.two },
  idBadge: {
    borderRadius: 24,
    padding: Spacing.four,
    marginBottom: Spacing.eight,
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  idBadgeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four },
  universityName: { fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  idBadgeBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  studentRole: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  logoutButton: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 16,
  },
});
