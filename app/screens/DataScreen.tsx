import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Header from '../components/Header';
import DataTable from '../components/DataTable';
import { fetchBuoyData, getAllBuoyDataForCSV, BuoyData, getAllBuoyData } from '../services/buoyService';

const DataScreen = () => {
  const [data, setData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [allData, setAllData] = useState<BuoyData[]>([]);
  const [filteredData, setFilteredData] = useState<BuoyData[]>([]);
  const [currentFilters, setCurrentFilters] = useState<{ month?: string; year?: string }>({});
  

  const fetchData = async (page: number = 1) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetchBuoyData(page);
      setData(response.data);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
      console.log(`Loaded page ${page} of ${response.totalPages} with ${response.data.length} records`);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching all data for filtering...');
      const allBuoyData = await getAllBuoyData();
      setAllData(allBuoyData);
      setFilteredData(allBuoyData);
      console.log(`✅ Loaded ${allBuoyData.length} total records for filtering`);
    } catch (err) {
      console.error('❌ Error fetching all data:', err);
      setError('Failed to load data for filtering. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async (filters: { month?: string; year?: string }) => {
    console.log('🔍 Applying filters:', filters);
    setCurrentFilters(filters);
    
    // If we have filters, fetch all data first
    if (Object.keys(filters).length > 0 && allData.length === 0) {
      console.log('📥 Fetching all data for filtering...');
      await fetchAllData();
    }
    
    let filtered = [...allData];
    
    if (filters.month) {
      filtered = filtered.filter(item => {
        try {
          // Parse date more carefully
          const dateStr = item.Date.trim();
          const timeStr = item.Time.trim();
          
          // Handle different date formats
          let date;
          if (dateStr.includes('/')) {
            // Format: MM/DD/YYYY or DD/MM/YYYY
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              // Assume MM/DD/YYYY format
              date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
            }
          } else if (dateStr.includes('-')) {
            // Format: YYYY-MM-DD
            date = new Date(dateStr);
          } else {
            // Try parsing as is
            date = new Date(`${dateStr} ${timeStr}`);
          }
          
          if (!date || isNaN(date.getTime())) {
            console.warn('Invalid date:', dateStr, timeStr);
            return false;
          }
          
          const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          return monthYear === filters.month;
        } catch (error) {
          console.warn('Error parsing date:', item.Date, item.Time, error);
          return false;
        }
      });
    }
    
    if (filters.year) {
      filtered = filtered.filter(item => {
        try {
          const dateStr = item.Date.trim();
          const timeStr = item.Time.trim();
          
          let date;
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
            }
          } else if (dateStr.includes('-')) {
            date = new Date(dateStr);
          } else {
            date = new Date(`${dateStr} ${timeStr}`);
          }
          
          if (!date || isNaN(date.getTime())) {
            console.warn('Invalid date:', dateStr, timeStr);
            return false;
          }
          
          const year = date.getFullYear().toString();
          return year === filters.year;
        } catch (error) {
          console.warn('Error parsing date:', item.Date, item.Time, error);
          return false;
        }
      });
    }
    
    setFilteredData(filtered);
    console.log(`📊 Filtered to ${filtered.length} records`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (Object.keys(currentFilters).length > 0) {
      // If filters are active, refresh filtered data
      await fetchAllData();
      applyFilters(currentFilters);
    } else {
      // If no filters, refresh paginated data
      await fetchData(currentPage);
    }
    setRefreshing(false);
  };

  const onPageChange = async (page: number) => {
    await fetchData(page);
  };


  const downloadCSV = async () => {
    try {
      setDownloading(true);
      
      // Show confirmation dialog
      Alert.alert(
        'Download CSV',
        'This will download all buoy data as a CSV file. This may take a moment.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Download', 
            onPress: async () => {
              try {
                // Fetch all data and convert to CSV
                const csvData = await getAllBuoyDataForCSV();
                
                // Create filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const filename = `buoy_data_${timestamp}.csv`;
                const fileUri = `file:///tmp/${filename}`;
                
                // Write CSV file
                await FileSystem.writeAsStringAsync(fileUri, csvData);
                
                // Share the file
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Download Buoy Data CSV',
                  });
                } else {
                  Alert.alert('Success', `CSV file saved as: ${filename}`);
                }
                
              } catch (err) {
                console.error('Error downloading CSV:', err);
                Alert.alert('Error', 'Failed to download CSV file. Please try again.');
              } finally {
                setDownloading(false);
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error in downloadCSV:', err);
      Alert.alert('Error', 'Failed to start download. Please try again.');
      setDownloading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  // Determine which data to display
  const displayData = Object.keys(currentFilters).length > 0 ? filteredData : data;
  const displayTotalPages = Object.keys(currentFilters).length > 0 ? Math.ceil(filteredData.length / 10) : totalPages;

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header title="AquaNet" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="AquaNet" />
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Data</Text>
            </View>
          </View>
          
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <DataTable
            data={displayData}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            currentPage={currentPage}
            totalPages={displayTotalPages}
            onPageChange={onPageChange}
            onFilterChange={applyFilters}
            onDownloadCSV={downloadCSV}
          />
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
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  pageInfo: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94a3b8',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
});

export default DataScreen;
