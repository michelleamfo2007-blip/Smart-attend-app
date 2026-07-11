import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, UserRole, User } from '../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">Join SmartAttend today</ThemedText>
            </View>
            
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Full Name</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
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
                    style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }, role === 'STUDENT' && styles.roleCardActive]}
                    onPress={() => setRole('STUDENT')}
                  >
                    <ThemedText style={[styles.roleText, role === 'STUDENT' && styles.roleTextActive]}>Student</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }, role === 'LECTURER' && styles.roleCardActive]}
                    onPress={() => setRole('LECTURER')}
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
                          style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, padding: 8 }, level === lvl && styles.roleCardActive]}
                          onPress={() => setLevel(lvl)}
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
                          style={[styles.roleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }, semester === sem && styles.roleCardActive]}
                          onPress={() => setSemester(sem)}
                        >
                          <ThemedText style={[styles.roleText, semester === sem && styles.roleTextActive]}>{sem}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity 
                style={styles.button} 
                onPress={handleRegister}
                disabled={loading}
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
                  <ThemedText style={styles.loginLink}>Sign In</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  roleContainer: { flexDirection: 'row', gap: Spacing.four },
  roleCard: {
    flex: 1,
    padding: Spacing.four,
    borderWidth: 1,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  roleText: { color: '#6b7280', fontWeight: '500' },
  roleTextActive: { color: '#3b82f6', fontWeight: 'bold' },
  button: {
    backgroundColor: '#e01e37',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  loginLink: { color: '#e01e37', fontWeight: 'bold' },
});
