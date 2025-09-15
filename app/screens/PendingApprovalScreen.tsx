import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const PendingApprovalScreen: React.FC = () => {
  const { logout } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decoration */}
      <View style={[styles.backgroundDecoration, { right: screenWidth * 0.1 }]} />
      
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: screenHeight - 100 }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
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
            { marginBottom: isVerySmallScreen ? 16 : isSmallScreen ? 24 : 32 }
          ]}>
            <View style={[
              styles.iconBackground,
              {
                width: isVerySmallScreen ? 70 : isSmallScreen ? 80 : 100,
                height: isVerySmallScreen ? 70 : isSmallScreen ? 80 : 100,
                borderRadius: isVerySmallScreen ? 35 : isSmallScreen ? 40 : 50,
              }
            ]}>
              <Ionicons 
                name="time" 
                size={isVerySmallScreen ? 40 : isSmallScreen ? 48 : 64} 
                color="#ffffff" 
              />
            </View>
            <View style={[
              styles.iconPulse,
              {
                width: isVerySmallScreen ? 90 : isSmallScreen ? 100 : 120,
                height: isVerySmallScreen ? 90 : isSmallScreen ? 100 : 120,
                borderRadius: isVerySmallScreen ? 45 : isSmallScreen ? 50 : 60,
              }
            ]} />
          </View>

          {/* Title */}
          <Text style={[
            styles.title,
            {
              fontSize: isVerySmallScreen ? 24 : isSmallScreen ? 28 : 32,
              marginBottom: isVerySmallScreen ? 4 : 8,
            }
          ]}>
            Account Under Review
          </Text>
          
          <Text style={[
            styles.subtitle,
            {
              fontSize: isVerySmallScreen ? 14 : 16,
              marginBottom: isVerySmallScreen ? 20 : isSmallScreen ? 24 : 32,
            }
          ]}>
            Please wait while we verify your account
          </Text>

          {/* Status Card */}
          <View style={[
            styles.statusCard,
            {
              padding: isVerySmallScreen ? 16 : isSmallScreen ? 20 : 24,
              borderRadius: isVerySmallScreen ? 16 : 20,
            }
          ]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIndicator} />
              <Text style={[
                styles.statusText,
                { fontSize: isVerySmallScreen ? 16 : 18 }
              ]}>
                Pending Approval
              </Text>
            </View>
            
            <Text style={[
              styles.message,
              {
                fontSize: isVerySmallScreen ? 14 : 15,
                marginBottom: isVerySmallScreen ? 16 : 24,
              }
            ]}>
              Thank you for registering! Our administrators are currently reviewing your account. 
              You'll gain full access once approved.
            </Text>

            <View style={[
              styles.timelineContainer,
              { marginBottom: isVerySmallScreen ? 16 : 20 }
            ]}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.completed]}>
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                </View>
                <Text style={styles.timelineText}>Account Created</Text>
              </View>
              
              <View style={styles.timelineLine} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.current]}>
                  <View style={styles.pulsingDot} />
                </View>
                <Text style={styles.timelineText}>Under Review</Text>
              </View>
              
              <View style={styles.timelineLine} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.pending]}>
                  <Ionicons name="shield-checkmark" size={12} color="#94a3b8" />
                </View>
                <Text style={[styles.timelineText, styles.pendingText]}>Access Granted</Text>
              </View>
            </View>

            <View style={[
              styles.infoBox,
              { padding: isVerySmallScreen ? 12 : 16 }
            ]}>
              <Ionicons name="information-circle" size={20} color="#0ea5e9" />
              <Text style={[
                styles.infoText,
                { fontSize: isVerySmallScreen ? 12 : 13 }
              ]}>
                Approval typically takes 24-48 hours. You'll receive an email notification once approved.
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Logout Button - Fixed at bottom */}
      <Animated.View 
        style={[
          styles.bottomContainer,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#64748b" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
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
    backgroundColor: '#ffffff',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: '#e2e8f0',
    marginLeft: 11,
    marginVertical: 4,
  },
  timelineText: {
    fontSize: 14,
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
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
    marginLeft: 12,
    fontWeight: '500',
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
});

export default PendingApprovalScreen;
