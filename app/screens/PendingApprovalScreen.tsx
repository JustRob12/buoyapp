import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

const PendingApprovalScreen: React.FC = () => {
  const { logout, user, refreshUserProfile } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;

  // Check if user is rejected
  const isRejected = user?.profile?.rejection_status === true;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Periodically refresh profile to detect when admin approval changes role (e.g., 2 -> 3)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUserProfile();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshUserProfile]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleTryAgain = async () => {
    if (!user?.id) return;
    
    Alert.alert(
      'Try Again',
      'Are you sure you want to resubmit your account for approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resubmit',
          style: 'default',
          onPress: async () => {
            try {
              const success = await authService.resetRejectionStatus(user.id);
              if (success) {
                await refreshUserProfile();
                Alert.alert('Success', 'Your account has been resubmitted for approval.');
              } else {
                Alert.alert('Error', 'Failed to resubmit your account. Please try again.');
              }
            } catch (error) {
              console.error('Error resubmitting account:', error);
              Alert.alert('Error', 'Failed to resubmit your account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await authService.deleteUserAccount(user.id);
              if (success) {
                await logout();
                Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
              } else {
                Alert.alert('Error', 'Failed to delete your account. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete your account. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decoration */}
      <View style={[styles.backgroundDecoration, { right: screenWidth * 0.1 }]} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
          {/* Main Icon with gradient background */}
          <View style={[
            styles.iconContainer,
            { marginBottom: isVerySmallScreen ? 8 : isSmallScreen ? 12 : 16 }
          ]}>
            <View style={[
              styles.iconBackground,
              {
                width: isVerySmallScreen ? 60 : isSmallScreen ? 70 : 80,
                height: isVerySmallScreen ? 60 : isSmallScreen ? 70 : 80,
                borderRadius: isVerySmallScreen ? 30 : isSmallScreen ? 35 : 40,
                backgroundColor: isRejected ? '#ef4444' : '#0ea5e9',
              }
            ]}>
              <Ionicons 
                name={isRejected ? "close-circle" : "time"} 
                size={isVerySmallScreen ? 32 : isSmallScreen ? 40 : 48} 
                color="#ffffff" 
              />
            </View>
            <View style={[
              styles.iconPulse,
              {
                width: isVerySmallScreen ? 75 : isSmallScreen ? 85 : 95,
                height: isVerySmallScreen ? 75 : isSmallScreen ? 85 : 95,
                borderRadius: isVerySmallScreen ? 37.5 : isSmallScreen ? 42.5 : 47.5,
                borderColor: isRejected ? '#ef4444' : '#0ea5e9',
              }
            ]} />
          </View>

          {/* Title */}
          <Text style={[
            styles.title,
            {
              fontSize: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 28,
              marginBottom: isVerySmallScreen ? 2 : 4,
            }
          ]}>
            {isRejected ? 'Account Not Approved' : 'Account Under Review'}
          </Text>
          
          <Text style={[
            styles.subtitle,
            {
              fontSize: isVerySmallScreen ? 12 : 14,
              marginBottom: isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20,
            }
          ]}>
            {isRejected 
              ? 'Your account was not approved. Please see the reason below.' 
              : 'Please wait while we verify your account'
            }
          </Text>

          {/* Status Card */}
          <View style={[
            styles.statusCard,
            {
              padding: isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20,
              borderRadius: isVerySmallScreen ? 12 : 16,
              maxHeight: screenHeight * 0.5,
            }
          ]}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: isRejected ? '#ef4444' : '#f59e0b' }
              ]} />
              <Text style={[
                styles.statusText,
                { fontSize: isVerySmallScreen ? 14 : 16 }
              ]}>
                {isRejected ? 'Account Rejected' : 'Pending Approval'}
              </Text>
            </View>
            
            {isRejected ? (
              <>
                <Text style={[
                  styles.message,
                  {
                    fontSize: isVerySmallScreen ? 12 : 13,
                    marginBottom: isVerySmallScreen ? 8 : 12,
                  }
                ]}>
                  Unfortunately, your account was not approved. Here's the reason:
                </Text>

                <View style={[
                  styles.rejectionBox,
                  { padding: isVerySmallScreen ? 8 : 12 }
                ]}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={[
                    styles.rejectionText,
                    { fontSize: isVerySmallScreen ? 11 : 12 }
                  ]}>
                    {user?.profile?.rejection_reason || 'No specific reason provided.'}
                  </Text>
                </View>

                <View style={[
                  styles.infoBox,
                  { 
                    padding: isVerySmallScreen ? 8 : 12,
                    backgroundColor: '#fef2f2',
                    borderLeftColor: '#ef4444',
                    marginBottom: 8,
                  }
                ]}>
                  <Ionicons name="information-circle" size={16} color="#ef4444" />
                  <Text style={[
                    styles.infoText,
                    { 
                      fontSize: isVerySmallScreen ? 11 : 12,
                      color: '#dc2626'
                    }
                  ]}>
                    You can try again by resubmitting your account, or delete your account if you no longer wish to continue.
                  </Text>
                </View>

                <View style={[
                  styles.contactBox,
                  { 
                    padding: isVerySmallScreen ? 8 : 12, 
                    marginTop: 0,
                    backgroundColor: '#f0f9ff',
                    borderLeftColor: '#0ea5e9',
                    borderColor: '#bae6fd'
                  }
                ]}>
                  <Ionicons name="mail-outline" size={16} color="#0ea5e9" />
                  <View style={styles.contactTextContainer}>
                    <Text style={[
                      styles.contactText,
                      { fontSize: isVerySmallScreen ? 11 : 12 }
                    ]}>
                      For questions or to request approval, please contact this email:
                    </Text>
                    <Text style={[
                      styles.contactEmail,
                      { fontSize: isVerySmallScreen ? 11 : 12 }
                    ]}>
                      roberto.prisoris12@gmail.com
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={[
                  styles.message,
                  {
                    fontSize: isVerySmallScreen ? 12 : 13,
                    marginBottom: isVerySmallScreen ? 8 : 12,
                  }
                ]}>
                  Thank you for registering! Our administrators are currently reviewing your account. 
                  You'll gain full access once approved.
                </Text>

                <View style={[
                  styles.timelineContainer,
                  { marginBottom: isVerySmallScreen ? 8 : 12 }
                ]}>
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.completed]}>
                      <Ionicons name="checkmark" size={10} color="#ffffff" />
                    </View>
                    <Text style={[styles.timelineText, { fontSize: isVerySmallScreen ? 11 : 12 }]}>Account Created</Text>
                  </View>
                  
                  <View style={styles.timelineLine} />
                  
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.current]}>
                      <View style={styles.pulsingDot} />
                    </View>
                    <Text style={[styles.timelineText, { fontSize: isVerySmallScreen ? 11 : 12 }]}>Under Review</Text>
                  </View>
                  
                  <View style={styles.timelineLine} />
                  
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, styles.pending]}>
                      <Ionicons name="shield-checkmark" size={10} color="#94a3b8" />
                    </View>
                    <Text style={[styles.timelineText, styles.pendingText, { fontSize: isVerySmallScreen ? 11 : 12 }]}>Access Granted</Text>
                  </View>
                </View>

                <View style={[
                  styles.infoBox,
                  { padding: isVerySmallScreen ? 8 : 12, marginBottom: 8 }
                ]}>
                  <Ionicons name="information-circle" size={16} color="#0ea5e9" />
                  <Text style={[
                    styles.infoText,
                    { fontSize: isVerySmallScreen ? 11 : 12 }
                  ]}>
                    Approval typically takes 24-48 hours. You'll receive an email notification once approved.
                  </Text>
                </View>

                <View style={[
                  styles.contactBox,
                  { padding: isVerySmallScreen ? 8 : 12, marginTop: 0 }
                ]}>
                  <Ionicons name="mail-outline" size={16} color="#0ea5e9" />
                  <View style={styles.contactTextContainer}>
                    <Text style={[
                      styles.contactText,
                      { fontSize: isVerySmallScreen ? 11 : 12 }
                    ]}>
                      For expedited approval or inquiries, please contact this email:
                    </Text>
                    <Text style={[
                      styles.contactEmail,
                      { fontSize: isVerySmallScreen ? 11 : 12 }
                    ]}>
                      roberto.prisoris12@gmail.com
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>

      {/* Action Buttons - Fixed at bottom */}
      <Animated.View 
        style={[
          styles.bottomContainer,
          { opacity: fadeAnim }
        ]}
      >
        {isRejected ? (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
              <Ionicons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.deleteText}>Delete My Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#64748b" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#64748b" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  backgroundDecoration: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#e0f2fe',
    opacity: 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
    backgroundColor: '#f1f5f9',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconPulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#0ea5e9',
    opacity: 0.3,
  },
  title: {
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
    marginRight: 12,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  message: {
    color: '#475569',
    lineHeight: 22,
    textAlign: 'left',
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completed: {
    backgroundColor: '#10b981',
  },
  current: {
    backgroundColor: '#f59e0b',
    position: 'relative',
  },
  pending: {
    backgroundColor: '#e2e8f0',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  timelineLine: {
    width: 2,
    height: 12,
    backgroundColor: '#e2e8f0',
    marginLeft: 9,
    marginVertical: 2,
  },
  timelineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  pendingText: {
    color: '#9ca3af',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  contactTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  contactText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 12,
    color: '#0ea5e9',
    lineHeight: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    marginBottom: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: '#dc2626',
    lineHeight: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    gap: 12,
  },
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#10b981',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tryAgainText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PendingApprovalScreen;
