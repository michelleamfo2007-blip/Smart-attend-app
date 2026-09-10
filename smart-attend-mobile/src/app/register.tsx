import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, User } from '../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { getDeviceId } from '../lib/deviceId';
import { apiFetch } from '../lib/api';

type Programme = {
  id: string;
  name: string;
  department?: string;
  college?: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);
  const [loadingProgrammes, setLoadingProgrammes] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) {
      setProgrammes([]);
      setSelectedProgrammeId(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingProgrammes(true);
      try {
        const data = await apiFetch(`/api/public/programmes?inviteCode=${encodeURIComponent(code)}`);
        if (cancelled) return;
        const list: Programme[] = data.programmes || [];
        setProgrammes(list);
        setSelectedProgrammeId((prev) =>
          prev && list.some((p) => p.id === prev) ? prev : list[0]?.id || null
        );
      } catch {
        if (!cancelled) {
          setProgrammes([]);
          setSelectedProgrammeId(null);
        }
      } finally {
        if (!cancelled) setLoadingProgrammes(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inviteCode]);

  const canSubmit = Boolean(
    firstName.trim() &&
      lastName.trim() &&
      studentId.trim() &&
      inviteCode.trim() &&
      password &&
      selectedProgrammeId
  );

  const handleRegister = async () => {
    if (!canSubmit) {
      Alert.alert('Error', 'Please fill out all fields and select a program.');
      return;
    }

    setLoading(true);
    try {
      const currentDeviceId = await getDeviceId();
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        password,
        role: 'STUDENT',
        device_id: currentDeviceId,
        student_id: studentId.trim(),
        inviteCode: inviteCode.trim().toUpperCase(),
        programme_id: selectedProgrammeId,
      };

      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

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
        role: newUser.role,
        level: newUser.level,
        semester: newUser.semester,
        institution_id: newUser.institution_id,
        student_id: newUser.student_id,
      };

      await login(userSession, token);
      router.replace('/(student)');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
  ];

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
                <View style={styles.nameRow}>
                  <View style={[styles.inputGroup, styles.nameField]}>
                    <ThemedText type="defaultSemiBold">First name</ThemedText>
                    <TextInput
                      style={fieldStyle}
                      placeholder="Kwame"
                      placeholderTextColor={theme.textSecondary}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.nameField]}>
                    <ThemedText type="defaultSemiBold">Last name</ThemedText>
                    <TextInput
                      style={fieldStyle}
                      placeholder="Mensah"
                      placeholderTextColor={theme.textSecondary}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold">Student ID</ThemedText>
                  <TextInput
                    style={fieldStyle}
                    placeholder="e.g. 10293847"
                    placeholderTextColor={theme.textSecondary}
                    value={studentId}
                    onChangeText={setStudentId}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold">Institution code</ThemedText>
                  <TextInput
                    style={fieldStyle}
                    placeholder="e.g. IPMC-2026"
                    placeholderTextColor={theme.textSecondary}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                  />
                </View>

                {inviteCode.trim().length >= 4 && (
                  <View style={styles.inputGroup}>
                    <ThemedText type="defaultSemiBold">Program</ThemedText>
                    {loadingProgrammes ? (
                      <ActivityIndicator color={theme.primary} style={{ marginVertical: 8 }} />
                    ) : programmes.length === 0 ? (
                      <ThemedText themeColor="textSecondary" style={styles.helper}>
                        No programs found for this code. Check the institution code.
                      </ThemedText>
                    ) : (
                      <View style={styles.programmeList}>
                        {programmes.map((prog) => {
                          const selected = selectedProgrammeId === prog.id;
                          return (
                            <TouchableOpacity
                              key={prog.id}
                              style={[
                                styles.programmeItem,
                                {
                                  backgroundColor: theme.backgroundElement,
                                  borderColor: selected ? theme.primary : theme.border,
                                },
                              ]}
                              onPress={() => setSelectedProgrammeId(prog.id)}
                              activeOpacity={0.8}
                            >
                              <ThemedText
                                type="defaultSemiBold"
                                style={selected ? { color: theme.primary } : undefined}
                              >
                                {prog.name}
                              </ThemedText>
                              {!!(prog.department || prog.college) && (
                                <ThemedText themeColor="textSecondary" style={styles.programmeMeta}>
                                  {[prog.department, prog.college].filter(Boolean).join(' · ')}
                                </ThemedText>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold">Password</ThemedText>
                  <TextInput
                    style={fieldStyle}
                    placeholder="Create a password"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.primary, opacity: canSubmit ? 1 : 0.5 }]}
                  onPress={handleRegister}
                  disabled={loading || !canSubmit}
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
  nameRow: { flexDirection: 'row', gap: Spacing.three },
  nameField: { flex: 1 },
  inputGroup: { gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  helper: { fontSize: 14, lineHeight: 20 },
  programmeList: { gap: Spacing.two },
  programmeItem: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
  },
  programmeMeta: { fontSize: 12, marginTop: 4 },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
    justifyContent: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  loginLink: { fontWeight: 'bold' },
});
