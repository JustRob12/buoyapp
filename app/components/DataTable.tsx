import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BuoyData, getAvailableMonthsFromAPI } from '../services/buoyService';

interface DataTableProps {
  data: BuoyData[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onFilterChange?: (filters: { month?: string; year?: string }) => void;
  onDownloadCSV?: () => void;
  clearFiltersTrigger?: number; // Add trigger to clear filters externally
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  loading,
  refreshing,
  onRefresh,
  currentPage,
  totalPages,
  onPageChange,
  onFilterChange,
  onDownloadCSV,
  clearFiltersTrigger,
}) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [apiFilters, setApiFilters] = useState<{ months: string[]; years: string[] }>({ months: [], years: [] });
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Responsive font sizes
  const getResponsiveFontSize = (baseSize: number) => {
    const scale = Math.min(screenWidth / 375, screenHeight / 667);
    return Math.max(baseSize * scale, baseSize * 0.8);
  };

  const getResponsiveIconSize = (baseSize: number) => {
    const scale = Math.min(screenWidth / 375, screenHeight / 667);
    return Math.max(baseSize * scale, baseSize * 0.7);
  };

  // Fetch available months and years from API
  useEffect(() => {
    const fetchApiFilters = async () => {
      setLoadingFilters(true);
      try {
        const filters = await getAvailableMonthsFromAPI();
        setApiFilters(filters);
        console.log('📅 API Filters loaded:', filters);
      } catch (error) {
        console.error('❌ Error loading API filters:', error);
        // Fallback to current data if API fails
        const months = new Set<string>();
        const years = new Set<string>();

        data.forEach(item => {
          const date = new Date(`${item.Date} ${item.Time}`);
          const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const year = date.getFullYear().toString();
          
          months.add(month);
          years.add(year);
        });

        setApiFilters({
          months: Array.from(months).sort(),
          years: Array.from(years).sort((a, b) => b.localeCompare(a))
        });
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchApiFilters();
  }, []);

  // Use API filters if available, otherwise fallback to current data
  const availableFilters = useMemo(() => {
    if (apiFilters.months.length > 0) {
      return apiFilters;
    }

    // Fallback to current data
    const months = new Set<string>();
    const years = new Set<string>();

    data.forEach(item => {
      const date = new Date(`${item.Date} ${item.Time}`);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const year = date.getFullYear().toString();
      
      months.add(month);
      years.add(year);
    });

    return {
      months: Array.from(months).sort(),
      years: Array.from(years).sort((a, b) => b.localeCompare(a))
    };
  }, [data, apiFilters]);

  const handleFilterApply = () => {
    if (onFilterChange) {
      onFilterChange({
        month: selectedMonth || undefined,
        year: selectedYear || undefined
      });
    }
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedYear('');
    if (onFilterChange) {
      onFilterChange({});
    }
    setShowFilterModal(false);
  };

  // Watch for external clear trigger
  useEffect(() => {
    if (clearFiltersTrigger && clearFiltersTrigger > 0) {
      clearFilters();
    }
  }, [clearFiltersTrigger]);
  const formatDateTime = (date: string, time: string) => {
    try {
      const dateStr = date.trim();
      const timeStr = time.trim();
      
      console.log('🕐 Formatting date/time:', { dateStr, timeStr });
      
      // Handle different date formats more carefully
      let dateObj;
      if (dateStr.includes('/')) {
        // Format: MM/DD/YYYY or DD/MM/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          // Assume MM/DD/YYYY format
          const month = parseInt(parts[0]);
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          // Validate reasonable date ranges
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
            // Parse time separately
            let hours = 0, minutes = 0;
            if (timeStr) {
              // Handle different time formats
              if (timeStr.includes(':')) {
                const timeParts = timeStr.split(':');
                hours = parseInt(timeParts[0]) || 0;
                minutes = parseInt(timeParts[1]) || 0;
                // Ignore seconds if present (timeParts[2])
              } else if (timeStr.includes(' ')) {
                // Handle "HH MM" format
                const timeParts = timeStr.split(' ');
                hours = parseInt(timeParts[0]) || 0;
                minutes = parseInt(timeParts[1]) || 0;
              } else {
                // Try parsing as number (HHMM format)
                const timeNum = parseInt(timeStr);
                if (!isNaN(timeNum) && timeNum >= 0 && timeNum <= 2359) {
                  hours = Math.floor(timeNum / 100);
                  minutes = timeNum % 100;
                }
              }
            }
            
            dateObj = new Date(year, month - 1, day, hours, minutes);
            console.log('📅 Created date object:', { year, month, day, hours, minutes, dateObj });
          }
        }
      } else if (dateStr.includes('-')) {
        // Format: YYYY-MM-DD
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          
          // Parse time separately for YYYY-MM-DD format
          let hours = 0, minutes = 0;
          if (timeStr) {
            if (timeStr.includes(':')) {
              const timeParts = timeStr.split(':');
              hours = parseInt(timeParts[0]) || 0;
              minutes = parseInt(timeParts[1]) || 0;
              // Ignore seconds if present (timeParts[2])
            }
          }
          
          dateObj = new Date(year, month - 1, day, hours, minutes);
          console.log('📅 Created date object from YYYY-MM-DD:', { year, month, day, hours, minutes, dateObj });
        } else {
          dateObj = new Date(dateStr);
        }
      } else {
        // Try parsing as is
        dateObj = new Date(`${dateStr} ${timeStr}`);
      }
      
      // Fallback if parsing failed
      if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getFullYear() < 2020 || dateObj.getFullYear() > 2030) {
        console.log('⚠️ Date parsing failed, using original strings');
        return {
          date: dateStr, // Show original date string
          time: timeStr  // Show original time string
        };
      }
      
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const formattedTime = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log('✅ Formatted result:', { formattedDate, formattedTime });
      
      return {
        date: formattedDate,
        time: formattedTime
      };
    } catch (error) {
      console.warn('Error formatting date:', date, time, error);
      return {
        date: date,
        time: time
      };
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, styles.idCell]}>
        <Text style={[styles.headerText, { fontSize: getResponsiveFontSize(10) }]}>ID</Text>
      </View>
      <View style={[styles.headerCell, styles.buoyCell]}>
        <Text style={[styles.headerText, { fontSize: getResponsiveFontSize(10) }]}>Buoy</Text>
      </View>
      <View style={[styles.headerCell, styles.dateCell]}>
        <Text style={[styles.headerText, { fontSize: getResponsiveFontSize(10) }]}>Date</Text>
      </View>
      <View style={[styles.headerCell, styles.timeCell]}>
        <Text style={[styles.headerText, { fontSize: getResponsiveFontSize(10) }]}>Time</Text>
      </View>
      <View style={[styles.headerCell, styles.phCell]}>
        <Text style={[styles.headerText, { fontSize: getResponsiveFontSize(10) }]}>pH</Text>
      </View>
      <View style={[styles.headerCell, styles.tempCell]}>
        <Text style={[styles.headerText, { fontSize: getResponsiveFontSize(10) }]}>Temp</Text>
      </View>
      <View style={[styles.headerCell, styles.tdsCell]}>
        <Text style={[styles.headerText, { fontSize: getResponsiveFontSize(10) }]}>TDS</Text>
      </View>
    </View>
  );

  const renderRow = ({ item }: { item: BuoyData }) => {
    const { date, time } = formatDateTime(item.Date, item.Time);
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, styles.idCell]}>
          <Text style={[styles.cellText, { fontSize: getResponsiveFontSize(10) }]}>{item.ID}</Text>
        </View>
        <View style={[styles.cell, styles.buoyCell]}>
          <Text style={[styles.buoyText, { fontSize: getResponsiveFontSize(10) }]}>{item.Buoy}</Text>
        </View>
        <View style={[styles.cell, styles.dateCell]}>
          <Text style={[styles.cellText, { fontSize: getResponsiveFontSize(9) }]}>{date}</Text>
        </View>
        <View style={[styles.cell, styles.timeCell]}>
          <Text style={[styles.cellText, { fontSize: getResponsiveFontSize(9) }]}>{time}</Text>
        </View>
        <View style={[styles.cell, styles.phCell]}>
          <Text style={[styles.cellText, { fontSize: getResponsiveFontSize(10) }]}>{item.pH}</Text>
        </View>
        <View style={[styles.cell, styles.tempCell]}>
          <Text style={[styles.cellText, { fontSize: getResponsiveFontSize(10) }]}>{item['Temp (°C)']}</Text>
        </View>
        <View style={[styles.cell, styles.tdsCell]}>
          <Text style={[styles.cellText, { fontSize: getResponsiveFontSize(10) }]}>{item['TDS (ppm)']}</Text>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    // Don't show pagination if we have filtered data (showing all filtered results)
    if (data.length <= 10 && totalPages === 1) {
      return (
        <View style={styles.paginationContainer}>
          <View style={styles.pageInfo}>
            <Text style={[styles.pageText, { fontSize: getResponsiveFontSize(12) }]}>
              {data.length} records
            </Text>
            <Text style={[styles.recordCountText, { fontSize: getResponsiveFontSize(10) }]}>
              Showing all results
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Ionicons
            name="chevron-back"
            size={getResponsiveIconSize(18)}
            color={currentPage === 1 ? "#94a3b8" : "#0ea5e9"}
          />
        </TouchableOpacity>
        
        <View style={styles.pageInfo}>
          <Text style={[styles.pageText, { fontSize: getResponsiveFontSize(12) }]}>
            Page {currentPage} of {totalPages}
          </Text>
          <Text style={[styles.recordCountText, { fontSize: getResponsiveFontSize(10) }]}>
            {data.length} records on this page
          </Text>
          <Text style={[styles.totalRecordsText, { fontSize: getResponsiveFontSize(9) }]}>
            ~{totalPages * 10} total records available
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
          onPress={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Ionicons
            name="chevron-forward"
            size={getResponsiveIconSize(18)}
            color={currentPage === totalPages ? "#94a3b8" : "#0ea5e9"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="filter" size={getResponsiveIconSize(20)} color="#0ea5e9" />
              <Text style={[styles.modalTitle, { fontSize: getResponsiveFontSize(16) }]}>
                Filter Data
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Ionicons name="close" size={getResponsiveIconSize(20)} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Filter Content */}
          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            {/* Current Filters Display */}
            {(selectedMonth || selectedYear) && (
              <View style={styles.currentFilters}>
                <Text style={[styles.currentFiltersLabel, { fontSize: getResponsiveFontSize(12) }]}>
                  Active Filters:
                </Text>
                <View style={styles.currentFilterTags}>
                  {selectedMonth && (
                    <View style={styles.currentFilterTag}>
                      <Text style={[styles.currentFilterTagText, { fontSize: getResponsiveFontSize(10) }]}>
                        {selectedMonth}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedMonth('')}>
                        <Ionicons name="close-circle" size={getResponsiveIconSize(14)} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedYear && (
                    <View style={styles.currentFilterTag}>
                      <Text style={[styles.currentFilterTagText, { fontSize: getResponsiveFontSize(10) }]}>
                        {selectedYear}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedYear('')}>
                        <Ionicons name="close-circle" size={getResponsiveIconSize(14)} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Month Selection */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Ionicons name="calendar-outline" size={getResponsiveIconSize(16)} color="#0ea5e9" />
                <Text style={[styles.filterLabel, { fontSize: getResponsiveFontSize(13) }]}>
                  Select Month & Year
                </Text>
                {loadingFilters && (
                  <ActivityIndicator size="small" color="#0ea5e9" style={{ marginLeft: 8 }} />
                )}
              </View>
              <View style={styles.filterTags}>
                {loadingFilters ? (
                  <Text style={[styles.loadingText, { fontSize: getResponsiveFontSize(11) }]}>
                    Loading available months from database...
                  </Text>
                ) : (
                  availableFilters.months.map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.filterTag,
                        selectedMonth === month && styles.filterTagSelected
                      ]}
                      onPress={() => setSelectedMonth(month)}
                    >
                      <Ionicons 
                        name={selectedMonth === month ? "checkmark-circle" : "calendar-outline"} 
                        size={getResponsiveIconSize(12)} 
                        color={selectedMonth === month ? "#ffffff" : "#0ea5e9"} 
                      />
                      <Text style={[
                        styles.filterTagText,
                        { fontSize: getResponsiveFontSize(10) },
                        selectedMonth === month && styles.filterTagTextSelected
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Year Selection */}
            <View style={styles.filterSection}>
              <View style={styles.filterSectionHeader}>
                <Ionicons name="time-outline" size={getResponsiveIconSize(16)} color="#22c55e" />
                <Text style={[styles.filterLabel, { fontSize: getResponsiveFontSize(13) }]}>
                  Select Year
                </Text>
                {loadingFilters && (
                  <ActivityIndicator size="small" color="#22c55e" style={{ marginLeft: 8 }} />
                )}
              </View>
              <View style={styles.filterTags}>
                {loadingFilters ? (
                  <Text style={[styles.loadingText, { fontSize: getResponsiveFontSize(11) }]}>
                    Loading available years from database...
                  </Text>
                ) : (
                  availableFilters.years.map((year, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.filterTag,
                        selectedYear === year && styles.filterTagSelected
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Ionicons 
                        name={selectedYear === year ? "checkmark-circle" : "time-outline"} 
                        size={getResponsiveIconSize(12)} 
                        color={selectedYear === year ? "#ffffff" : "#22c55e"} 
                      />
                      <Text style={[
                        styles.filterTagText,
                        { fontSize: getResponsiveFontSize(10) },
                        selectedYear === year && styles.filterTagTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Data Summary */}
            <View style={styles.dataSummary}>
              <View style={styles.summaryItem}>
                <Ionicons name="analytics" size={getResponsiveIconSize(14)} color="#6b7280" />
                <Text style={[styles.summaryText, { fontSize: getResponsiveFontSize(10) }]}>
                  {data.length} total records
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="calendar" size={getResponsiveIconSize(14)} color="#6b7280" />
                <Text style={[styles.summaryText, { fontSize: getResponsiveFontSize(10) }]}>
                  {availableFilters.months.length} months available
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="refresh" size={getResponsiveIconSize(16)} color="#64748b" />
              <Text style={[styles.clearButtonText, { fontSize: getResponsiveFontSize(12) }]}>
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleFilterApply}>
              <Ionicons name="checkmark" size={getResponsiveIconSize(16)} color="#ffffff" />
              <Text style={[styles.applyButtonText, { fontSize: getResponsiveFontSize(12) }]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={[styles.loadingText, { fontSize: getResponsiveFontSize(14), fontWeight: '600', color: '#64748b', marginTop: Math.max(12, screenHeight * 0.015) }]}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Action Bar with Filter, Refresh, and Download */}
      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter-outline" size={getResponsiveIconSize(18)} color="#0ea5e9" />
            <Text style={[styles.actionButtonText, { fontSize: getResponsiveFontSize(11) }]}>
              Filter
            </Text>
            {(selectedMonth || selectedYear) && (
              <View style={styles.actionBadge}>
                <Text style={[styles.actionBadgeText, { fontSize: getResponsiveFontSize(8) }]}>
                  {(selectedMonth ? 1 : 0) + (selectedYear ? 1 : 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.actionRight}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onRefresh}
          >
            <Ionicons 
              name="refresh-outline" 
              size={getResponsiveIconSize(18)} 
              color="#22c55e" 
            />
            <Text style={[styles.actionButtonText, { fontSize: getResponsiveFontSize(11) }]}>
              Refresh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onDownloadCSV}
          >
            <Ionicons 
              name="download-outline" 
              size={getResponsiveIconSize(18)} 
              color="#f59e0b" 
            />
            <Text style={[styles.actionButtonText, { fontSize: getResponsiveFontSize(11) }]}>
              Download
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={data}
        renderItem={renderRow}
        keyExtractor={(item) => `${item.ID}-${item.Buoy}-${item.Date}-${item.Time}`}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderPagination}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tableContainer}
      />

      {renderFilterModal()}
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Action Bar Styles
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Math.max(12, screenWidth * 0.03),
    paddingVertical: Math.max(10, screenHeight * 0.012),
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  actionLeft: {
    flex: 1,
  },
  actionRight: {
    flexDirection: 'row',
    gap: Math.max(8, screenWidth * 0.02),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: Math.max(10, screenWidth * 0.025),
    paddingVertical: Math.max(8, screenWidth * 0.02),
    borderRadius: Math.max(6, screenWidth * 0.015),
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    gap: Math.max(4, screenWidth * 0.01),
  },
  actionButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  actionBadge: {
    backgroundColor: '#ef4444',
    borderRadius: Math.max(8, screenWidth * 0.02),
    minWidth: Math.max(16, screenWidth * 0.04),
    height: Math.max(16, screenWidth * 0.04),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Math.max(4, screenWidth * 0.01),
  },
  actionBadgeText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tableContainer: {
    paddingBottom: Math.max(20, screenHeight * 0.025),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0ea5e9',
    paddingVertical: Math.max(10, screenHeight * 0.012),
    marginBottom: Math.max(6, screenHeight * 0.008),
    borderRadius: Math.max(6, screenWidth * 0.015),
    marginHorizontal: Math.max(12, screenWidth * 0.03),
  },
  headerCell: {
    paddingHorizontal: Math.max(2, screenWidth * 0.005),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: Math.max(12, screenWidth * 0.03),
    marginBottom: Math.max(3, screenHeight * 0.004),
    borderRadius: Math.max(6, screenWidth * 0.015),
    paddingVertical: Math.max(10, screenHeight * 0.012),
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  cell: {
    paddingHorizontal: Math.max(2, screenWidth * 0.005),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'center',
  },
  buoyText: {
    fontWeight: '600',
    color: '#0ea5e9',
    textAlign: 'center',
  },
  // Responsive Column widths
  idCell: {
    width: screenWidth * 0.08,
  },
  buoyCell: {
    width: screenWidth * 0.12,
  },
  dateCell: {
    width: screenWidth * 0.18,
  },
  timeCell: {
    width: screenWidth * 0.12,
  },
  phCell: {
    width: screenWidth * 0.12,
  },
  tempCell: {
    width: screenWidth * 0.12,
  },
  tdsCell: {
    width: screenWidth * 0.12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Math.max(16, screenWidth * 0.04),
    paddingVertical: Math.max(12, screenHeight * 0.015),
    backgroundColor: '#ffffff',
    marginHorizontal: Math.max(12, screenWidth * 0.03),
    marginTop: Math.max(12, screenHeight * 0.015),
    borderRadius: Math.max(8, screenWidth * 0.02),
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  paginationButton: {
    width: Math.max(36, screenWidth * 0.09),
    height: Math.max(36, screenWidth * 0.09),
    borderRadius: Math.max(18, screenWidth * 0.045),
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e0f2fe',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
  },
  pageText: {
    fontWeight: '600',
    color: '#1e293b',
  },
  recordCountText: {
    fontWeight: '500',
    color: '#64748b',
    marginTop: Math.max(2, screenHeight * 0.002),
  },
  totalRecordsText: {
    fontWeight: '400',
    color: '#94a3b8',
    marginTop: Math.max(1, screenHeight * 0.001),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Math.max(20, screenWidth * 0.05),
  },
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: Math.max(16, screenWidth * 0.04),
    borderTopRightRadius: Math.max(16, screenWidth * 0.04),
    maxHeight: screenHeight * 0.85,
    paddingBottom: Math.max(20, screenHeight * 0.025),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Math.max(16, screenWidth * 0.04),
    paddingVertical: Math.max(16, screenHeight * 0.02),
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Math.max(8, screenWidth * 0.02),
  },
  modalTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: Math.max(4, screenWidth * 0.01),
  },
  filterContent: {
    paddingHorizontal: Math.max(16, screenWidth * 0.04),
    paddingTop: Math.max(16, screenHeight * 0.02),
    maxHeight: screenHeight * 0.6,
  },
  currentFilters: {
    backgroundColor: '#f0f9ff',
    borderRadius: Math.max(8, screenWidth * 0.02),
    padding: Math.max(12, screenWidth * 0.03),
    marginBottom: Math.max(16, screenHeight * 0.02),
    borderWidth: 0.5,
    borderColor: '#e0f2fe',
  },
  currentFiltersLabel: {
    fontWeight: '600',
    color: '#0ea5e9',
    marginBottom: Math.max(8, screenHeight * 0.01),
  },
  currentFilterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Math.max(6, screenWidth * 0.015),
  },
  currentFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    borderRadius: Math.max(4, screenWidth * 0.01),
    paddingHorizontal: Math.max(8, screenWidth * 0.02),
    paddingVertical: Math.max(4, screenHeight * 0.005),
    gap: Math.max(4, screenWidth * 0.01),
  },
  currentFilterTagText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: Math.max(20, screenHeight * 0.025),
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Math.max(8, screenWidth * 0.02),
    marginBottom: Math.max(12, screenHeight * 0.015),
  },
  filterLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  filterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Math.max(8, screenWidth * 0.02),
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderRadius: Math.max(6, screenWidth * 0.015),
    paddingHorizontal: Math.max(10, screenWidth * 0.025),
    paddingVertical: Math.max(8, screenHeight * 0.01),
    gap: Math.max(4, screenWidth * 0.01),
  },
  filterTagSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  filterTagText: {
    color: '#64748b',
    fontWeight: '500',
  },
  filterTagTextSelected: {
    color: '#ffffff',
  },
  dataSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: Math.max(8, screenWidth * 0.02),
    padding: Math.max(12, screenWidth * 0.03),
    marginTop: Math.max(16, screenHeight * 0.02),
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Math.max(6, screenWidth * 0.015),
    marginBottom: Math.max(4, screenHeight * 0.005),
  },
  summaryText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingText: {
    color: '#9ca3af',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: Math.max(16, screenWidth * 0.04),
    paddingTop: Math.max(16, screenHeight * 0.02),
    gap: Math.max(12, screenWidth * 0.03),
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderRadius: Math.max(8, screenWidth * 0.02),
    paddingVertical: Math.max(12, screenWidth * 0.03),
    gap: Math.max(6, screenWidth * 0.015),
  },
  clearButtonText: {
    color: '#64748b',
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    borderRadius: Math.max(8, screenWidth * 0.02),
    paddingVertical: Math.max(12, screenWidth * 0.03),
    gap: Math.max(6, screenWidth * 0.015),
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default DataTable;
