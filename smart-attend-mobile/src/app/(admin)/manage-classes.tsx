import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { User } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ManageClassesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [classes, setClasses] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(null);
  const [level, setLevel] = useState('Level 3');
  const [semester, setSemester] = useState('First');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: existingClasses } = await supabase
        .from('classes')
        .select(`id, name, lecturer_id, level, semester, schedule_time, users (name)`);
      
      const { data: existingUsers } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'LECTURER');
      
      if (existingClasses) {
        setClasses(existingClasses.map(c => ({
          id: c.id,
          name: c.name,
          lecturerId: c.lecturer_id,
          lecturerName: (c.users as any)?.name || 'Unknown',
          level: c.level,
          semester: c.semester,
          scheduleTime: c.schedule_time
        })));
      }
      if (existingUsers) {
        setLecturers(existingUsers);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingClassId(null);
    setNewClassName('');
    setSelectedLecturerId(null);
    setLevel('Level 3');
    setSemester('First');
    setScheduleTime('');
    setIsFormVisible(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingClassId(item.id);
    setNewClassName(item.name);
    setSelectedLecturerId(item.lecturerId);
    setLevel(item.level || 'Level 3');
    setSemester(item.semester || 'First');
    setScheduleTime(item.scheduleTime || '');
    setIsFormVisible(true);
  };

  const handleDeleteClass = (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this class? This will also delete all attendance records for this class.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            const { error } = await supabase.from('classes').delete().eq('id', id);
            if (error) throw error;
            setClasses(classes.filter(c => c.id !== id));
          } catch (err) {
            Alert.alert("Error", "Failed to delete class.");
          }
      }}
    ]);
  };

  const handleSaveClass = async () => {
    if (!newClassName || !selectedLecturerId) {
      Alert.alert('Error', 'Please provide a class name and select a lecturer.');
      return;
    }

    const lecturer = lecturers.find(l => l.id === selectedLecturerId);
    
    try {
      if (editingClassId) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update({
            name: newClassName,
            lecturer_id: selectedLecturerId,
            level,
            semester,
            schedule_time: scheduleTime
          })
          .eq('id', editingClassId);

        if (error) throw error;

        setClasses(classes.map(c => c.id === editingClassId ? {
          ...c,
          name: newClassName,
          lecturerId: selectedLecturerId,
          lecturerName: lecturer?.name || 'Unknown',
          level,
          semester,
          scheduleTime
        } : c));

      } else {
        // Insert new class
        const { data: insertedClass, error } = await supabase
          .from('classes')
          .insert({
            name: newClassName,
            lecturer_id: selectedLecturerId,
            level,
            semester,
            schedule_time: scheduleTime
          })
          .select(`id, name, lecturer_id, level, semester, schedule_time, users (name)`)
          .single();

        if (error || !insertedClass) throw error;

        const formattedClass = {
          id: insertedClass.id,
          name: insertedClass.name,
          lecturerId: insertedClass.lecturer_id,
          lecturerName: (insertedClass.users as any)?.name || lecturer?.name || 'Unknown',
          level: insertedClass.level,
          semester: insertedClass.semester,
          scheduleTime: insertedClass.schedule_time
        };

        setClasses([...classes, formattedClass]);
      }
      
      setIsFormVisible(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save class.');
    }
  };

  const renderClassItem = ({ item }: { item: any }) => (
    <View style={[styles.classCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
      <View style={styles.classInfo}>
        <ThemedText style={styles.className}>{item.name}</ThemedText>
        <ThemedText themeColor="textSecondary">{item.level} | {item.semester} Semester</ThemedText>
        {item.scheduleTime ? <ThemedText style={{ color: '#8b5cf6', fontSize: 13, fontWeight: 'bold' }}>{item.scheduleTime}</ThemedText> : null}
        <ThemedText themeColor="textSecondary">Lecturer: {item.lecturerName}</ThemedText>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleOpenEdit(item)}>
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteClass(item.id)}>
          <Text style={styles.actionTextDelete}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Manage Classes</ThemedText>
        <ThemedText themeColor="textSecondary">Create, edit, and assign classes</ThemedText>
      </View>

      {isFormVisible ? (
        <View style={[styles.createForm, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.formTitle}>{editingClassId ? 'Edit Class' : 'Create New Class'}</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Course Name (e.g., CS 101)"
            placeholderTextColor={theme.textSecondary}
            value={newClassName}
            onChangeText={setNewClassName}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Schedule (e.g., Tuesdays @ 9am)"
            placeholderTextColor={theme.textSecondary}
            value={scheduleTime}
            onChangeText={setScheduleTime}
          />

          <ThemedText style={styles.label}>Level:</ThemedText>
          <View style={styles.lecturerList}>
            {['Level 3', 'Level 4', 'Level 5', 'Level 6'].map(lvl => (
              <TouchableOpacity
                key={lvl}
                style={[styles.lecturerChip, level === lvl && styles.lecturerChipActive]}
                onPress={() => setLevel(lvl)}
              >
                <Text style={[styles.lecturerChipText, level === lvl && styles.lecturerChipTextActive]}>
                  {lvl.replace('Level ', 'L')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ThemedText style={styles.label}>Semester:</ThemedText>
          <View style={styles.lecturerList}>
            {['First', 'Second'].map(sem => (
              <TouchableOpacity
                key={sem}
                style={[styles.lecturerChip, semester === sem && styles.lecturerChipActive]}
                onPress={() => setSemester(sem)}
              >
                <Text style={[styles.lecturerChipText, semester === sem && styles.lecturerChipTextActive]}>
                  {sem}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <ThemedText style={styles.label}>Assign Lecturer:</ThemedText>
          <View style={styles.lecturerList}>
            {lecturers.map(l => (
              <TouchableOpacity
                key={l.id}
                style={[styles.lecturerChip, selectedLecturerId === l.id && styles.lecturerChipActive]}
                onPress={() => setSelectedLecturerId(l.id)}
              >
                <Text style={[styles.lecturerChipText, selectedLecturerId === l.id && styles.lecturerChipTextActive]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
            {lecturers.length === 0 && (
              <Text style={{ color: 'red' }}>No lecturers registered yet!</Text>
            )}
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsFormVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveClass}>
              <Text style={styles.saveButtonText}>{editingClassId ? 'Update Class' : 'Save Class'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={handleOpenCreate}>
          <Text style={styles.addButtonText}>+ Create New Class</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : classes.length === 0 && !isFormVisible ? (
        <View style={styles.emptyContainer}>
          <ThemedText themeColor="textSecondary">No classes created yet.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={renderClassItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.six },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingBottom: Spacing.eight, gap: Spacing.four },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  classCard: {
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classInfo: { flex: 1 },
  className: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editButton: { padding: 8, backgroundColor: '#e5e7eb', borderRadius: 4 },
  deleteButton: { padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 4 },
  actionText: { color: '#374151', fontWeight: '600', fontSize: 12 },
  actionTextDelete: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
  createForm: {
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.six,
  },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: Spacing.four },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: Spacing.four,
  },
  label: { fontWeight: '600', marginBottom: Spacing.two },
  lecturerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.four },
  lecturerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  lecturerChipActive: { backgroundColor: '#3b82f6' },
  lecturerChipText: { color: '#374151' },
  lecturerChipTextActive: { color: 'white', fontWeight: 'bold' },
  formActions: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.four },
  cancelButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#e5e7eb' },
  cancelButtonText: { color: '#374151', fontWeight: 'bold' },
  saveButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#10b981' },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
});
