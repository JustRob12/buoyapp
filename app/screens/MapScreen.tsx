import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from '../components/Header';

const MapScreen = () => {
  return (
    <View style={styles.container}>
      <Header title="AquaNet" />
      <View style={styles.content}>
        <Text style={styles.title}>Map</Text>
        <Text style={styles.subtitle}>Your map content will go here</Text>
        <Text style={styles.description}>This is the center tab - bigger and more prominent</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default MapScreen;
