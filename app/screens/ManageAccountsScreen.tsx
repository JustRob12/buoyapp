import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authService, { UserProfile } from '../services/authService';

interface ManageAccountsScreenProps {
  onClose: () => void;
}

const ManageAccountsScreen: React.FC<ManageAccountsScreenProps> = ({ onClose }) => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const users = await authService.getPendingUsers();
      setPendingUsers(users);
    } catch (error) {
      console.error('Error loading pending users:', error);
      Alert.alert('Error', 'Failed to load pending users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPendingUsers();
  };

  const handleApproveUser = async (user: UserProfile) => {
    Alert.alert(
      'Approve User',
      `Are you sure you want to approve ${user.fullname}? They will be able to access the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessingUserId(user.id);
            try {
              const success = await authService.approveUser(user.id);
              if (success) {
                Alert.alert('Success', `${user.fullname} has been approved!`);
                // Refresh the pending users list to get updated data from database
                await loadPendingUsers();
              } else {
                Alert.alert('Error', 'Failed to approve user');
              }
            } catch (error) {
              console.error('Error approving user:', error);
              Alert.alert('Error', 'Failed to approve user');
            } finally {
              setProcessingUserId(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectUser = (user: UserProfile) => {
    setSelectedUser(user);
    setRejectionReason('');
    setRejectionModalVisible(true);
  };

  const handleConfirmRejection = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }

    setProcessingUserId(selectedUser.id);
    setRejectionModalVisible(false);
    
    try {
      const success = await authService.rejectUser(selectedUser.id, rejectionReason.trim());
      if (success) {
        Alert.alert('User Rejected', `${selectedUser.fullname}'s account has been rejected. They can try again or delete their account.`);
        // Refresh the pending users list to get updated data from database
        await loadPendingUsers();
      } else {
        Alert.alert('Error', 'Failed to reject user');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      Alert.alert('Error', 'Failed to reject user');
    } finally {
      setProcessingUserId(null);
      setSelectedUser(null);
      setRejectionReason('');
    }
  };

  const handleCancelRejection = () => {
    setRejectionModalVisible(false);
    setSelectedUser(null);
    setRejectionReason('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const renderUserItem = ({ item: user }: { item: UserProfile }) => {
    const isProcessing = processingUserId === user.id;

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {user.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(user.fullname)}</Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.fullname}</Text>
            <Text style={styles.userEmail}>{user.username}</Text>
            <Text style={styles.userDate}>Registered: {formatDate(user.created_at)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveUser(user)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#ffffff" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectUser(user)}
            disabled={isProcessing}
          >
            <Ionicons name="close" size={18} color="#ef4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Accounts</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading pending users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Accounts</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingUsers.length}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
          </View>
        </View>

        {pendingUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={80} color="#0ea5e9" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyMessage}>
              There are no pending user registrations at the moment.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelRejection}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject User Account</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting {selectedUser?.fullname}'s account:
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelRejection}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmRejection}
                disabled={!rejectionReason.trim()}
              >
                <Text style={[
                  styles.confirmButtonText,
                  { opacity: rejectionReason.trim() ? 1 : 0.5 }
                ]}>
                  Reject Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  statsContainer: {
    paddingVertical: 20,
  },
  statCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    paddingVertical: 20,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#0ea5e9',
  },
  approveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rejectButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    marginBottom: 24,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmButton: {
    backgroundColor: '#0ea5e9',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ManageAccountsScreen;
