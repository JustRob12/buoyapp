import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { BuoyData } from '../services/buoyService';

interface BuoyGraphProps {
  data: BuoyData[];
}

type ChartType = 'pH' | 'Temperature' | 'TDS' | 'Combined';

const BuoyGraph: React.FC<BuoyGraphProps> = ({ data }) => {
  const screenWidth = Dimensions.get('window').width;
  const [selectedChart, setSelectedChart] = useState<ChartType>('Combined');
  const [showDropdown, setShowDropdown] = useState(false);

  // Process data for charts - get latest 10 data points and reverse for chronological order
  const processedData = data.slice(0, 10).reverse();

  // Calculate chart width - make it wider for horizontal scrolling
  const chartWidth = Math.max(screenWidth * 1.5, processedData.length * 80); // Minimum 80px per data point

  // Extract values for each chart
  const pHData = processedData.map(item => parseFloat(item.pH) || 0);
  const tempData = processedData.map(item => parseFloat(item['Temp (°C)']) || 0);
  const tdsData = processedData.map(item => parseFloat(item['TDS (ppm)']) || 0);

  // Create labels for x-axis (time)
  const labels = processedData.map(item => {
    const time = item.Time.split(':');
    return `${time[0]}:${time[1]}`;
  });

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#0ea5e9',
    },
  };

  const pHChartData = {
    labels,
    datasets: [
      {
        data: pHData,
        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const tempChartData = {
    labels,
    datasets: [
      {
        data: tempData,
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const tdsChartData = {
    labels,
    datasets: [
      {
        data: tdsData,
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Combined chart data with all three datasets
  const combinedChartData = {
    labels,
    datasets: [
      {
        data: pHData,
        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: tempData,
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: tdsData,
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartOptions: { label: string; value: ChartType; icon: string }[] = [
    { label: 'All Data (Combined)', value: 'Combined', icon: 'layers' },
    { label: 'pH Levels', value: 'pH', icon: 'water' },
    { label: 'Temperature (°C)', value: 'Temperature', icon: 'thermometer' },
    { label: 'TDS (ppm)', value: 'TDS', icon: 'analytics' },
  ];

  const renderChart = () => {
    switch (selectedChart) {
      case 'pH':
        return (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <LineChart
              data={pHChartData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </ScrollView>
        );
      case 'Temperature':
        return (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <LineChart
              data={tempChartData}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </ScrollView>
        );
      case 'TDS':
        return (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <LineChart
              data={tdsChartData}
              width={chartWidth}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </ScrollView>
        );
      case 'Combined':
        return (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <LineChart
              data={combinedChartData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </ScrollView>
        );
      default:
        return null;
    }
  };

  const getChartTitle = () => {
    switch (selectedChart) {
      case 'pH':
        return 'pH Levels';
      case 'Temperature':
        return 'Temperature (°C)';
      case 'TDS':
        return 'TDS (ppm)';
      case 'Combined':
        return 'All Sensor Data';
      default:
        return '';
    }
  };

  const getSelectedOption = () => {
    return chartOptions.find(option => option.value === selectedChart);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Dropdown Selector */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(true)}
        >
          <View style={styles.dropdownContent}>
            <Ionicons 
              name={getSelectedOption()?.icon as any} 
              size={20} 
              color="#0ea5e9" 
            />
            <Text style={styles.dropdownText}>{getSelectedOption()?.label}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Chart Container */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{getChartTitle()}</Text>
        {renderChart()}
      </View>

      {/* Legend for Combined Chart */}
      {selectedChart === 'Combined' && (
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0ea5e9' }]} />
            <Text style={styles.legendText}>pH</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Temperature</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>TDS</Text>
          </View>
        </View>
      )}

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            {chartOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  selectedChart === option.value && styles.selectedOption
                ]}
                onPress={() => {
                  setSelectedChart(option.value);
                  setShowDropdown(false);
                }}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color={selectedChart === option.value ? '#ffffff' : '#0ea5e9'} 
                />
                <Text style={[
                  styles.dropdownOptionText,
                  selectedChart === option.value && styles.selectedOptionText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
    marginLeft: 12,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  horizontalScrollContent: {
    paddingRight: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 2,
  },
  selectedOption: {
    backgroundColor: '#0ea5e9',
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e3a8a',
    marginLeft: 12,
  },
  selectedOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default BuoyGraph;
