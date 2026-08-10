import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, UserRole, User } from '../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { getDeviceId } from '../lib/deviceId';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState(''); 
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(''); 
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !password || !studentId || !inviteCode) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      const currentDeviceId = await getDeviceId();
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.4:3000';
      
      const payload = {
        name,
        password,
        role: 'STUDENT',
        device_id: currentDeviceId,
        student_id: studentId.trim(),
        inviteCode: inviteCode.trim()
      };

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Registration Failed', data.error || 'An error occurred during registration.');
        setLoading(false);
        return;
      }
      
      const newUser = data.user;
      const token = data.token;
      
      if (!newUser || !token) {
        Alert.alert('Error', 'Invalid response from server.');
        setLoading(false);
        return;
      }
      
      const userSession: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        level: newUser.level,
        semester: newUser.semester,
        institution_id: newUser.institution_id
      };
      
      await login(userSession, token);
      router.replace('/(student)');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(800)} style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
            <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.header}>
              <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Join SmartAttend today
              </ThemedText>
            </Animated.View>
            
            <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Full Name</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                  placeholder="John Doe"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Index Number (Student ID)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g. 10293847"
                  placeholderTextColor={theme.textSecondary}
                  value={studentId}
                  onChangeText={setStudentId}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Institution Invite Code</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g. UG-2026"
                  placeholderTextColor={theme.textSecondary}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Password</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                  placeholder="Create a password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, { backgroundColor: theme.primary, opacity: (!name || !studentId || !inviteCode || !password) ? 0.5 : 1 }]} 
                onPress={handleRegister}
                disabled={loading || !name || !studentId || !inviteCode || !password}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Complete Sign Up</ThemedText>
                )}
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <ThemedText themeColor="textSecondary">Already have an account? </ThemedText>
                <TouchableOpacity onPress={() => router.push('/')}>
                  <ThemedText style={[styles.loginLink, { color: theme.primary }]}>Sign In</ThemedText>
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
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
    justifyContent: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  loginLink: { fontWeight: 'bold' }
});
