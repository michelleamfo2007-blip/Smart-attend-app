import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, FlatList } from 'react-native';
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
  const [studentId, setStudentId] = useState(''); // Index Number for Students
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(''); // Institution invite code
  const [loading, setLoading] = useState(false);

  // Cohort Selection State
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [institutionName, setInstitutionName] = useState('');

  const fetchCohorts = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter an institution invite code first.');
      return;
    }

    setLoadingCohorts(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.4:3000';
      const response = await fetch(`${API_URL}/api/public/cohorts?inviteCode=${inviteCode.trim()}`);
      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Invalid institution invite code');
        setCohorts([]);
        setInstitutionName('');
        return;
      }
      
      setCohorts(data.cohorts || []);
      setInstitutionName(data.institution?.name || '');
      if (data.cohorts?.length > 0) {
        setShowCohortModal(true);
      } else {
        Alert.alert('Notice', 'No programs found for this institution.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to connect to server.');
    } finally {
      setLoadingCohorts(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !password || !studentId || !selectedCohort) {
      Alert.alert('Error', 'Please fill out all required fields, including your Index Number and Program.');
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
        cohort_id: selectedCohort.id
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
      
      // Log them in using context
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
      
      // Route based on role
      if (userSession.role === 'ADMIN') {
        router.replace('/(admin)');
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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
                    placeholder="Enter school code"
                    placeholderTextColor={theme.textSecondary}
                    value={inviteCode}
                    onChangeText={(txt) => {
                      setInviteCode(txt);
                      setSelectedCohort(null);
                    }}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity 
                    style={[styles.smallBtn, { backgroundColor: theme.primary }]}
                    onPress={fetchCohorts}
                    disabled={loadingCohorts}
                  >
                    {loadingCohorts ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={{color: 'white', fontWeight: 'bold'}}>Verify</ThemedText>}
                  </TouchableOpacity>
                </View>
              </View>

              {institutionName ? (
                <View style={styles.inputGroup}>
                  <ThemedText type="defaultSemiBold">Select Your Program</ThemedText>
                  <TouchableOpacity 
                    style={[styles.dropdownBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                    onPress={() => setShowCohortModal(true)}
                  >
                    <ThemedText style={{ color: selectedCohort ? theme.text : theme.textSecondary }}>
                      {selectedCohort ? selectedCohort.name : 'Tap to select...'}
                    </ThemedText>
                  </TouchableOpacity>
                  <ThemedText themeColor="textSecondary" style={{ fontSize: 12, marginTop: -4 }}>
                    {institutionName}
                  </ThemedText>
                </View>
              ) : null}

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

      {/* Program Selection Modal */}
      <Modal visible={showCohortModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Select Your Program</ThemedText>
              <TouchableOpacity onPress={() => setShowCohortModal(false)}>
                <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={cohorts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.cohortItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setSelectedCohort(item);
                    setShowCohortModal(false);
                  }}
                >
                  <ThemedText style={{ fontWeight: selectedCohort?.id === item.id ? 'bold' : 'normal', color: selectedCohort?.id === item.id ? theme.primary : theme.text }}>
                    {item.name}
                  </ThemedText>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  loginLink: { fontWeight: 'bold' },
  smallBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  dropdownBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cohortItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  }
});
