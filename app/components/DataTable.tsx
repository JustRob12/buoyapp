import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BuoyData } from '../services/buoyService';

interface DataTableProps {
  data: BuoyData[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  loading,
  refreshing,
  onRefresh,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date} ${time}`);
    return {
      date: dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, styles.idCell]}>
        <Text style={styles.headerText}>ID</Text>
      </View>
      <View style={[styles.headerCell, styles.buoyCell]}>
        <Text style={styles.headerText}>Buoy</Text>
      </View>
      <View style={[styles.headerCell, styles.dateCell]}>
        <Text style={styles.headerText}>Date</Text>
      </View>
      <View style={[styles.headerCell, styles.timeCell]}>
        <Text style={styles.headerText}>Time</Text>
      </View>
      <View style={[styles.headerCell, styles.phCell]}>
        <Text style={styles.headerText}>pH</Text>
      </View>
      <View style={[styles.headerCell, styles.tempCell]}>
        <Text style={styles.headerText}>Temp</Text>
      </View>
      <View style={[styles.headerCell, styles.tdsCell]}>
        <Text style={styles.headerText}>TDS</Text>
      </View>
    </View>
  );

  const renderRow = ({ item }: { item: BuoyData }) => {
    const { date, time } = formatDateTime(item.Date, item.Time);
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.cell, styles.idCell]}>
          <Text style={styles.cellText}>{item.ID}</Text>
        </View>
        <View style={[styles.cell, styles.buoyCell]}>
          <Text style={styles.buoyText}>{item.Buoy}</Text>
        </View>
        <View style={[styles.cell, styles.dateCell]}>
          <Text style={styles.cellText}>{date}</Text>
        </View>
        <View style={[styles.cell, styles.timeCell]}>
          <Text style={styles.cellText}>{time}</Text>
        </View>
        <View style={[styles.cell, styles.phCell]}>
          <Text style={styles.cellText}>{item.pH}</Text>
        </View>
        <View style={[styles.cell, styles.tempCell]}>
          <Text style={styles.cellText}>{item['Temp (°C)']}</Text>
        </View>
        <View style={[styles.cell, styles.tdsCell]}>
          <Text style={styles.cellText}>{item['TDS (ppm)']}</Text>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={currentPage === 1 ? "#94a3b8" : "#0ea5e9"}
          />
        </TouchableOpacity>
        
                 <View style={styles.pageInfo}>
           <Text style={styles.pageText}>
             Page {currentPage} of {totalPages}
           </Text>
           <Text style={styles.recordCountText}>
             {data.length} records on this page
           </Text>
           <Text style={styles.totalRecordsText}>
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
            size={20}
            color={currentPage === totalPages ? "#94a3b8" : "#0ea5e9"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tableContainer: {
    paddingBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  headerCell: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    paddingVertical: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cell: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'center',
  },
  buoyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0ea5e9',
    textAlign: 'center',
  },
  // Column widths
  idCell: {
    width: width * 0.08,
  },
  buoyCell: {
    width: width * 0.12,
  },
  dateCell: {
    width: width * 0.18,
  },
  timeCell: {
    width: width * 0.12,
  },
  phCell: {
    width: width * 0.12,
  },
  tempCell: {
    width: width * 0.12,
  },
  tdsCell: {
    width: width * 0.12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  recordCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  totalRecordsText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94a3b8',
    marginTop: 1,
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
});

export default DataTable;
