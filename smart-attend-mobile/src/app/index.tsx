import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, User } from '../context/AuthContext';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { AnimatedIcon } from '@/components/animated-icon';
import { getDeviceId } from '../lib/deviceId';
import { apiFetch } from '../lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login, logout, user, loading: authLoading } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!authLoading && user) {
      const role = user.role?.toUpperCase();
      if (role === 'ADMIN') router.replace('/(admin)');
      else if (role === 'LECTURER') router.replace('/(lecturer)');
      else if (role === 'STUDENT') router.replace('/(student)');
    }
  }, [authLoading, user?.id]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter your index number (or staff email) and password.');
      return;
    }

    setLoading(true);
    try {
      const currentDeviceId = await getDeviceId();
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: identifier.toLowerCase().trim(),
          student_id: identifier.trim(),
          password,
          device_id: currentDeviceId,
        }),
      });

      const foundUser = data.user;
      const token = data.token;

      if (!foundUser || !token) {
        Alert.alert('Login Failed', 'Invalid response from server.');
        return;
      }

      const userSession: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        level: foundUser.level,
        semester: foundUser.semester,
        institution_id: foundUser.institution_id,
        student_id: foundUser.student_id,
      };

      await login(userSession, token);

      const role = userSession.role?.toUpperCase();
      if (role === 'ADMIN') router.replace('/(admin)');
      else if (role === 'LECTURER') router.replace('/(lecturer)');
      else if (role === 'STUDENT') router.replace('/(student)');
      else {
        Alert.alert('Login Failed', 'Unknown user role.');
        await logout();
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <AnimatedIcon />
              <Text style={[styles.title, { color: theme.text }]}>SmartAttend</Text>
              <Text style={{ color: theme.textSecondary }}>Sign in to your account</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Index Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                  placeholder="Your student index number"
                  placeholderTextColor={theme.textSecondary}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                  Lecturers and staff can sign in with email instead.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
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
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.registerContainer}>
                <Text style={{ color: theme.textSecondary }}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={[styles.registerLink, { color: theme.primary }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.four, justifyContent: 'center' },
  content: { maxWidth: 400, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.six, gap: 8 },
  title: { fontSize: 32, marginTop: Spacing.four, fontWeight: '800' },
  form: { gap: Spacing.four },
  inputGroup: { gap: Spacing.two },
  label: { fontWeight: '600' },
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
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  registerLink: { fontWeight: 'bold' },
});
