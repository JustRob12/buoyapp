import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Modal } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G } from 'react-native-svg';
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
  
  // Safety check - if no data, show empty state
  if (!processedData || processedData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for charts</Text>
        </View>
      </View>
    );
  }

  // Extract values for each chart with proper error handling
  const pHData = processedData.map(item => {
    const value = parseFloat(item.pH);
    return isNaN(value) ? 0 : value;
  });
  const tempData = processedData.map(item => {
    const value = parseFloat(item['Temp (°C)']);
    return isNaN(value) ? 0 : value;
  });
  const tdsData = processedData.map(item => {
    const value = parseFloat(item['TDS (ppm)']);
    return isNaN(value) ? 0 : value;
  });

  // Create labels for x-axis (time)
  const labels = processedData.map(item => {
    const time = item.Time.split(':');
    return `${time[0]}:${time[1]}`;
  });

  const chartOptions: { label: string; value: ChartType; icon: string }[] = [
    { label: 'All Data (Combined)', value: 'Combined', icon: 'layers' },
    { label: 'pH Levels', value: 'pH', icon: 'water' },
    { label: 'Temperature (°C)', value: 'Temperature', icon: 'thermometer' },
    { label: 'TDS (ppm)', value: 'TDS', icon: 'analytics' },
  ];

  // Custom Line Chart Component
  const CustomLineChart = ({ 
    data, 
    labels, 
    color, 
    title, 
    height = 200 
  }: { 
    data: number[], 
    labels: string[], 
    color: string, 
    title: string,
    height?: number 
  }) => {
    const chartWidth = Math.max(screenWidth - 40, labels.length * 80);
    const chartHeight = height;
    const padding = 40;
    const graphWidth = chartWidth - (padding * 2);
    const graphHeight = chartHeight - (padding * 2);

    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * graphWidth;
      const y = padding + graphHeight - ((value - minValue) / (maxValue - minValue)) * graphHeight;
      return { x, y, value };
    });

    // Create path for line
    const pathData = points.map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    }).join(' ');

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = padding + ratio * graphHeight;
              const value = minValue + (1 - ratio) * (maxValue - minValue);
              return (
                <G key={index}>
                  <Line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  <SvgText
                    x={padding - 10}
                    y={y + 4}
                    fontSize="10"
                    fill="#64748b"
                    textAnchor="end"
                  >
                    {value.toFixed(1)}
                  </SvgText>
                </G>
              );
            })}

            {/* X-axis labels */}
            {labels.map((label, index) => {
              const x = padding + (index / (labels.length - 1)) * graphWidth;
              return (
                <SvgText
                  key={index}
                  x={x}
                  y={chartHeight - 10}
                  fontSize="10"
                  fill="#64748b"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            })}

            {/* Line path */}
            <Path
              d={pathData}
              stroke={color}
              strokeWidth="3"
              fill="none"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}
          </Svg>
        </ScrollView>
      </View>
    );
  };

  // Combined Line Chart
  const CombinedLineChart = ({ 
    pHData, 
    tempData, 
    tdsData, 
    labels, 
    title 
  }: { 
    pHData: number[], 
    tempData: number[], 
    tdsData: number[], 
    labels: string[], 
    title: string 
  }) => {
    const chartWidth = Math.max(screenWidth - 40, labels.length * 80);
    const chartHeight = 250;
    const padding = 40;
    const graphWidth = chartWidth - (padding * 2);
    const graphHeight = chartHeight - (padding * 2);

    const allData = [...pHData, ...tempData, ...tdsData];
    const maxValue = Math.max(...allData, 1);
    const minValue = Math.min(...allData, 0);

    const createPoints = (data: number[]) => {
      return data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * graphWidth;
        const y = padding + graphHeight - ((value - minValue) / (maxValue - minValue)) * graphHeight;
        return { x, y, value };
      });
    };

    const pHPoints = createPoints(pHData);
    const tempPoints = createPoints(tempData);
    const tdsPoints = createPoints(tdsData);

    const createPath = (points: { x: number; y: number }[]) => {
      return points.map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        return `L ${point.x} ${point.y}`;
      }).join(' ');
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = padding + ratio * graphHeight;
              const value = minValue + (1 - ratio) * (maxValue - minValue);
              return (
                <G key={index}>
                  <Line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  <SvgText
                    x={padding - 10}
                    y={y + 4}
                    fontSize="10"
                    fill="#64748b"
                    textAnchor="end"
                  >
                    {value.toFixed(1)}
                  </SvgText>
                </G>
              );
            })}

            {/* X-axis labels */}
            {labels.map((label, index) => {
              const x = padding + (index / (labels.length - 1)) * graphWidth;
              return (
                <SvgText
                  key={index}
                  x={x}
                  y={chartHeight - 10}
                  fontSize="10"
                  fill="#64748b"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            })}

            {/* pH Line */}
            <Path
              d={createPath(pHPoints)}
              stroke="#0ea5e9"
              strokeWidth="3"
              fill="none"
            />

            {/* Temperature Line */}
            <Path
              d={createPath(tempPoints)}
              stroke="#ef4444"
              strokeWidth="3"
              fill="none"
            />

            {/* TDS Line */}
            <Path
              d={createPath(tdsPoints)}
              stroke="#22c55e"
              strokeWidth="3"
              fill="none"
            />

            {/* Data points */}
            {pHPoints.map((point, index) => (
              <Circle
                key={`pH-${index}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#0ea5e9"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
            {tempPoints.map((point, index) => (
              <Circle
                key={`temp-${index}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
            {tdsPoints.map((point, index) => (
              <Circle
                key={`tds-${index}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
          </Svg>
        </ScrollView>

        {/* Legend */}
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
      </View>
    );
  };

  const renderChart = () => {
    try {
      switch (selectedChart) {
        case 'pH':
          return (
            <CustomLineChart 
              data={pHData} 
              labels={labels} 
              color="#0ea5e9" 
              title="pH Levels" 
            />
          );
        case 'Temperature':
          return (
            <CustomLineChart 
              data={tempData} 
              labels={labels} 
              color="#ef4444" 
              title="Temperature (°C)" 
            />
          );
        case 'TDS':
          return (
            <CustomLineChart 
              data={tdsData} 
              labels={labels} 
              color="#22c55e" 
              title="TDS (ppm)" 
            />
          );
        case 'Combined':
          return (
            <CombinedLineChart 
              pHData={pHData}
              tempData={tempData}
              tdsData={tdsData}
              labels={labels}
              title="All Sensor Data"
            />
          );
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering chart:', error);
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Error loading chart</Text>
        </View>
      );
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

      {/* Chart Section */}
      <View style={styles.chartSection}>
        {renderChart()}
      </View>

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
  chartSection: {
    marginBottom: 20,
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
    textAlign: 'center',
  },
  // Chart Styles
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 16,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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
  // Modal Styles
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
