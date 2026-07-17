import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '@/components/themed-text';

const PColors = {
  background: '#0F172A',
  card: '#1E293B',
  primary: '#6366F1',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  border: 'rgba(255,255,255,0.1)'
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({ name })
          .eq('id', user.id);

        if (error) throw error;
        
        Alert.alert("Success", "Profile updated successfully!");
        router.back();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={PColors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.title}>Edit Profile</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <ThemedText type="smallBold" style={styles.label}>Full Name</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={PColors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText type="smallBold" style={styles.label}>Student ID (Read-only)</ThemedText>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={user?.id}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText type="smallBold" style={styles.label}>Phone Number</ThemedText>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+233 XX XXX XXXX"
            placeholderTextColor={PColors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.saveButtonText}>Save Changes</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: 60,
    paddingBottom: Spacing.four,
    backgroundColor: PColors.card,
    borderBottomWidth: 1,
    borderBottomColor: PColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    color: PColors.text,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
  },
  formGroup: {
    marginBottom: Spacing.five,
  },
  label: {
    color: PColors.textSecondary,
    marginBottom: Spacing.two,
  },
  input: {
    backgroundColor: PColors.card,
    borderRadius: 12,
    padding: Spacing.four,
    color: PColors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: PColors.border,
    fontFamily: 'Inter_400Regular',
  },
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
  saveButton: {
    backgroundColor: PColors.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  saveButtonText: {
    color: '#FFFFFF',
  }
});
