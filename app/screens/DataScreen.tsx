import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Header from '../components/Header';
import DataTable from '../components/DataTable';
import { fetchBuoyData, getAllBuoyDataForCSV, BuoyData } from '../services/buoyService';

const DataScreen = () => {
  const [data, setData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  // Filter states
  const [selectedBuoy, setSelectedBuoy] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async (page: number = 1, filters?: { buoy?: string; dateRange?: string }) => {
    try {
      setError(null);
      setLoading(true);
      
      // Apply filters
      const buoyFilter = filters?.buoy || selectedBuoy;
      const dateFilter = filters?.dateRange || selectedDateRange;
      
      const response = await fetchBuoyData(page, buoyFilter !== 'all' ? buoyFilter : undefined, dateFilter !== 'all' ? dateFilter : undefined);
      setData(response.data);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
      console.log(`Loaded page ${page} of ${response.totalPages} with ${response.data.length} records (Buoy: ${buoyFilter}, Date: ${dateFilter})`);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(currentPage);
    setRefreshing(false);
  };

  const onPageChange = async (page: number) => {
    await fetchData(page);
  };

  const handleBuoyChange = async (buoy: string) => {
    setSelectedBuoy(buoy);
    setCurrentPage(1);
    await fetchData(1, { buoy, dateRange: selectedDateRange });
  };

  const handleDateRangeChange = async (dateRange: string) => {
    setSelectedDateRange(dateRange);
    setCurrentPage(1);
    await fetchData(1, { buoy: selectedBuoy, dateRange });
  };

  const clearFilters = async () => {
    setSelectedBuoy('all');
    setSelectedDateRange('all');
    setCurrentPage(1);
    await fetchData(1, { buoy: 'all', dateRange: 'all' });
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
                const fileUri = `${FileSystem.documentDirectory}${filename}`;
                
                // Write CSV file
                await FileSystem.writeAsStringAsync(fileUri, csvData, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
                
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
              <Text style={styles.subtitle}>
                Page {currentPage} of {totalPages} • {data.length} records per page
              </Text>
              <Text style={styles.pageInfo}>
                Navigate through pages to view all {totalPages * 10} total records
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.filterToggleButton}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons name="filter-outline" size={20} color="#0ea5e9" />
                <Text style={styles.filterToggleText}>Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
                onPress={downloadCSV}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="download-outline" size={20} color="#ffffff" />
                )}
                <Text style={styles.downloadButtonText}>
                  {downloading ? 'Downloading...' : 'Download CSV'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {showFilters && (
            <View style={styles.filtersContainer}>
              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Buoy</Text>
                  <TouchableOpacity
                    style={styles.buoyFilterButton}
                    onPress={() => {
                      // Create buoy options
                      Alert.alert(
                        'Select Buoy',
                        'Choose a specific buoy to filter data',
                        [
                          { text: 'All Buoys', onPress: () => handleBuoyChange('all') },
                          { text: 'Buoy 1', onPress: () => handleBuoyChange('1') },
                          { text: 'Buoy 2', onPress: () => handleBuoyChange('2') },
                          { text: 'Buoy 3', onPress: () => handleBuoyChange('3') },
                          { text: 'Buoy 4', onPress: () => handleBuoyChange('4') },
                          { text: 'Buoy 5', onPress: () => handleBuoyChange('5') },
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.buoyFilterText}>
                      {selectedBuoy === 'all' ? 'All Buoys' : `Buoy ${selectedBuoy}`}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Date Range</Text>
                  <TouchableOpacity
                    style={styles.dateFilterButton}
                    onPress={() => {
                      // Create date range options
                      Alert.alert(
                        'Select Date Range',
                        'Choose a time period to filter data',
                        [
                          { text: 'All Time', onPress: () => handleDateRangeChange('all') },
                          { text: 'Today', onPress: () => handleDateRangeChange('today') },
                          { text: 'Last 7 Days', onPress: () => handleDateRangeChange('week') },
                          { text: 'Last 30 Days', onPress: () => handleDateRangeChange('month') },
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.dateFilterText}>
                      {selectedDateRange === 'all' ? 'All Time' :
                       selectedDateRange === 'today' ? 'Today' :
                       selectedDateRange === 'week' ? 'Last 7 Days' :
                       selectedDateRange === 'month' ? 'Last 30 Days' : 'All Time'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {(selectedBuoy !== 'all' || selectedDateRange !== 'all') && (
                <View style={styles.filterActions}>
                  <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                    <Text style={styles.clearFiltersText}>Clear Filters</Text>
                  </TouchableOpacity>
                  <Text style={styles.filterStatus}>
                    {selectedBuoy !== 'all' && `Buoy: ${selectedBuoy}`}
                    {selectedBuoy !== 'all' && selectedDateRange !== 'all' && ' • '}
                    {selectedDateRange !== 'all' && `Date: ${
                      selectedDateRange === 'today' ? 'Today' :
                      selectedDateRange === 'week' ? 'Last 7 Days' :
                      selectedDateRange === 'month' ? 'Last 30 Days' : selectedDateRange
                    }`}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <DataTable
            data={data}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
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
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterToggleText: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  filtersContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 16,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  buoyFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  buoyFilterText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  dateFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateFilterText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  filterStatus: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default DataScreen;
