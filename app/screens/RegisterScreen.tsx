import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegisterSuccess, onNavigateToLogin, onNavigateToHome }) => {
  const TERMS_KEY = 'aquanet_terms_v1';
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isTermsChecked, setIsTermsChecked] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
    }
    
    return { valid: true, message: '' };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTermsCheck = async () => {
    const newValue = !isTermsChecked;
    setIsTermsChecked(newValue);
    
    if (newValue) {
      // Save to AsyncStorage when checked
      try {
        await AsyncStorage.setItem(TERMS_KEY, 'true');
        const verified = await AsyncStorage.getItem(TERMS_KEY);
        if (verified !== 'true') {
          console.warn('Terms acceptance verification failed');
        }
      } catch (error) {
        console.error('Failed to save terms acceptance status', error);
      }
    }
  };

  const handleRegister = async () => {
    const { fullname, email, password, confirmPassword } = formData;

    // Validation
    if (!fullname.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    // Strict password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Password Requirements', passwordValidation.message + '\n\nPassword must:\n• Be at least 8 characters long\n• Contain at least one uppercase letter\n• Contain at least one lowercase letter\n• Contain at least one number\n• Contain at least one special character');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!isTermsChecked) {
      Alert.alert('Agreement Required', 'Please accept the Terms of Use & Privacy to continue');
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        email: email.trim(),
        password,
        fullname: fullname.trim(),
        username: email.trim(), // Use email as username
        role: 2, // Default to pending
      });

      // Show email confirmation modal
      setShowEmailModal(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.backgroundDecorations}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onNavigateToHome}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>

          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoInnerGlow}>
                <Ionicons name="water" size={isSmallScreen ? 48 : 56} color="#0ea5e9" />
              </View>
            </View>
            <Text style={[styles.title, { fontSize: isSmallScreen ? 32 : 40 }]}>AquaNet</Text>
            <View style={styles.titleUnderline} />
            <Text style={[styles.subtitle, { fontSize: isSmallScreen ? 13 : 15 }]}>
              Join Our Research Community
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSubtitle}>Sign up to access marine monitoring data and analytics.</Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrapper}>
                <Ionicons name="person-outline" size={20} color="#0ea5e9" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={formData.fullname}
                onChangeText={(value) => handleInputChange('fullname', value)}
                autoCapitalize="words"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrapper}>
                <Ionicons name="mail-outline" size={20} color="#0ea5e9" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#0ea5e9" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Requirements Info */}
            <View style={styles.passwordRequirements}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#0ea5e9" />
              <Text style={styles.passwordRequirementsText}>
                Password must be at least 8 characters with uppercase, lowercase, number, and special character
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#0ea5e9" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.roleInfo}>
              <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
              <Text style={styles.roleInfoText}>
                You will be registered as a Researcher with access to view and analyze marine data.
              </Text>
            </View>

            {/* Terms Agreement Checkbox */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                onPress={handleTermsCheck}
                style={styles.checkboxTouchable}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, isTermsChecked && styles.checkboxChecked]}>
                  {isTermsChecked && (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text 
                    style={styles.termsLink}
                    onPress={() => setShowTermsModal(true)}
                  >
                    Terms of Use & Privacy
                  </Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton, 
                (loading || !isTermsChecked) && styles.registerButtonDisabled
              ]}
              onPress={handleRegister}
              disabled={loading || !isTermsChecked}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#ffffff" />
                  <Text style={styles.registerButtonText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={onNavigateToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email Confirmation Modal */}
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="mail-outline" size={64} color="#0ea5e9" />
            </View>
            <Text style={styles.modalTitle}>Check Your Email</Text>
            <Text style={styles.modalMessage}>
              We've sent a confirmation email to{'\n'}
              <Text style={styles.modalEmail}>{formData.email}</Text>
            </Text>
            <Text style={styles.modalSubtext}>
              Please check your inbox and click the confirmation link to verify your email address.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowEmailModal(false);
                setLoading(false);
                onRegisterSuccess();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms & Privacy Agreement Modal */}
      <Modal visible={showTermsModal} transparent animationType="fade" onRequestClose={() => setShowTermsModal(false)}>
        <View style={styles.termsModalOverlay}>
          <View style={styles.termsModalCard}>
            <View style={styles.termsModalHeader}>
              <Text style={styles.termsModalTitle}>Terms of Use & Privacy</Text>
              <TouchableOpacity
                onPress={() => setShowTermsModal(false)}
                style={styles.termsModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.termsModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.termsModalText}>
                This account will be used to access the AquaNet Marine Monitoring System. By
                continuing, you acknowledge and agree that:
              </Text>
              <Text style={styles.termsModalBullet}>
                • Your account information (name, email, organization and role) will be stored
                securely and used to identify you in the system.
              </Text>
              <Text style={styles.termsModalBullet}>
                • Your usage activity (logins, configuration changes, and data exports) may be
                recorded for security, audit, and research quality assurance.
              </Text>
              <Text style={styles.termsModalBullet}>
                • Any data you upload or annotate in AquaNet may be used by authorized admins and
                collaborators for monitoring, analysis, and reporting in line with your project or
                institution guidelines.
              </Text>
              <Text style={styles.termsModalBullet}>
                • You agree to keep your login credentials confidential and not share access with
                unauthorized users.
              </Text>
              <Text style={styles.termsModalBullet}>
                • Misuse of the platform, attempts to tamper with data, or unauthorized access to
                other users&apos; information is strictly prohibited and may result in account
                suspension.
              </Text>
              <Text style={styles.termsModalText}>
                If you do not agree with these terms, please close the app or contact an
                administrator before continuing.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.termsModalCloseButtonBottom}
              onPress={() => setShowTermsModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.termsModalCloseButtonText}>Close</Text>
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
  keyboardView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  title: {
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
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIconWrapper: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '400',
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  roleInfoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
    fontWeight: '500',
  },
  passwordRequirements: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  passwordRequirementsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    color: '#0c4a6e',
    lineHeight: 16,
    fontWeight: '500',
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '400',
  },
  loginLink: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    fontWeight: '400',
  },
  modalEmail: {
    fontWeight: '600',
    color: '#0ea5e9',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  checkboxTouchable: {
    marginRight: 10,
    marginTop: 2,
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
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  termsLink: {
    color: '#0ea5e9',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  termsModalCard: {
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
  termsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  termsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  termsModalCloseButton: {
    padding: 4,
  },
  termsModalScroll: {
    marginTop: 4,
    marginBottom: 16,
  },
  termsModalText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  termsModalBullet: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 6,
  },
  termsModalCloseButtonBottom: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsModalCloseButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default RegisterScreen;
