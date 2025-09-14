import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import BuoyGraph from '../components/BuoyGraph';
import { getLatestBuoyDataForGraph, BuoyData, testApiConnection } from '../services/buoyService';
import { settingsService, loadSettings } from '../services/settingsService';
import { sendMultipleBuoysNotification } from '../services/notificationService';
import { getCachedBuoyData, cacheBuoyData, isOfflineModeEnabled } from '../services/offlineService';

const GraphScreen = () => {
  const navigation = useNavigation();
  const [graphData, setGraphData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphData = async () => {
    try {
      console.log('🚀 GraphScreen: Starting to fetch graph data...');
      setError(null);
      
      // Test API connection first
      await testApiConnection();
      
      const settings = await loadSettings();
      const dataPoints = settings.dataRetentionPoints;
      console.log('⚙️ GraphScreen: Settings loaded, dataPoints:', dataPoints);
      
      let data: BuoyData[] = [];
      let isOfflineData = false;
      
      // First, try to get data from API
      try {
        console.log('📡 GraphScreen: Calling getLatestBuoyDataForGraph...');
        data = await getLatestBuoyDataForGraph(dataPoints);
        console.log('📊 GraphScreen: API returned', data.length, 'data points');
        
        // If we got data from API and offline mode is enabled, cache it
        if (data.length > 0 && isOfflineModeEnabled()) {
          await cacheBuoyData(data);
        }
      } catch (apiError) {
        console.log('❌ GraphScreen: API fetch failed, trying offline data...', apiError);
        
        // If API fails, try to get cached offline data
        if (isOfflineModeEnabled()) {
          const cachedData = await getCachedBuoyData();
          if (cachedData && cachedData.length > 0) {
            data = cachedData.slice(0, dataPoints);
            isOfflineData = true;
            console.log('Using offline cached data for graphs');
          }
        }
        
        if (data.length === 0) {
          throw apiError; // Re-throw if no offline data available
        }
      }
      
      // Check if this is new data
      const isNewData = graphData.length > 0 && (
        data.length !== graphData.length || 
        data[0]?.Date !== graphData[0]?.Date ||
        data[0]?.Time !== graphData[0]?.Time
      );
      
      console.log('✅ GraphScreen: Setting graph data:', data.length, 'records');
      setGraphData(data);
      
      // Send notification for new graph data (only for online data)
      if (isNewData && data.length > 0 && !isOfflineData) {
        await sendMultipleBuoysNotification(data);
      }
    } catch (err) {
      console.error('❌ GraphScreen: Error fetching graph data:', err);
      setError('Failed to fetch graph data. Please try again.');
    } finally {
      console.log('🏁 GraphScreen: Finished loading, setting loading to false');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGraphData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="AquaNet" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Buoy Data Graphs</Text>
              <Text style={styles.subtitle}>Choose chart type and scroll horizontally to see more data</Text>
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
              <Text style={styles.loadingText}>Loading graph data...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : graphData.length > 0 ? (
            <>
              {console.log('📈 GraphScreen: Rendering BuoyGraph with', graphData.length, 'data points')}
              <BuoyGraph data={graphData} />
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No graph data available</Text>
              {console.log('📭 GraphScreen: No data available, graphData.length:', graphData.length)}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  titleContainer: {
    flex: 1,
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
  refreshButton: {
    padding: 8,
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
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#64748b',
  },
});

export default GraphScreen;
