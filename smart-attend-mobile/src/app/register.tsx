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

const LEVELS = ['100', '200', '300', '400', '500', '600'];
const SEMESTERS = ['1', '2'];

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState(''); 
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(''); 
  const [loading, setLoading] = useState(false);

  // Institution & Programme State
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<any>(null);
  const [institutionName, setInstitutionName] = useState('');
  const [loadingProgrammes, setLoadingProgrammes] = useState(false);
  const [showProgrammeModal, setShowProgrammeModal] = useState(false);

  // Level & Semester
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);

  // Courses
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const fetchProgrammes = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter an institution invite code first.');
      return;
    }

    setLoadingProgrammes(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.4:3000';
      const response = await fetch(`${API_URL}/api/public/programmes?inviteCode=${inviteCode.trim()}`);
      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Invalid institution invite code');
        setProgrammes([]);
        setInstitutionName('');
        return;
      }
      
      setProgrammes(data.programmes || []);
      setInstitutionName(data.institution?.name || '');
      if (data.programmes?.length > 0) {
        setShowProgrammeModal(true);
      } else {
        Alert.alert('Notice', 'No programmes found for this institution.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to connect to server.');
    } finally {
      setLoadingProgrammes(false);
    }
  };

  const fetchCourses = async () => {
    if (!selectedProgramme || !level || !semester) {
      Alert.alert('Required', 'Please select a programme, level, and semester first.');
      return;
    }

    setLoadingCourses(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.4:3000';
      const response = await fetch(`${API_URL}/api/public/courses?programmeId=${selectedProgramme.id}&level=${level}&semester=${semester}`);
      const data = await response.json();
      
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to fetch courses');
        return;
      }
      
      const fetchedCourses = data.courses || [];
      setCourses(fetchedCourses);
      
      // Auto-select compulsory courses
      const compulsoryIds = fetchedCourses.filter((c: any) => c.is_compulsory).map((c: any) => c.id);
      setSelectedCourseIds(compulsoryIds);
      
      setStep(2);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to connect to server.');
    } finally {
      setLoadingCourses(false);
    }
  };

  const toggleCourse = (id: string, isCompulsory: boolean) => {
    if (isCompulsory) {
      Alert.alert('Required', 'Compulsory courses cannot be removed.');
      return;
    }
    
    if (selectedCourseIds.includes(id)) {
      setSelectedCourseIds(selectedCourseIds.filter(courseId => courseId !== id));
    } else {
      setSelectedCourseIds([...selectedCourseIds, id]);
    }
  };

  const handleRegister = async () => {
    if (!name || !password || !studentId || !selectedProgramme || selectedCourseIds.length === 0) {
      Alert.alert('Error', 'Please fill out all fields and select at least one course.');
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
        programme_id: selectedProgramme.id,
        level,
        semester,
        selected_courses: selectedCourseIds
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
                {step === 1 ? 'Join SmartAttend today' : 'Confirm Your Courses'}
              </ThemedText>
            </Animated.View>
            
            {step === 1 ? (
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
                        setSelectedProgramme(null);
                      }}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: theme.primary }]}
                      onPress={fetchProgrammes}
                      disabled={loadingProgrammes}
                    >
                      {loadingProgrammes ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={{color: 'white', fontWeight: 'bold'}}>Verify</ThemedText>}
                    </TouchableOpacity>
                  </View>
                </View>

                {institutionName ? (
                  <>
                    <View style={styles.inputGroup}>
                      <ThemedText type="defaultSemiBold">Select Your Programme</ThemedText>
                      <TouchableOpacity 
                        style={[styles.dropdownBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                        onPress={() => setShowProgrammeModal(true)}
                      >
                        <ThemedText style={{ color: selectedProgramme ? theme.text : theme.textSecondary }}>
                          {selectedProgramme ? selectedProgramme.name : 'Tap to select...'}
                        </ThemedText>
                      </TouchableOpacity>
                      <ThemedText themeColor="textSecondary" style={{ fontSize: 12, marginTop: -4 }}>
                        {institutionName}
                      </ThemedText>
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <ThemedText type="defaultSemiBold">Level</ThemedText>
                        <TouchableOpacity 
                          style={[styles.dropdownBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                          onPress={() => setShowLevelModal(true)}
                        >
                          <ThemedText style={{ color: level ? theme.text : theme.textSecondary }}>
                            {level || 'Select'}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <ThemedText type="defaultSemiBold">Semester</ThemedText>
                        <TouchableOpacity 
                          style={[styles.dropdownBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                          onPress={() => setShowSemesterModal(true)}
                        >
                          <ThemedText style={{ color: semester ? theme.text : theme.textSecondary }}>
                            {semester || 'Select'}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
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
                  style={[styles.button, { backgroundColor: theme.primary, opacity: (!selectedProgramme || !level || !semester) ? 0.5 : 1 }]} 
                  onPress={fetchCourses}
                  disabled={loadingCourses || !selectedProgramme || !level || !semester}
                  activeOpacity={0.8}
                >
                  {loadingCourses ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Continue to Courses</ThemedText>
                  )}
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                  <ThemedText themeColor="textSecondary">Already have an account? </ThemedText>
                  <TouchableOpacity onPress={() => router.push('/')}>
                    <ThemedText style={[styles.loginLink, { color: theme.primary }]}>Sign In</ThemedText>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
                
                <View style={{ marginBottom: 16 }}>
                  <ThemedText type="subtitle" style={{ fontSize: 18 }}>Course Catalogue</ThemedText>
                  <ThemedText themeColor="textSecondary" style={{ fontSize: 14 }}>
                    {selectedProgramme?.name} • Level {level} • Sem {semester}
                  </ThemedText>
                </View>
                
                {courses.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center', backgroundColor: theme.backgroundElement, borderRadius: 12 }}>
                    <ThemedText>No courses found for this combination.</ThemedText>
                  </View>
                ) : (
                  <View style={{ maxHeight: 350 }}>
                    <ScrollView nestedScrollEnabled>
                      {courses.map(course => {
                        const isSelected = selectedCourseIds.includes(course.id);
                        return (
                          <TouchableOpacity 
                            key={course.id}
                            style={[
                              styles.courseCard, 
                              { 
                                backgroundColor: theme.backgroundElement,
                                borderColor: isSelected ? theme.primary : theme.border,
                                borderWidth: isSelected ? 2 : 1
                              }
                            ]}
                            onPress={() => toggleCourse(course.id, course.is_compulsory)}
                            activeOpacity={course.is_compulsory ? 1 : 0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <ThemedText style={{ fontWeight: 'bold' }}>{course.course_code}</ThemedText>
                              <ThemedText style={{ fontSize: 14 }}>{course.name}</ThemedText>
                              <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                                {course.credit_hours} Credits {course.is_compulsory ? '• Compulsory' : '• Elective'}
                              </ThemedText>
                            </View>
                            <View style={[
                              styles.checkbox, 
                              { 
                                borderColor: isSelected ? theme.primary : theme.textSecondary,
                                backgroundColor: isSelected ? theme.primary : 'transparent'
                              }
                            ]}>
                              {isSelected && <ThemedText style={{ color: 'white', fontSize: 12 }}>✓</ThemedText>}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                  <TouchableOpacity 
                    style={[styles.button, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border }]} 
                    onPress={() => setStep(1)}
                  >
                    <ThemedText style={{ color: theme.text, fontWeight: '700' }}>Back</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, { flex: 2, backgroundColor: theme.primary }]} 
                    onPress={handleRegister}
                    disabled={loading || courses.length === 0}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <ThemedText style={styles.buttonText}>Complete Sign Up</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
            
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Programme Selection Modal */}
      <Modal visible={showProgrammeModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Select Your Programme</ThemedText>
              <TouchableOpacity onPress={() => setShowProgrammeModal(false)}>
                <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
            <FlatList
              data={programmes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.cohortItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setSelectedProgramme(item);
                    setShowProgrammeModal(false);
                  }}
                >
                  <ThemedText style={{ fontWeight: selectedProgramme?.id === item.id ? 'bold' : 'normal', color: selectedProgramme?.id === item.id ? theme.primary : theme.text }}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{item.department}</ThemedText>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Level Modal */}
      <Modal visible={showLevelModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Select Level</ThemedText>
              <TouchableOpacity onPress={() => setShowLevelModal(false)}>
                <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {LEVELS.map(l => (
                <TouchableOpacity 
                  key={l}
                  style={[styles.cohortItem, { borderBottomColor: theme.border }]}
                  onPress={() => { setLevel(l); setShowLevelModal(false); }}
                >
                  <ThemedText style={{ fontWeight: level === l ? 'bold' : 'normal', color: level === l ? theme.primary : theme.text }}>
                    Level {l}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Semester Modal */}
      <Modal visible={showSemesterModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '40%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Select Semester</ThemedText>
              <TouchableOpacity onPress={() => setShowSemesterModal(false)}>
                <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SEMESTERS.map(s => (
                <TouchableOpacity 
                  key={s}
                  style={[styles.cohortItem, { borderBottomColor: theme.border }]}
                  onPress={() => { setSemester(s); setShowSemesterModal(false); }}
                >
                  <ThemedText style={{ fontWeight: semester === s ? 'bold' : 'normal', color: semester === s ? theme.primary : theme.text }}>
                    Semester {s}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    justifyContent: 'center',
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
    height: 54,
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
  },
  courseCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  }
});
