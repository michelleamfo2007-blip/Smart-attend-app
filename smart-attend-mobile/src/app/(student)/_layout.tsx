import { Tabs, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  useEffect(() => {
    if (!loading && (!user || user.role !== 'STUDENT')) {
      router.replace('/');
    }
  }, [user, loading]);

  if (!user || user.role !== 'STUDENT') {
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
          height: 64,
          paddingBottom: 8,
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
        name="mark-attendance"
        options={{
          title: 'Mark Present',
          tabBarIcon: ({ color }) => (
            <SymbolView name="qrcode.viewfinder" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <SymbolView name="clock.fill" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
