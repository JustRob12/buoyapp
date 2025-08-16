import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import Header from '../components/Header';
import BuoyMap from '../components/BuoyMap';
import { getLatestBuoyDataForGraph, BuoyData } from '../services/buoyService';

const MapScreen = () => {
  const [mapData, setMapData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMapData = async () => {
    try {
      setError(null);
      const data = await getLatestBuoyDataForGraph(20);
      setMapData(data);
    } catch (err) {
      setError('Failed to fetch map data. Please try again.');
      console.error('Error fetching map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMapData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="AquaNet" />
      <View style={styles.content}>
        <Text style={styles.title}>Buoy Locations</Text>
        <Text style={styles.subtitle}>Real-time sensor network map</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>Loading map data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.mapContainer}>
            <BuoyMap data={mapData} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default MapScreen;
