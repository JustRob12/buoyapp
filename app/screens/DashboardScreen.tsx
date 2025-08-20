import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import BuoyCard from '../components/BuoyCard';
import BuoyCardList from '../components/BuoyCardList';
import BuoyDropdown from '../components/BuoyDropdown';
import { getLatestBuoyData, getLatestBuoyDataForMultipleBuoys, getLatestBuoyDataForSpecificBuoy, getAvailableBuoyNumbers, BuoyData } from '../services/buoyService';

const DashboardScreen = () => {
  const [latestData, setLatestData] = useState<BuoyData | null>(null);
  const [multipleBuoyData, setMultipleBuoyData] = useState<BuoyData[]>([]);
  const [selectedBuoyCount, setSelectedBuoyCount] = useState<number>(1);
  const [availableBuoyNumbers, setAvailableBuoyNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [buoyLoading, setBuoyLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableBuoyNumbers = async () => {
    try {
      const buoyNumbers = await getAvailableBuoyNumbers();
      setAvailableBuoyNumbers(buoyNumbers);
      
      // Set the first available buoy as default if none selected
      if (buoyNumbers.length > 0 && !buoyNumbers.includes(selectedBuoyCount)) {
        setSelectedBuoyCount(buoyNumbers[0]);
      }
    } catch (err) {
      console.error('Error fetching available buoy numbers:', err);
    }
  };

  const fetchLatestData = async (isBuoyChange: boolean = false) => {
    try {
      setError(null);
      if (isBuoyChange) {
        setBuoyLoading(true);
      }
      
      // Get the latest data for the specific selected buoy
      const selectedBuoyData = await getLatestBuoyDataForSpecificBuoy(selectedBuoyCount);
      
      if (selectedBuoyData) {
        setLatestData(selectedBuoyData);
        setMultipleBuoyData([]);
      } else {
        setLatestData(null);
        setMultipleBuoyData([]);
      }
    } catch (err) {
      setError('Failed to fetch buoy data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      if (isBuoyChange) {
        setBuoyLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLatestData(false);
    setRefreshing(false);
  };

  const onRefreshButtonPress = async () => {
    setLoading(true);
    await fetchLatestData(false);
  };

  useEffect(() => {
    fetchAvailableBuoyNumbers();
  }, []);

  useEffect(() => {
    if (availableBuoyNumbers.length > 0) {
      fetchLatestData(true);
    }
  }, [selectedBuoyCount, availableBuoyNumbers]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="AquaNet" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>Loading latest buoy data...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we fetch the data</Text>
          </View>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>Real-time buoy monitoring</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefreshButtonPress}
              disabled={loading}
            >
              <Ionicons
                name="refresh"
                size={24}
                color={loading ? "#94a3b8" : "#0ea5e9"}
              />
            </TouchableOpacity>
          </View>

          {/* Buoy Selection Section */}
          <View style={styles.buoySelectionSection}>
            <Text style={styles.buoySelectionLabel}>Select Buoy to Display</Text>
            <BuoyDropdown
              selectedValue={selectedBuoyCount}
              onValueChange={setSelectedBuoyCount}
              options={availableBuoyNumbers}
              placeholder="Select buoy to display"
              loading={buoyLoading}
            />
          </View>
          


          {error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorCard}>
                <Ionicons name="warning" size={48} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRefreshButtonPress}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : buoyLoading ? (
            <View style={styles.buoyLoadingContainer}>
              <View style={styles.buoyLoadingCard}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={styles.buoyLoadingText}>Loading Buoy {selectedBuoyCount} data...</Text>
                <Text style={styles.buoyLoadingSubtext}>Please wait while we fetch the latest readings</Text>
              </View>
            </View>
          ) : latestData ? (
            <BuoyCard data={latestData} />
          ) : (
            <View style={styles.noDataContainer}>
              <View style={styles.noDataCard}>
                <Ionicons name="water" size={48} color="#64748b" />
                <Text style={styles.noDataText}>No buoy data available</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRefreshButtonPress}
                >
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  buoySelectionSection: {
    marginBottom: 24,
  },
  buoySelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },

  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  buoyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 300,
  },
  buoyLoadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  buoyLoadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  buoyLoadingSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noDataCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default DashboardScreen;
