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
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewMode, setViewMode] = useState<'pending' | 'approved'>('pending');

  useEffect(() => {
    loadPendingUsers();
    loadApprovedUsers();
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

  const loadApprovedUsers = async () => {
    try {
      const users = await authService.getApprovedUsers();
      setApprovedUsers(users);
    } catch (error) {
      console.error('Error loading approved users:', error);
      Alert.alert('Error', 'Failed to load approved users');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (viewMode === 'pending') {
      await loadPendingUsers();
    } else {
      await loadApprovedUsers();
      setRefreshing(false);
    }
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
                // Refresh both lists to get updated data from database
                await loadPendingUsers();
                await loadApprovedUsers();
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

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) {
      return;
    }

    setProcessingUserId(selectedUser.id);
    setDeleteModalVisible(false);
    
    try {
      const success = await authService.deleteUserAccount(selectedUser.id);
      if (success) {
        Alert.alert('User Deleted', `${selectedUser.fullname}'s account has been permanently deleted.`);
        // Refresh the approved users list
        await loadApprovedUsers();
      } else {
        Alert.alert('Error', 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', 'Failed to delete user');
    } finally {
      setProcessingUserId(null);
      setSelectedUser(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setSelectedUser(null);
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

  const renderPendingUserItem = ({ item: user }: { item: UserProfile }) => {
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

  const renderApprovedUserItem = ({ item: user }: { item: UserProfile }) => {
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
            <Text style={styles.userDate}>Approved: {formatDate(user.updated_at)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteUser(user)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
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
        {/* Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'pending' && styles.toggleButtonActive]}
            onPress={() => setViewMode('pending')}
          >
            <Text style={[styles.toggleButtonText, viewMode === 'pending' && styles.toggleButtonTextActive]}>
              Pending Users
            </Text>
            {viewMode === 'pending' && pendingUsers.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingUsers.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'approved' && styles.toggleButtonActive]}
            onPress={() => setViewMode('approved')}
          >
            <Text style={[styles.toggleButtonText, viewMode === 'approved' && styles.toggleButtonTextActive]}>
              Approved Users
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {viewMode === 'pending' ? pendingUsers.length : approvedUsers.length}
            </Text>
            <Text style={styles.statLabel}>
              {viewMode === 'pending' ? 'Pending Approvals' : 'Approved Users'}
            </Text>
          </View>
        </View>

        {viewMode === 'pending' ? (
          pendingUsers.length === 0 ? (
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
              renderItem={renderPendingUserItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              contentContainerStyle={styles.listContainer}
            />
          )
        ) : (
          approvedUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#0ea5e9" />
              <Text style={styles.emptyTitle}>No Approved Users</Text>
              <Text style={styles.emptyMessage}>
                There are no approved users at the moment.
              </Text>
            </View>
          ) : (
            <FlatList
              data={approvedUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderApprovedUserItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              contentContainerStyle={styles.listContainer}
            />
          )
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={48} color="#ef4444" style={styles.warningIcon} />
            <Text style={styles.modalTitle}>Delete User Account</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to permanently delete {selectedUser?.fullname}'s account? This action cannot be undone.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  Delete Account
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
  toggleContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleButtonTextActive: {
    color: '#0ea5e9',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ffffff',
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
  warningIcon: {
    alignSelf: 'center',
    marginBottom: 16,
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
  deleteConfirmButton: {
    backgroundColor: '#ef4444',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ManageAccountsScreen;
