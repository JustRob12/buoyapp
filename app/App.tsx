import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import TabNavigator from './navigation/TabNavigator';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import AuthNavigator from './components/AuthNavigator';
import PendingApprovalScreen from './screens/PendingApprovalScreen';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowApp(true);
    }
  }, [loading]);

  if (loading || !showApp) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator onAuthSuccess={() => setShowApp(true)} />;
  }

  // Check user role and show appropriate screen
  if (user.profile?.role === 2) {
    // User is pending approval
    return <PendingApprovalScreen />;
  }

  // User is approved (role 0 = admin, role 1 = researcher)
  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <TabNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
