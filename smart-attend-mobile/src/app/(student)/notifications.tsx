import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
           <View style={[styles.listItem, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
              <Ionicons name="notifications" size={20} color={theme.primary} />
              <Text style={[styles.listItemText, { color: theme.text }]}>Attendance marked successfully</Text>
           </View>
           <View style={[styles.listItem, { borderBottomColor: theme.border, borderBottomWidth: 0 }]}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={[styles.listItemText, { color: theme.text }]}>Keep up the good work! You are on track.</Text>
           </View>
        </View>
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
    paddingTop: 60,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
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
    padding: Spacing.four,
  },
  listContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  listItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
