import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ProfileModal from './ProfileModal';
import authService from '../services/authService';
import ManageAccountsScreen from '../screens/ManageAccountsScreen';

interface ProfileDropdownProps {}

const ProfileDropdown: React.FC<ProfileDropdownProps> = () => {
  const { user, logout } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showManageAccounts, setShowManageAccounts] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const { width: screenWidth } = Dimensions.get('window');

  // Load pending count for admin users
  useEffect(() => {
    if (user?.profile?.role === 0) {
      loadPendingCount();
    }
  }, [user?.profile?.role]);

  const loadPendingCount = async () => {
    try {
      const pendingUsers = await authService.getPendingUsers();
      setPendingCount(pendingUsers.length);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  };

  const showDropdown = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideDropdown = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  const handleProfilePress = () => {
    hideDropdown();
    setShowProfileModal(true);
  };

  const handleManageAccountsPress = () => {
    hideDropdown();
    setShowManageAccounts(true);
  };

  const handleCloseManageAccounts = () => {
    setShowManageAccounts(false);
    // Refresh pending count when modal is closed
    if (user?.profile?.role === 0) {
      loadPendingCount();
    }
  };

  const handleLogout = () => {
    hideDropdown();
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Helper function to add cache-busting to image URL
  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    // Add timestamp to bypass cache
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={showDropdown}
        activeOpacity={0.7}
      >
        <View style={styles.profileImageContainer}>
          {user?.profile?.profile_picture ? (
            <Image
              key={user.profile.profile_picture} // Force re-render when URL changes
              source={{ 
                uri: getImageUrl(user.profile.profile_picture),
                cache: 'reload' // Force reload from network
              }}
              style={styles.profileImage}
              onError={(error) => {
                console.error('Image load error:', error);
              }}
            />
          ) : (
            <View style={styles.defaultProfile}>
              <Text style={styles.initials}>
                {user?.profile?.fullname ? getInitials(user.profile.fullname) : 'U'}
              </Text>
            </View>
          )}
          {/* Notification badge for admin users */}
          {user?.profile?.role === 0 && pendingCount > 0 && (
            <View style={styles.profileNotificationBadge}>
              <Text style={styles.profileBadgeText}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-down" size={16} color="#64748b" style={styles.chevron} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={hideDropdown}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={hideDropdown}
        >
          <Animated.View
            style={[
              styles.dropdown,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
                alignSelf: 'center',
              },
            ]}
          >
            {/* User Info Header */}
            <View style={styles.userInfo}>
              {user?.profile?.profile_picture ? (
                <Image
                  key={user.profile.profile_picture} // Force re-render when URL changes
                  source={{ 
                    uri: getImageUrl(user.profile.profile_picture),
                    cache: 'reload' // Force reload from network
                  }}
                  style={styles.dropdownProfileImage}
                  onError={(error) => {
                    console.error('Image load error:', error);
                  }}
                />
              ) : (
                <View style={styles.dropdownDefaultProfile}>
                  <Text style={styles.dropdownInitials}>
                    {user?.profile?.fullname ? getInitials(user.profile.fullname) : 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.profile?.fullname || 'User'}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user?.email || 'No email'}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>
                    {user?.profile?.role === 0
                      ? 'Admin'
                      : user?.profile?.role === 1
                      ? 'Researcher'
                      : user?.profile?.role === 2
                      ? 'Pending'
                      : 'Approved User'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.separator} />

            {/* Menu Items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleProfilePress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="person-outline" size={20} color="#64748b" />
                <Text style={styles.menuText}>Profile</Text>
              </View>
            </TouchableOpacity>

            {/* Admin only - Manage Accounts */}
            {user?.profile?.role === 0 && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  pendingCount > 0 && styles.menuItemWithBadge
                ]}
                onPress={handleManageAccountsPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="people-outline" size={20} color="#64748b" />
                  <Text style={styles.menuText}>Manage Accounts</Text>
                </View>
                {pendingCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Admin only - Manage Accounts Modal */}
      {user?.profile?.role === 0 && (
        <Modal
          visible={showManageAccounts}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseManageAccounts}
        >
          <ManageAccountsScreen onClose={handleCloseManageAccounts} />
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  defaultProfile: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  profileNotificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  chevron: {
    marginLeft: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userInfo: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  dropdownProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  dropdownDefaultProfile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownInitials: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e40af',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemWithBadge: {
    justifyContent: 'space-between',
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  notificationBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  logoutItem: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  logoutText: {
    color: '#ef4444',
  },
});

export default ProfileDropdown;
