import { Tabs, router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';

export default function LecturerLayout() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  useEffect(() => {
    if (!loading && (!user || user.role !== 'LECTURER')) {
      router.replace('/');
    }
  }, [user, loading]);

  if (!user || user.role !== 'LECTURER') {
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
        name="start-session"
        options={{
          title: 'Session',
          tabBarIcon: ({ color }) => (
            <SymbolView name="play.circle.fill" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.3.fill" size={24} tintColor={color} fallback={undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
