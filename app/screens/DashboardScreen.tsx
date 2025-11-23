import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import BuoyCard from '../components/BuoyCard';
import BuoyCardList from '../components/BuoyCardList';
import BuoyDropdown from '../components/BuoyDropdown';
import { getLatestBuoyData, getLatestBuoyDataForMultipleBuoys, getLatestBuoyDataForSpecificBuoy, getAvailableBuoyNumbers, getLatestBuoyDataForGraph, BuoyData } from '../services/buoyService';
import { settingsService, loadSettings } from '../services/settingsService';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { sendNewDataNotification } from '../services/notificationService';
import { getCachedBuoyData, cacheBuoyData, isOfflineModeEnabled } from '../services/offlineService';

const DashboardScreen = () => {
  const [latestData, setLatestData] = useState<BuoyData | null>(null);
  const [multipleBuoyData, setMultipleBuoyData] = useState<BuoyData[]>([]);
  const [selectedBuoyCount, setSelectedBuoyCount] = useState<number>(1);
  const [availableBuoyNumbers, setAvailableBuoyNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [buoyLoading, setBuoyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  // Cache for buoy data to avoid redundant API calls
  const buoyDataCache = React.useRef<Map<number, { data: BuoyData; timestamp: number }>>(new Map());

  // Helper function to check if a date is valid (not like 2065)
  const isValidDate = (dateStr: string, timeStr: string): boolean => {
    try {
      const date = new Date(`${dateStr} ${timeStr}`);
      const year = date.getFullYear();
      // Only accept dates between 2020 and 2030 (reasonable range)
      return year >= 2020 && year <= 2030 && !isNaN(date.getTime());
    } catch {
      return false;
    }
  };

  const fetchAvailableBuoyNumbers = async () => {
    try {
      // Fetch all latest buoy data at once (much faster than sequential calls)
      const latestData = await getLatestBuoyDataForGraph(50); // Get latest 50 records
      
      // Extract unique buoy numbers from the fetched data and cache them
      const buoyMap = new Map<number, BuoyData>();
      
      latestData.forEach((data: BuoyData) => {
        const buoyName = data.Buoy.trim();
        const match = buoyName.match(/Buoy\s*(\d+)/i);
        if (match) {
          const buoyNumber = parseInt(match[1]);
          
          // Only keep the latest valid data for each buoy
          if (isValidDate(data.Date, data.Time)) {
            const existing = buoyMap.get(buoyNumber);
            if (!existing) {
              buoyMap.set(buoyNumber, data);
            } else {
              // Keep the most recent data
              const existingDate = new Date(`${existing.Date} ${existing.Time}`);
              const currentDate = new Date(`${data.Date} ${data.Time}`);
              if (currentDate > existingDate) {
                buoyMap.set(buoyNumber, data);
              }
            }
          }
        }
      });
      
      // Cache the fetched data for quick access
      const now = Date.now();
      buoyMap.forEach((data, buoyNumber) => {
        buoyDataCache.current.set(buoyNumber, { data, timestamp: now });
      });
      
      // Get sorted list of valid buoy numbers
      const validBuoyNumbers = Array.from(buoyMap.keys()).sort((a, b) => a - b);
      
      setAvailableBuoyNumbers(validBuoyNumbers);
      
      // Load settings and set default buoy selection
      const settings = await loadSettings();
      const defaultBuoy = settings.defaultBuoySelection;
      
      // Set the default buoy from settings, or first available if not found
      if (validBuoyNumbers.length > 0) {
        if (validBuoyNumbers.includes(defaultBuoy)) {
          setSelectedBuoyCount(defaultBuoy);
        } else {
          setSelectedBuoyCount(validBuoyNumbers[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching available buoy numbers:', err);
      // Fallback: try to get available buoy numbers without validation
      try {
        const allBuoyNumbers = await getAvailableBuoyNumbers();
        if (allBuoyNumbers.length > 0) {
          setAvailableBuoyNumbers(allBuoyNumbers);
          setSelectedBuoyCount(allBuoyNumbers[0]);
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  };

  const fetchLatestData = async (isBuoyChange: boolean = false, forceRefresh: boolean = false) => {
    try {
      setError(null);
      if (isBuoyChange) {
        setBuoyLoading(true);
      }
      
      let selectedBuoyData: BuoyData | null = null;
      let isOfflineData = false;
      
      // First, check cache (if not forcing refresh and cache is recent - less than 30 seconds old)
      if (!forceRefresh) {
        const cached = buoyDataCache.current.get(selectedBuoyCount);
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
        if (cached && cacheAge < 30000) { // Use cache if less than 30 seconds old
          selectedBuoyData = cached.data;
          console.log('Using cached data for Buoy', selectedBuoyCount);
        }
      }
      
      // If no cached data, fetch from API
      if (!selectedBuoyData) {
        try {
          selectedBuoyData = await getLatestBuoyDataForSpecificBuoy(selectedBuoyCount);
          
          // Validate the date before using the data
          if (selectedBuoyData && !isValidDate(selectedBuoyData.Date, selectedBuoyData.Time)) {
            console.log('Invalid date detected, treating as no data');
            selectedBuoyData = null;
            throw new Error('Invalid date in buoy data');
          }
          
          // Update cache with fresh data
          if (selectedBuoyData) {
            buoyDataCache.current.set(selectedBuoyCount, { data: selectedBuoyData, timestamp: Date.now() });
          }
          
          // If we got data from API and offline mode is enabled, cache it
          if (selectedBuoyData && isOfflineModeEnabled()) {
            await cacheBuoyData([selectedBuoyData]);
          }
          setIsOfflineMode(false);
        } catch (apiError) {
          console.log('API fetch failed, trying offline data...');
          
          // If API fails, try to get cached offline data
          if (isOfflineModeEnabled()) {
            const cachedData = await getCachedBuoyData();
            if (cachedData && cachedData.length > 0) {
              // Find data for the selected buoy
              const buoyData = cachedData.find(data => {
                const buoyName = data.Buoy.trim();
                const match = buoyName.match(/Buoy\s*(\d+)/i);
                return match && parseInt(match[1]) === selectedBuoyCount;
              });
              
              // Validate the date before using cached data
              if (buoyData && isValidDate(buoyData.Date, buoyData.Time)) {
                selectedBuoyData = buoyData;
                isOfflineData = true;
                setIsOfflineMode(true);
                console.log('Using offline cached data');
              } else if (buoyData) {
                console.log('Cached data has invalid date, skipping');
              }
            }
          }
          
          if (!selectedBuoyData) {
            throw apiError; // Re-throw if no offline data available
          }
        }
      }
      
      if (selectedBuoyData) {
        // Check if this is new data (not initial load)
        const isNewData = latestData && (
          selectedBuoyData.Date !== latestData.Date || 
          selectedBuoyData.Time !== latestData.Time
        );
        
        setLatestData(selectedBuoyData);
        setMultipleBuoyData([]);
        
        // Send notification for new data (only for online data)
        if (isNewData && !isOfflineData) {
          await sendNewDataNotification(selectedBuoyData);
        }
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
    await fetchLatestData(false, true); // Force refresh
  };

  const onRefreshButtonPress = async () => {
    setLoading(true);
    await fetchLatestData(false, true); // Force refresh on button press
  };

  // Auto-refresh functionality
  const { isAutoRefreshEnabled, refreshInterval } = useAutoRefresh({
    onRefresh: onRefresh,
    enabled: true,
  });

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
      <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>Real-time buoy monitoring</Text>
              {isAutoRefreshEnabled && (
                <View style={styles.autoRefreshIndicator}>
                  <Ionicons name="sync" size={14} color="#10b981" />
                  <Text style={styles.autoRefreshText}>
                    Auto-refresh: {refreshInterval < 60 ? `${refreshInterval}s` : `${refreshInterval / 60}m`}
                  </Text>
                </View>
              )}
              {isOfflineMode && (
                <View style={styles.offlineIndicator}>
                  <Ionicons name="cloud-offline" size={14} color="#f59e0b" />
                  <Text style={styles.offlineText}>
                    Offline Mode - Using cached data
                  </Text>
                </View>
              )}
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
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  autoRefreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  autoRefreshText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10b981',
    marginLeft: 4,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f59e0b',
    marginLeft: 4,
  },
  buoySelectionSection: {
    marginBottom: 16,
  },
  buoySelectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
