import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { 
  settingsService, 
  AppSettings, 
  DEFAULT_SETTINGS,
  loadSettings as loadAppSettings,
  saveSettings as saveAppSettings,
  resetSettings as resetAppSettings
} from '../services/settingsService';
// Notifications removed from settings



// Refresh interval options
const REFRESH_INTERVALS = [
  { label: 'Manual Only', value: 0 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
];

// Data retention options
const DATA_RETENTION_OPTIONS = [
  { label: '10 points', value: 10 },
  { label: '20 points', value: 20 },
  { label: '50 points', value: 50 },
  { label: '100 points', value: 100 },
];

const SettingsScreen = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Notifications removed from settings

  // Load settings from storage
  const loadSettings = async () => {
    try {
      const savedSettings = await loadAppSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save settings to storage
  const saveSettings = async (newSettings: AppSettings) => {
    try {
      setSaving(true);
      await saveAppSettings(newSettings);
      setSettings(newSettings);
      Alert.alert('Settings Saved', 'Your settings have been saved successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Notifications removed from settings

  // Reset settings to defaults
  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAppSettings();
              setSettings(DEFAULT_SETTINGS);
              Alert.alert('Settings Reset', 'All settings have been reset to default values.');
            } catch (error) {
              console.error('Error resetting settings:', error);
              Alert.alert('Error', 'Failed to reset settings. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Update individual setting
  const updateSetting = <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // Format refresh interval for display
  const formatRefreshInterval = (seconds: number): string => {
    if (seconds === 0) return 'Manual Only';
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${seconds / 60} minutes`;
    return `${seconds / 3600} hours`;
  };

  useEffect(() => {
    const initializeSettings = async () => {
      await Promise.all([loadSettings()]);
      setLoading(false);
    };
    initializeSettings();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="AquaNet" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="AquaNet" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Configure your data and refresh preferences</Text>
          </View>

          {/* Auto-refresh Interval */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="refresh" size={24} color="#0ea5e9" />
              <Text style={styles.sectionTitle}>Auto-refresh Interval</Text>
            </View>
            <Text style={styles.sectionDescription}>
              How often the app automatically fetches new data from the buoy network
            </Text>
            
            <View style={styles.optionsContainer}>
              {REFRESH_INTERVALS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    settings.autoRefreshInterval === option.value && styles.optionButtonSelected
                  ]}
                  onPress={() => updateSetting('autoRefreshInterval', option.value)}
                >
                  <Text style={[
                    styles.optionText,
                    settings.autoRefreshInterval === option.value && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {settings.autoRefreshInterval === option.value && (
                    <Ionicons name="checkmark" size={20} color="#0ea5e9" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#0ea5e9" />
              <Text style={styles.sectionTitle}>Privacy</Text>
            </View>
            <Text style={styles.sectionDescription}>
              We only collect information necessary to run AquaNet and improve your experience. Your profile details and app settings are stored securely. We do not sell your data.
            </Text>
            <Text style={styles.sectionDescription}>
              You can request account deletion at any time from Pending Approval or by contacting support. Deleting your account removes your profile and associated settings.
            </Text>
          </View>

          {/* About */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color="#0ea5e9" />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.sectionDescription}>
              AquaNet visualizes water quality readings collected from buoy sensors. Use Dashboard and Graphs to monitor trends, and Map to see buoy locations.
            </Text>
            <Text style={styles.sectionDescription}>
              Version {DEFAULT_SETTINGS ? '1.0.0' : '1.0.0'}. For feedback or support, please reach out to the project maintainers.
            </Text>
          </View>
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={() => saveSettings(settings)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="save" size={20} color="#ffffff" />
              )}
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.resetButton]}
              onPress={resetSettings}
            >
              <Ionicons name="refresh" size={20} color="#64748b" />
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
  },
  headerSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  optionTextSelected: {
    color: '#0ea5e9',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: '#f1f5f9',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  cacheInfoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cacheInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cacheInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  cacheInfoContent: {
    gap: 8,
  },
  cacheInfoText: {
    fontSize: 14,
    color: '#64748b',
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearCacheButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 4,
  },
  notificationStatusContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notificationStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  notificationStatusText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  requestPermissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  requestPermissionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0ea5e9',
    marginLeft: 4,
  },
  testNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 8,
  },
  testNotificationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
    marginLeft: 4,
  },
});

export default SettingsScreen;
