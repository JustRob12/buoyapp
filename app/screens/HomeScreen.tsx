import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
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
});

export default HomeScreen;
