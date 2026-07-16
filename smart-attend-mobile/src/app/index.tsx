import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, User } from '../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../lib/supabase';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AnimatedIcon } from '@/components/animated-icon';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!showSplash && !authLoading && user) {
      if (user.role === 'ADMIN') {
        router.replace('/(admin)');
      } else if (user.role === 'LECTURER') {
        router.replace('/(lecturer)');
      } else {
        router.replace('/(student)');
      }
    }
  }, [showSplash, authLoading, user]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      // Check Supabase for user
      const { data: foundUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password', password)
        .maybeSingle();

      if (error || !foundUser) {
        Alert.alert('Login Failed', 'Invalid email or password.');
        setLoading(false);
        return;
      }
      
      const userSession: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role
      };

      await login(userSession);
      
      // Route based on role
      if (userSession.role === 'ADMIN') {
        router.replace('/(admin)');
      } else if (userSession.role === 'LECTURER') {
        router.replace('/(lecturer)');
      } else {
        router.replace('/(student)');
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
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>SmartAttend</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">Sign in to your account</ThemedText>
            </View>
            
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Email address</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="you@university.edu"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Password</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogin}
                disabled={loading}
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
                  <ThemedText style={styles.registerLink}>Sign Up</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#208AEF' },
  splashInner: { alignItems: 'center', gap: 20 },
  splashText: { color: 'white', fontSize: 32, fontWeight: 'bold', marginTop: 20 },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.four, justifyContent: 'center' },
  content: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.six },
  title: { fontSize: 32, marginBottom: Spacing.one },
  subtitle: { fontSize: 16 },
  form: { gap: Spacing.four },
  inputGroup: { gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e01e37',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  registerLink: { color: '#e01e37', fontWeight: 'bold' },
});
