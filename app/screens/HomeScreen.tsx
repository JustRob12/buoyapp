import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const TERMS_KEY = 'aquanet_terms_v1';

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Descriptions with icons
  const descriptions = [
    {
      icon: 'pulse-outline',
      text: 'Real-time water quality monitoring with instant data updates',
    },
    {
      icon: 'analytics-outline',
      text: 'Advanced analytics and comprehensive data visualization',
    },
    {
      icon: 'location-outline',
      text: 'GPS-enabled buoy tracking with precise location mapping',
    },
    {
      icon: 'shield-checkmark-outline',
      text: 'Secure research data management and access control',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
  const [isTermsChecked, setIsTermsChecked] = useState(false);

  useEffect(() => {
    const loadTermsStatus = async () => {
      try {
        const stored = await AsyncStorage.getItem(TERMS_KEY);
        const accepted = stored === 'true';
        setHasAcceptedTerms(accepted);
      } catch (error) {
        console.warn('Failed to load terms acceptance status', error);
        setHasAcceptedTerms(false);
      }
    };

    loadTermsStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change description
        setCurrentIndex((prev) => (prev + 1) % descriptions.length);
        
        // Fade in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [fadeAnim, scaleAnim]);

  const handleAcceptTerms = async () => {
    try {
      await AsyncStorage.setItem(TERMS_KEY, 'true');
      // Verify the value was saved
      const verified = await AsyncStorage.getItem(TERMS_KEY);
      if (verified === 'true') {
        setHasAcceptedTerms(true);
      } else {
        console.warn('Terms acceptance verification failed');
        // Still set to true to prevent blocking the user
        setHasAcceptedTerms(true);
      }
    } catch (error) {
      console.error('Failed to save terms acceptance status', error);
      // Still set to true to prevent blocking the user
      setHasAcceptedTerms(true);
    }
  };

  if (hasAcceptedTerms === null) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.backgroundDecorations}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
      </View>

      <View style={styles.content}>
        {/* Logo and Title Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoInnerGlow}>
              <Ionicons name="water" size={isSmallScreen ? 48 : 56} color="#0ea5e9" />
            </View>
          </View>
          <Text style={[styles.appTitle, { fontSize: isSmallScreen ? 32 : 40 }]}>AquaNet</Text>
          <View style={styles.titleUnderline} />
          <Text style={[styles.tagline, { fontSize: isSmallScreen ? 13 : 15 }]}>
            Marine Monitoring System
          </Text>
        </View>

        {/* Animated Description Section */}
        <View style={styles.descriptionSection}>
          <View style={styles.descriptionCard}>
            <Animated.View
              style={[
                styles.animatedContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={descriptions[currentIndex].icon as any}
                  size={isSmallScreen ? 48 : 56}
                  color="#0ea5e9"
                  style={styles.descriptionIcon}
                />
              </View>
              <Text style={[styles.description, { fontSize: isSmallScreen ? 13 : 14 }]}>
                {descriptions[currentIndex].text}
              </Text>
            </Animated.View>
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onNavigateToLogin}
            activeOpacity={0.85}
          >
            <View style={styles.buttonIconContainer}>
              <Ionicons name="log-in-outline" size={20} color="#ffffff" />
            </View>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onNavigateToRegister}
            activeOpacity={0.85}
          >
            <View style={styles.buttonIconContainerSecondary}>
              <Ionicons name="person-add-outline" size={20} color="#0ea5e9" />
            </View>
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
            </View>
            <Text style={styles.infoText}>
              New users require admin approval to access the platform
            </Text>
          </View>
        </View>
      </View>

      {/* Terms & Privacy Agreement Modal */}
      <Modal visible={!hasAcceptedTerms} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Terms of Use & Privacy</Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalText}>
                  This account will be used to access the AquaNet Marine Monitoring System. By
                  continuing, you acknowledge and agree that:
                </Text>
                <Text style={styles.modalBullet}>
                  • Your account information (name, email, organization and role) will be stored
                  securely and used to identify you in the system.
                </Text>
                <Text style={styles.modalBullet}>
                  • Your usage activity (logins, configuration changes, and data exports) may be
                  recorded for security, audit, and research quality assurance.
                </Text>
                <Text style={styles.modalBullet}>
                  • Any data you upload or annotate in AquaNet may be used by authorized admins and
                  collaborators for monitoring, analysis, and reporting in line with your project or
                  institution guidelines.
                </Text>
                <Text style={styles.modalBullet}>
                  • You agree to keep your login credentials confidential and not share access with
                  unauthorized users.
                </Text>
                <Text style={styles.modalBullet}>
                  • Misuse of the platform, attempts to tamper with data, or unauthorized access to
                  other users&apos; information is strictly prohibited and may result in account
                  suspension.
                </Text>
                <Text style={styles.modalText}>
                  If you do not agree with these terms, please close the app or contact an
                  administrator before continuing.
                </Text>
              </ScrollView>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  onPress={() => setIsTermsChecked((prev) => !prev)}
                  style={styles.checkboxTouchable}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, isTermsChecked && styles.checkboxChecked]}>
                    {isTermsChecked && (
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>
                  I have read and agree to the Terms of Use & Privacy statement.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  !isTermsChecked && styles.modalPrimaryButtonDisabled,
                ]}
                disabled={!isTermsChecked}
                onPress={handleAcceptTerms}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPrimaryButtonText}>I Agree and Continue</Text>
              </TouchableOpacity>
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
    position: 'relative',
  },
  backgroundDecorations: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#e0f2fe',
    opacity: 0.4,
    top: -80,
    right: -80,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#bae6fd',
    opacity: 0.3,
    bottom: 100,
    left: -50,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7dd3fc',
    opacity: 0.25,
    top: '40%',
    right: -30,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
    zIndex: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logoInnerGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(14, 165, 233, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
    marginBottom: 8,
    opacity: 0.6,
  },
  tagline: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  descriptionSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  descriptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  animatedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  descriptionIcon: {
    // Icon styling handled by Ionicons component
  },
  description: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
    paddingHorizontal: 8,
  },
  actionsSection: {
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 10,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonIconContainer: {
    // Container for icon alignment
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#0ea5e9',
    gap: 10,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIconContainerSecondary: {
    // Container for icon alignment
  },
  secondaryButtonText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    width: '100%',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoIconContainer: {
    // Container for icon alignment
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    color: '#1e40af',
    lineHeight: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalScroll: {
    marginTop: 4,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalBullet: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxTouchable: {
    marginRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#0ea5e9',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 18,
  },
  modalPrimaryButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: '#bae6fd',
  },
  modalPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
