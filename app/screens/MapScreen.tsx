import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import BuoyMap from '../components/BuoyMap';
import { getLatestBuoyDataForGraph, BuoyData } from '../services/buoyService';

const MapScreen = () => {
  const route = useRoute();
  // Get latestLocation from route params if provided
  const latestLocation = (route.params as any)?.latestLocation as {
    latitude: number;
    longitude: number;
    buoy: string;
  } | undefined;
  const [mapData, setMapData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force map refresh

  const fetchMapData = async () => {
    try {
      setError(null);
      const data = await getLatestBuoyDataForGraph(20);
      setMapData(data);
      // Increment refresh key to trigger map update
      setRefreshKey(prev => prev + 1);
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
    // Reset refresh key to force map update
    setRefreshKey(prev => prev + 1);
  };

  // Track if data has been loaded
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch data on mount only
  useEffect(() => {
    if (!hasLoaded) {
      fetchMapData();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  return (
    <View style={styles.container}>
      <Header title="AquaNet" />
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Buoy Locations</Text>
            <Text style={styles.subtitle}>Real-time sensor network map</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0ea5e9" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#0ea5e9" />
            )}
          </TouchableOpacity>
        </View>
        
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
            <BuoyMap key={refreshKey} data={mapData} latestLocation={latestLocation} />
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
    paddingBottom: 16,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'left',
  },
  refreshButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
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
