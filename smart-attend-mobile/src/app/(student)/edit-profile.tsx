import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Spacing, Colors } from '@/constants/theme';
import { apiFetch } from '../../lib/api';

const theme = Colors.light;

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const data = await apiFetch('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        });
        if (data.user?.name) {
          await updateUser({ name: data.user.name });
        }

        Alert.alert('Success', 'Profile updated successfully!');
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSelected,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Student ID (Read-only)</Text>
          <TextInput
            style={[
              styles.input,
              styles.inputDisabled,
              {
                backgroundColor: theme.backgroundSelected,
                color: theme.textSecondary,
                borderColor: theme.border,
              },
            ]}
            value={user?.student_id || user?.id || ''}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSelected,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+233 XX XXX XXXX"
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
  },
  formGroup: {
    marginBottom: Spacing.five,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  input: {
    borderRadius: 12,
    padding: Spacing.four,
    fontSize: 16,
    borderWidth: 1,
  },
  inputDisabled: {
    opacity: 0.85,
  },
  saveButton: {
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
