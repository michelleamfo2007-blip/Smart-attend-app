import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function DisputesScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<any[]>([]);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch user's disputes
      const { data: myDisputes } = await supabase
        .from('attendance_disputes')
        .select('*, classes(name)')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });
      
      setDisputes(myDisputes || []);

      // Fetch classes they are enrolled in for the dropdown
      const { data: myClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('level', user?.level)
        .eq('semester', user?.semester);
      
      setClasses(myClasses || []);
      if (myClasses && myClasses.length > 0) {
        setSelectedClass(myClasses[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClass || !reason.trim()) {
      Alert.alert("Error", "Please select a class and provide a reason.");
      return;
    }

    setSubmitting(true);
    try {
      // Find the most recent session for this class to link the dispute to.
      // In a more robust app, the user would select the exact date/session.
      const { data: recentSessions } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('class_id', selectedClass.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!recentSessions || recentSessions.length === 0) {
        Alert.alert("Error", "No attendance sessions have been created for this class yet, so you cannot dispute attendance.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('attendance_disputes')
        .insert({
          student_id: user?.id,
          class_id: selectedClass.id,
          session_id: recentSessions[0].id,
          reason: reason.trim(),
          status: 'pending'
        });

      if (error) throw error;

      if (Platform.OS === 'web') {
         window.alert("Dispute submitted successfully.");
      } else {
         Alert.alert("Success", "Dispute submitted successfully.");
      }
      setReason('');
      setShowForm(false);
      fetchData(); // Refresh list
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return '#10b981';
    if (status === 'rejected') return '#ef4444';
    return '#f59e0b'; // pending
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">Disputes & Support</ThemedText>
        <ThemedText themeColor="textSecondary">Request attendance corrections</ThemedText>
      </View>

      <TouchableOpacity 
        style={[styles.newRequestBtn, { backgroundColor: theme.primary }]}
        onPress={() => setShowForm(!showForm)}
      >
        <SymbolView name={showForm ? "xmark" : "plus"} size={20} tintColor="white" />
        <Text style={styles.newRequestText}>{showForm ? "Cancel Request" : "New Dispute Request"}</Text>
      </TouchableOpacity>

      {showForm && (
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.formContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={styles.label}>Select Class</ThemedText>
          <View style={styles.classChips}>
            {classes.map(cls => (
              <TouchableOpacity 
                key={cls.id}
                style={[styles.classChip, selectedClass?.id === cls.id && { backgroundColor: theme.primary }]}
                onPress={() => setSelectedClass(cls)}
              >
                <Text style={[styles.classChipText, selectedClass?.id === cls.id && { color: 'white', fontWeight: 'bold' }]}>
                  {cls.name.split('_')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ThemedText style={styles.label}>Reason for Dispute</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="e.g. My GPS location was drifting during class"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity 
            style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]} 
            onPress={handleSubmit} 
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Submit Request</Text>}
          </TouchableOpacity>
        </Animated.View>
      )}

      <ThemedText style={styles.sectionTitle}>My Requests</ThemedText>
      {disputes.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 20 }}>No dispute requests found.</ThemedText>
      ) : (
        <View style={styles.list}>
          {disputes.map(dispute => {
             const statusColor = getStatusColor(dispute.status);
             return (
               <View key={dispute.id} style={[styles.disputeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                 <View style={styles.disputeHeader}>
                   <ThemedText style={{ fontWeight: 'bold' }}>{dispute.classes?.name?.split('_')[0] || 'Unknown Class'}</ThemedText>
                   <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                     <Text style={{ color: statusColor, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                       {dispute.status}
                     </Text>
                   </View>
                 </View>
                 <ThemedText themeColor="textSecondary" style={{ fontSize: 13, marginBottom: 8 }}>{dispute.reason}</ThemedText>
                 <ThemedText themeColor="textSecondary" style={{ fontSize: 11 }}>
                   Submitted: {new Date(dispute.created_at).toLocaleDateString()}
                 </ThemedText>
               </View>
             );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six, marginTop: Spacing.two },
  newRequestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, marginBottom: Spacing.six },
  newRequestText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  formContainer: { padding: Spacing.four, borderRadius: 12, borderWidth: 1, marginBottom: Spacing.six },
  label: { fontWeight: '600', marginBottom: 8 },
  classChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  classChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#e5e7eb' },
  classChipText: { color: '#374151' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, height: 100, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: Spacing.four, marginLeft: 4, opacity: 0.5 },
  list: { gap: Spacing.four },
  disputeCard: { padding: Spacing.four, borderRadius: 12, borderWidth: 1 },
  disputeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }
});
