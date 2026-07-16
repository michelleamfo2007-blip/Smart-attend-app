import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, UserRole, User } from '../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [level, setLevel] = useState('Level 3');
  const [semester, setSemester] = useState('First');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        Alert.alert('Error', 'An account with this email already exists.');
        setLoading(false);
        return;
      }

      // Create new user object in Supabase
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          name,
          email: email.toLowerCase(),
          password,
          role,
          level: role === 'STUDENT' ? level : null,
          semester: role === 'STUDENT' ? semester : null
        })
        .select()
        .single();

      if (error || !newUser) {
        throw new Error(error?.message || 'Failed to create account');
      }
      
      // Log them in using context (without the password field)
      const userSession: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        level: newUser.level,
        semester: newUser.semester
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
              <ThemedText style={styles.subtitle} themeColor="textSecondary">Join SmartAttend today</ThemedText>
            </Animated.View>
            
            <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Full Name</ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }
                  ]}
                  placeholder="John Doe"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Email address</ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }
                  ]}
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
                  style={[
                    styles.input, 
                    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }
                  ]}
                  placeholder="Create a password"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">I am a...</ThemedText>
                <View style={styles.roleContainer}>
                  <TouchableOpacity 
                    style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, role === 'STUDENT' && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
                    onPress={() => setRole('STUDENT')}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.roleText, role === 'STUDENT' && styles.roleTextActive]}>Student</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, role === 'LECTURER' && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
                    onPress={() => setRole('LECTURER')}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.roleText, role === 'LECTURER' && styles.roleTextActive]}>Lecturer</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {role === 'STUDENT' && (
                <>
                  <View style={styles.inputGroup}>
                    <ThemedText type="defaultSemiBold">Level</ThemedText>
                    <View style={styles.roleContainer}>
                      {['Level 3', 'Level 4', 'Level 5', 'Level 6'].map(lvl => (
                        <TouchableOpacity 
                          key={lvl}
                          style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border, padding: 8 }, level === lvl && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
                          onPress={() => setLevel(lvl)}
                          activeOpacity={0.7}
                        >
                          <ThemedText style={[{fontSize: 12, textAlign: 'center'}, styles.roleText, level === lvl && styles.roleTextActive]}>{lvl.replace('Level ', 'L')}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="defaultSemiBold">Semester</ThemedText>
                    <View style={styles.roleContainer}>
                      {['First', 'Second'].map(sem => (
                        <TouchableOpacity 
                          key={sem}
                          style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, semester === sem && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
                          onPress={() => setSemester(sem)}
                          activeOpacity={0.7}
                        >
                          <ThemedText style={[styles.roleText, semester === sem && styles.roleTextActive]}>{sem}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity 
                style={[styles.button, { backgroundColor: theme.primary }]} 
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleContainer: { flexDirection: 'row', gap: Spacing.four },
  roleCard: {
    flex: 1,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleText: { color: '#64748B', fontWeight: '500' },
  roleTextActive: { color: '#2563EB', fontWeight: 'bold' },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  loginLink: { fontWeight: 'bold' },
});
