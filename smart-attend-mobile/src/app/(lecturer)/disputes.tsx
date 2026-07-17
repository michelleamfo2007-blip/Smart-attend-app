import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function LecturerDisputesScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, [user?.id]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      // First get the lecturer's classes
      const { data: myClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('lecturer_id', user?.id);

      if (!myClasses || myClasses.length === 0) {
        setDisputes([]);
        setLoading(false);
        return;
      }

      const classIds = myClasses.map(c => c.id);

      // Fetch disputes for those classes
      const { data: allDisputes } = await supabase
        .from('attendance_disputes')
        .select(`
          *,
          classes(name),
          users!student_id(name, email)
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (allDisputes) {
        // Sort so 'pending' is at the top
        const sorted = allDisputes.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setDisputes(sorted);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (dispute: any, action: 'approve' | 'reject') => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to ${action} this dispute?`);
      if (!confirmed) return;
    } else {
      await new Promise<void>((resolve, reject) => {
        Alert.alert(
          `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`,
          `Are you sure you want to ${action} this dispute?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => reject(new Error('Cancelled')) },
            { 
              text: "Confirm", 
              style: action === 'approve' ? 'default' : 'destructive', 
              onPress: () => resolve() 
            }
          ]
        );
      }).catch(() => { return; });
    }

    setProcessingId(dispute.id);
    try {
      if (action === 'approve') {
        // Insert attendance record
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            student_id: dispute.student_id,
            class_id: dispute.class_id,
            session_id: dispute.session_id,
            timestamp: new Date().toISOString()
          });

        // Ignore error if it's a unique constraint violation (already present)
        if (insertError && !insertError.message.includes('unique constraint')) {
          throw insertError;
        }
      }

      // Update dispute status
      const { error: updateError } = await supabase
        .from('attendance_disputes')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', dispute.id);

      if (updateError) throw updateError;

      if (Platform.OS === 'web') {
        window.alert(`Dispute ${action}d successfully.`);
      } else {
        Alert.alert("Success", `Dispute ${action}d successfully.`);
      }
      
      fetchDisputes(); // Refresh list
    } catch (error: any) {
      if (Platform.OS === 'web') {
         window.alert(`Error: ${error.message}`);
      } else {
         Alert.alert("Error", error.message);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return '#10b981';
    if (status === 'rejected') return '#ef4444';
    return '#f59e0b'; // pending
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Student Disputes</ThemedText>
        <ThemedText themeColor="textSecondary">Review and approve attendance corrections</ThemedText>
      </View>

      {disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <SymbolView name="checkmark.shield.fill" size={48} tintColor={theme.textSecondary} style={{ opacity: 0.3, marginBottom: 16 }} />
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>No disputes found. All caught up!</ThemedText>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {disputes.map((dispute, index) => {
               const statusColor = getStatusColor(dispute.status);
               const isPending = dispute.status === 'pending';
               const isProcessing = processingId === dispute.id;
               
               return (
                 <Animated.View 
                   entering={FadeInDown.duration(400).delay(index * 100)}
                   key={dispute.id} 
                   style={[styles.disputeCard, { backgroundColor: theme.backgroundElement, borderColor: isPending ? theme.primary : theme.border }]}
                 >
                   <View style={styles.disputeHeader}>
                     <View>
                       <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>{dispute.users?.name || 'Unknown Student'}</ThemedText>
                       <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{dispute.classes?.name?.split('_')[0] || 'Unknown Class'}</ThemedText>
                     </View>
                     <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                       <Text style={{ color: statusColor, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' }}>
                         {dispute.status}
                       </Text>
                     </View>
                   </View>
                   
                   <View style={[styles.reasonBox, { backgroundColor: theme.backgroundSelected }]}>
                     <SymbolView name="quote.opening" size={12} tintColor={theme.textSecondary} />
                     <ThemedText themeColor="textSecondary" style={{ fontSize: 13, flex: 1, marginHorizontal: 8 }}>{dispute.reason}</ThemedText>
                     <SymbolView name="quote.closing" size={12} tintColor={theme.textSecondary} />
                   </View>
                   
                   <ThemedText themeColor="textSecondary" style={{ fontSize: 11, marginBottom: isPending ? 12 : 0 }}>
                     Submitted: {new Date(dispute.created_at).toLocaleDateString()}
                   </ThemedText>

                   {isPending && (
                     <View style={styles.actionRow}>
                       <TouchableOpacity 
                         style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                         onPress={() => handleAction(dispute, 'reject')}
                         disabled={isProcessing}
                       >
                         <SymbolView name="xmark" size={16} tintColor="#ef4444" />
                         <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                       </TouchableOpacity>
                       
                       <TouchableOpacity 
                         style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                         onPress={() => handleAction(dispute, 'approve')}
                         disabled={isProcessing}
                       >
                         {isProcessing ? (
                           <ActivityIndicator size="small" color="white" />
                         ) : (
                           <>
                             <SymbolView name="checkmark" size={16} tintColor="white" />
                             <Text style={[styles.actionBtnText, { color: 'white' }]}>Approve</Text>
                           </>
                         )}
                       </TouchableOpacity>
                     </View>
                   )}
                 </Animated.View>
               );
            })}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six },
  header: { marginBottom: Spacing.six },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { gap: Spacing.four },
  disputeCard: { padding: Spacing.four, borderRadius: 12, borderWidth: 1 },
  disputeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  reasonBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 8, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  actionBtnText: { fontWeight: 'bold', fontSize: 14 }
});
