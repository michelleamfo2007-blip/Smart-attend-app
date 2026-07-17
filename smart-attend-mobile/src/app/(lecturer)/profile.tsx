import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';

export default function LecturerProfileScreen() {
  const { user, logout } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">My Profile</ThemedText>
        <ThemedText themeColor="textSecondary">Lecturer Settings</ThemedText>
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
            <Text style={[styles.studentRole, { color: theme.primary }]}>LECTURER</Text>
          </View>
        </View>
        <View style={[styles.idBadgeFooter, { borderTopColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(124,58,237,0.2)' }]}>
          <View style={[styles.barcodePlaceholder, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(124, 58, 237, 0.2)' }]} />
          <Text style={[styles.idNumber, { color: theme.primary }]}>ID: {user?.id?.substring(0, 8).toUpperCase()}</Text>
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>Information</ThemedText>
      <View style={[styles.menuGroup, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.infoItem}>
          <ThemedText themeColor="textSecondary" style={styles.infoLabel}>Department</ThemedText>
          <ThemedText style={styles.infoValue}>Computer Science</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.infoItem}>
          <ThemedText themeColor="textSecondary" style={styles.infoLabel}>Email</ThemedText>
          <ThemedText style={styles.infoValue}>{user?.name?.split(' ')[0]?.toLowerCase()}.lecturer@university.edu</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
      <View style={[styles.menuGroup, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => {
            if (Platform.OS === 'web') {
              window.alert("App Preferences coming soon!");
            } else {
              Alert.alert("Coming Soon", "App Preferences will be available in a future update.");
            }
          }}
        >
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(107, 114, 128, 0.1)' }]}>
            <SymbolView name="gearshape.fill" size={20} tintColor="#6b7280" />
          </View>
          <ThemedText style={styles.menuText}>App Preferences</ThemedText>
          <SymbolView name="chevron.right" size={20} tintColor={theme.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => {
            if (Platform.OS === 'web') {
              window.alert("Help Center coming soon!");
            } else {
              Alert.alert("Coming Soon", "Help Center will be available in a future update.");
            }
          }}
        >
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <SymbolView name="questionmark.circle.fill" size={20} tintColor="#3b82f6" />
          </View>
          <ThemedText style={styles.menuText}>Help & Support</ThemedText>
          <SymbolView name="chevron.right" size={20} tintColor={theme.textSecondary} />
        </TouchableOpacity>
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
  idBadgeFooter: { marginTop: Spacing.four, paddingTop: Spacing.four, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barcodePlaceholder: { height: 24, width: 120, borderRadius: 4 },
  idNumber: { fontWeight: '800', letterSpacing: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.three, marginLeft: Spacing.two, marginTop: Spacing.four },
  menuGroup: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.six },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, fontSize: 16, fontWeight: '600' },
  divider: { height: 1, marginLeft: 64 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.four, alignItems: 'center' },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15, fontWeight: '600' },
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
