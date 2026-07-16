import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

export default function AdminOverviewScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [stats, setStats] = useState({ users: 0, classes: 0, lecturers: 0, students: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    try {
      const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: lecturersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'LECTURER');
      const { count: studentsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT');
      const { count: classesCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
      
      setStats({ 
        users: usersCount || 0, 
        classes: classesCount || 0,
        lecturers: lecturersCount || 0,
        students: studentsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
            <ThemedText type="title" style={styles.welcomeText}>Welcome, {user?.name?.split(' ')[0]}</ThemedText>
            <ThemedText style={styles.subtitle} themeColor="textSecondary">Admin Control Center</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="person.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.students}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Students</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="person.crop.rectangle.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.lecturers}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Lecturers</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="person.3.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.users}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Total Users</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <SymbolView name="book.fill" size={24} tintColor={theme.primary} />
              </View>
              {loadingStats ? <ActivityIndicator color={theme.primary} /> : <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.classes}</ThemedText>}
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>Total Classes</ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.actionSection}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.two }}>Quick Actions</ThemedText>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.primary }]} 
              onPress={() => router.push('/(admin)/manage-users')}
              activeOpacity={0.8}
            >
              <SymbolView name="person.crop.circle.badge.plus" size={24} tintColor="white" />
              <Text style={styles.primaryButtonText}>Manage Users</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.primary }]} 
              onPress={() => router.push('/(admin)/manage-classes')}
              activeOpacity={0.8}
            >
              <SymbolView name="folder.fill.badge.plus" size={24} tintColor="white" />
              <Text style={styles.primaryButtonText}>Manage Classes</Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>

        <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
            <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six },
  welcomeText: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '500' },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, marginBottom: Spacing.six },
  statCard: {
    flexGrow: 1, minWidth: '45%', padding: Spacing.four, borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  iconContainer: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '500' },
  actionSection: { gap: Spacing.four, marginBottom: Spacing.six },
  actionButton: {
    flexDirection: 'row', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  primaryButton: {
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: Spacing.two },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 2 },
  secondaryButtonText: { fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  footer: { marginTop: 'auto', marginBottom: Spacing.two },
  logoutButton: {
    flexDirection: 'row', padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 }
});
