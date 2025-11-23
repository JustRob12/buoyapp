import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const { width: screenWidth } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      {/* Description Section */}
      <View style={styles.descriptionSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="water" size={60} color="#0ea5e9" />
        </View>
        <Text style={styles.appTitle}>AquaNet</Text>
        <Text style={styles.description}>
          Advanced marine monitoring system for real-time water quality tracking and research data management.
        </Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'space-between',
  },
  descriptionSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
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

