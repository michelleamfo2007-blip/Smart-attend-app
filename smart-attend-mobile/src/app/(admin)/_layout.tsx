import { Tabs, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme, View, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (!loading && (!user || user.role?.toUpperCase() !== 'ADMIN')) {
      router.replace('/');
    }
  }, [user, loading]);

  if (!user || user.role?.toUpperCase() !== 'ADMIN') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: { backgroundColor: colors.background, shadowOpacity: 0, elevation: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
        headerTintColor: colors.text,
        tabBarStyle: { 
          backgroundColor: colors.backgroundElement, 
          borderTopWidth: 1, 
          borderTopColor: colors.border,
          height: Platform.OS === 'web' ? 76 : 64,
          paddingBottom: Platform.OS === 'web' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => (
            <SymbolView name="house.fill" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.2.fill" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color }) => (
            <SymbolView name="book.fill" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.fill" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
