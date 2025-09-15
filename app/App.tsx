import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import TabNavigator from './navigation/TabNavigator';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import AuthNavigator from './components/AuthNavigator';

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
