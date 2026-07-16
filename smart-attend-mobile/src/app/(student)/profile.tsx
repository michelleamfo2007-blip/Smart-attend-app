import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">My Profile</ThemedText>
        <ThemedText themeColor="textSecondary">Manage your account and settings</ThemedText>
      </View>

      {/* Student ID Badge */}
      <View style={[styles.idBadge, { backgroundColor: theme.primary }]}>
        <View style={styles.idBadgeHeader}>
          <Text style={styles.universityName}>University Portal</Text>
          <SymbolView name="graduationcap.fill" size={24} tintColor="white" />
        </View>
        <View style={styles.idBadgeBody}>
          <View style={styles.avatarPlaceholder}>
             <SymbolView name="person.fill" size={40} tintColor={theme.primary} />
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{user?.name}</Text>
            <Text style={styles.studentRole}>STUDENT</Text>
            <Text style={styles.studentDetail}>Level: {user?.level?.replace('Level ', 'L')} | Semester: {user?.semester}</Text>
          </View>
        </View>
        <View style={styles.idBadgeFooter}>
          <View style={styles.barcodePlaceholder} />
          <Text style={styles.idNumber}>ID: {user?.id.substring(0, 8).toUpperCase()}</Text>
        </View>
      </View>

      {/* Menu Links */}
      <ThemedText style={styles.sectionTitle}>Academics</ThemedText>
      <View style={[styles.menuGroup, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(student)/analytics')}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <SymbolView name="chart.pie.fill" size={20} tintColor="#3b82f6" />
          </View>
          <ThemedText style={styles.menuText}>Detailed Analytics</ThemedText>
          <SymbolView name="chevron.right" size={20} tintColor={theme.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(student)/disputes')}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <SymbolView name="exclamationmark.bubble.fill" size={20} tintColor="#ef4444" />
          </View>
          <ThemedText style={styles.menuText}>Disputes & Support</ThemedText>
          <SymbolView name="chevron.right" size={20} tintColor={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
      <View style={[styles.menuGroup, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(107, 114, 128, 0.1)' }]}>
            <SymbolView name="bell.fill" size={20} tintColor="#6b7280" />
          </View>
          <ThemedText style={styles.menuText}>Notifications</ThemedText>
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
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.eight,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  idBadgeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four },
  universityName: { color: 'white', fontWeight: 'bold', fontSize: 16, opacity: 0.9 },
  idBadgeBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, marginBottom: Spacing.six },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  studentInfo: { flex: 1 },
  studentName: { color: 'white', fontWeight: '800', fontSize: 20, marginBottom: 2 },
  studentRole: { color: 'white', fontWeight: '600', fontSize: 12, opacity: 0.8, letterSpacing: 1, marginBottom: 4 },
  studentDetail: { color: 'white', fontSize: 12, opacity: 0.9 },
  idBadgeFooter: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 },
  barcodePlaceholder: { width: '80%', height: 30, backgroundColor: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  idNumber: { color: 'white', fontWeight: 'bold', fontSize: 12, letterSpacing: 2 },
  
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: Spacing.two, marginLeft: 4, opacity: 0.5 },
  menuGroup: { borderRadius: 12, borderWidth: 1, marginBottom: Spacing.six, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  menuIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, fontWeight: '600', fontSize: 16 },
  divider: { height: 1, width: '100%' },
  
  logoutButton: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.four,
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 }
});
