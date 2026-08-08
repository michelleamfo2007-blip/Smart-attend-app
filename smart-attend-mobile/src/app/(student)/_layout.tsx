import { Tabs, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme, View, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!loading && (!user || user.role?.toUpperCase() !== 'STUDENT')) {
      router.replace('/');
    }
  }, [user, loading]);

  if (!user || user.role?.toUpperCase() !== 'STUDENT') {
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
          height: Platform.OS === 'web' ? 76 : 64 + insets.bottom,
          paddingBottom: Platform.OS === 'web' ? 20 : 8 + insets.bottom,
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
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mark-attendance"
        options={{
          title: 'Mark Present',
          tabBarIcon: ({ color }) => (
            <Ionicons name="qr-code" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan-qr"
        options={{
          title: 'Scan QR',
          href: null,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Module Analytics',
          href: null,
        }}
      />
      <Tabs.Screen
        name="disputes"
        options={{
          title: 'Disputes & Support',
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          href: null,
        }}
      />
    </Tabs>
  );
}
