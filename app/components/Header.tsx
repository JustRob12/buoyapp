import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'AquaNet' }) => {
  const statusBarHeight = Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0;
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: statusBarHeight + 20 }]}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
      </View>
    </SafeAreaView>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Math.max(12, screenWidth * 0.03),
    paddingBottom: Math.max(20, screenHeight * 0.025),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Math.max(120, screenHeight * 0.15),
  },
  title: {
    fontSize: Math.max(16, Math.min(24, screenWidth * 0.06)),
    fontWeight: 'bold',
    color: '#0ea5e9',
    textAlign: 'center',
    maxWidth: screenWidth * 0.9,
  },
});

export default Header;
