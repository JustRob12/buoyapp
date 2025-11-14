import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Using View with gradient-like styling instead of LinearGradient

interface HomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const features = [
    {
      icon: 'water-outline',
      title: 'Real-Time Monitoring',
      description: 'Track marine conditions in real-time',
    },
    {
      icon: 'analytics-outline',
      title: 'Data Analytics',
      description: 'Comprehensive charts and insights',
    },
    {
      icon: 'map-outline',
      title: 'Interactive Maps',
      description: 'Visualize buoy locations and tracks',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Secure Access',
      description: 'Protected research data platform',
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section with Gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="water" size={60} color="#ffffff" />
          </View>
          <Text style={[styles.title, { fontSize: Math.max(36, screenWidth * 0.1) }]}>
            AquaNet
          </Text>
          <Text style={[styles.subtitle, { fontSize: Math.max(18, screenWidth * 0.045) }]}>
            Marine Monitoring System
          </Text>
          <Text style={[styles.tagline, { fontSize: Math.max(14, screenWidth * 0.035) }]}>
            Advanced water quality monitoring for research and conservation
          </Text>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        {/* <Text style={styles.sectionTitle}>Key Features</Text> */}
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon as any} size={32} color="#0ea5e9" />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons Section */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.primaryButton, { width: screenWidth * 0.85 }]}
          onPress={onNavigateToLogin}
          activeOpacity={0.8}
        >
          <Ionicons name="log-in-outline" size={22} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { width: screenWidth * 0.85 }]}
          onPress={onNavigateToRegister}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={22} color="#0ea5e9" />
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#0ea5e9" />
          <Text style={styles.infoText}>
            New users require admin approval to access the platform
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#0ea5e9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.95,
  },
  tagline: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    opacity: 0.9,
    lineHeight: 20,
  },
  featuresSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 30,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#0ea5e9',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    width: '100%',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
  },
});

export default HomeScreen;

