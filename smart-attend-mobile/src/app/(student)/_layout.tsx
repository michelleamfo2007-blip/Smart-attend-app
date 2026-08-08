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
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { 
          backgroundColor: colors.backgroundElement, 
          borderTopWidth: 1, 
          borderTopColor: colors.border,
          height: Platform.OS === 'web' ? 76 : 64 + insets.bottom,
          paddingBottom: Platform.OS === 'web' ? 20 : 8 + insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
            },
            android: {
              elevation: 4,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
          title: 'Disputes',
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          href: null,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          href: null,
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
