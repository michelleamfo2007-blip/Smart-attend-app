import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, User } from '../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { AnimatedIcon } from '@/components/animated-icon';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getDeviceId } from '../lib/deviceId';

export default function LoginScreen() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [identifier, setIdentifier] = useState(''); // Can be Email or Student ID
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  
  const { expoPushToken } = usePushNotifications();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!showSplash && !authLoading && user) {
      const role = user.role?.toUpperCase();
      if (role === 'ADMIN') {
        router.replace('/(admin)');
      } else if (role === 'LECTURER') {
        router.replace('/(lecturer)');
      } else if (role === 'STUDENT') {
        router.replace('/(student)');
      } else {
        console.error("Unknown user role:", user.role);
      }
    }
  }, [showSplash, authLoading, user?.id]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter your email/ID and password.');
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.4:3000';
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: identifier.toLowerCase().trim(), 
          student_id: identifier.trim(), // Backend will try both fields
          password 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Login Failed', data.error || 'Invalid credentials.');
        setLoading(false);
        return;
      }
      
      const foundUser = data.user;
      const token = data.token;
      
      if (!foundUser || !token) {
        Alert.alert('Login Failed', 'Invalid response from server.');
        setLoading(false);
        return;
      }

      const userSession: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        level: foundUser.level,
        semester: foundUser.semester,
        institution_id: foundUser.institution_id
      };

      // Set the session FIRST so Supabase is authenticated for the next queries
      await login(userSession, token);
      
      // DEVICE BINDING LOGIC
      const currentDeviceId = await getDeviceId();
      
      const { data: deviceOwner } = await supabase
        .from('users')
        .select('id, email')
        .eq('device_id', currentDeviceId)
        .neq('id', foundUser.id)
        .maybeSingle();

      if (deviceOwner) {
         await logout();
         Alert.alert(
           'Device Binding Error',
           'This phone is already registered to another user. You cannot use the same phone for multiple accounts.'
         );
         setLoading(false);
         return;
      }

      if (!foundUser.device_id) {
        await supabase.from('users').update({ device_id: currentDeviceId }).eq('id', foundUser.id);
      } else if (foundUser.device_id !== currentDeviceId) {
        await logout();
        Alert.alert(
          'Device Binding Error',
          'This account is registered on another device. Please contact an administrator if you got a new phone.'
        );
        setLoading(false);
        return;
      }
      
      // Save push token if available
      if (expoPushToken) {
         await supabase.from('users').update({ push_token: expoPushToken }).eq('id', foundUser.id);
      }
      
      // Route based on role
      const role = userSession.role?.toUpperCase();
      if (role === 'ADMIN') {
        router.replace('/(admin)');
      } else if (role === 'LECTURER') {
        router.replace('/(lecturer)');
      } else if (role === 'STUDENT') {
        router.replace('/(student)');
      } else {
        Alert.alert('Login Failed', 'Unknown user role.');
        await logout();
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View entering={FadeIn.duration(1000)} exiting={FadeOut.duration(500)} style={styles.splashInner}>
          <AnimatedIcon />
          <ThemedText style={styles.splashText} type="title">SmartAttend</ThemedText>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
            <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.header}>
              <AnimatedIcon />
              <ThemedText type="title" style={styles.title}>SmartAttend</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">Sign in to your account</ThemedText>
            </Animated.View>
            
            <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Email address or Index Number</ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }
                  ]}
                  placeholder="you@university.edu or 10293847"
                  placeholderTextColor={theme.textSecondary}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Password</ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, { backgroundColor: theme.primary }]} 
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Sign In</ThemedText>
                )}
              </TouchableOpacity>

              <View style={styles.registerContainer}>
                <ThemedText themeColor="textSecondary">Don't have an account? </ThemedText>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <ThemedText style={[styles.registerLink, { color: theme.primary }]}>Sign Up</ThemedText>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED' },
  splashInner: { alignItems: 'center', gap: 20 },
  splashText: { color: 'white', fontSize: 32, fontWeight: 'bold', marginTop: 20 },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.four, justifyContent: 'center' },
  content: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.six, gap: 8 },
  title: { fontSize: 32, marginTop: Spacing.four },
  subtitle: { fontSize: 16 },
  form: { gap: Spacing.four },
  inputGroup: { gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  registerLink: { fontWeight: 'bold' },
});
