import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Modal, Animated, PixelRatio } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G, Defs, LinearGradient, Stop, Path as SvgPath } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { BuoyData } from '../services/buoyService';

interface BuoyGraphProps {
  data: BuoyData[];
}

type ChartType = 'pH' | 'Temperature' | 'TDS' | 'Combined';
type TimePeriod = 'Today' | 'This Week' | 'This Month' | 'Last 7 Days' | 'Last 30 Days' | 'August 2025' | 'June 2025' | 'All Time';

const BuoyGraph: React.FC<BuoyGraphProps> = ({ data }) => {
  console.log('📊 BuoyGraph: Received data:', data?.length || 0, 'records');
  console.log('📊 BuoyGraph: Sample data:', data?.slice(0, 2));
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const pixelRatio = PixelRatio.get();
  
  // Responsive font sizes based on screen dimensions
  const getResponsiveFontSize = (baseSize: number) => {
    const scale = Math.min(screenWidth / 375, screenHeight / 667); // Base on iPhone 6/7/8 dimensions
    return Math.max(baseSize * scale, baseSize * 0.8); // Minimum 80% of base size
  };
  
  const getResponsiveIconSize = (baseSize: number) => {
    const scale = Math.min(screenWidth / 375, screenHeight / 667);
    return Math.max(baseSize * scale, baseSize * 0.7);
  };
  
  const [selectedChart, setSelectedChart] = useState<ChartType>('Combined');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('All Time');
  const [showChartDropdown, setShowChartDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showParameterDropdown, setShowParameterDropdown] = useState(false);
  const [selectedParameter, setSelectedParameter] = useState<'pH' | 'temp' | 'tds'>('pH');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const chartOptions: { label: string; value: ChartType; icon: string; color: string }[] = [
    { label: 'All Data (Combined)', value: 'Combined', icon: 'layers', color: '#0ea5e9' },
    { label: 'pH Levels', value: 'pH', icon: 'water', color: '#0ea5e9' },
    { label: 'Temperature (°C)', value: 'Temperature', icon: 'thermometer', color: '#ef4444' },
    { label: 'TDS (ppm)', value: 'TDS', icon: 'analytics', color: '#22c55e' },
  ];

  const timePeriodOptions: { label: string; value: TimePeriod; icon: string }[] = [
    { label: 'All Time', value: 'All Time', icon: 'infinite' },
    { label: 'August 2025', value: 'August 2025', icon: 'calendar' },
    { label: 'June 2025', value: 'June 2025', icon: 'calendar' },
    { label: 'Last 7 Days', value: 'Last 7 Days', icon: 'time' },
    { label: 'Last 30 Days', value: 'Last 30 Days', icon: 'time-outline' },
    { label: 'Today', value: 'Today', icon: 'today' },
    { label: 'This Week', value: 'This Week', icon: 'calendar' },
    { label: 'This Month', value: 'This Month', icon: 'calendar-outline' },
  ];

  const parameterOptions: { label: string; value: 'pH' | 'temp' | 'tds'; icon: string; color: string }[] = [
    { label: 'pH Levels', value: 'pH', icon: 'water', color: '#0ea5e9' },
    { label: 'Temperature', value: 'temp', icon: 'thermometer', color: '#f59e0b' },
    { label: 'TDS (Total Dissolved Solids)', value: 'tds', icon: 'analytics', color: '#22c55e' },
  ];

  const getSelectedChartOption = () => {
    return chartOptions.find(option => option.value === selectedChart);
  };

  const getSelectedTimeOption = () => {
    return timePeriodOptions.find(option => option.value === selectedTimePeriod);
  };

  const getSelectedParameterOption = () => {
    return parameterOptions.find(option => option.value === selectedParameter);
  };

  // Filter data based on selected time period
  const filterDataByTimePeriod = (data: BuoyData[], period: TimePeriod): BuoyData[] => {
    if (!data || data.length === 0) return [];
    
    console.log('🔍 Filtering data for period:', period);
    console.log('📅 Available dates in data:', [...new Set(data.map(item => item.Date))]);
    
    const now = new Date();
    const filteredData = data.filter(item => {
      const itemDate = new Date(`${item.Date} ${item.Time}`);
      
      switch (period) {
        case 'Today':
          return itemDate.toDateString() === now.toDateString();
        case 'This Week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          return itemDate >= weekStart;
        case 'This Month':
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        case 'Last 7 Days':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          return itemDate >= sevenDaysAgo;
        case 'Last 30 Days':
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return itemDate >= thirtyDaysAgo;
        case 'August 2025':
          return itemDate.getMonth() === 7 && itemDate.getFullYear() === 2025; // August is month 7 (0-indexed)
        case 'June 2025':
          return itemDate.getMonth() === 5 && itemDate.getFullYear() === 2025; // June is month 5 (0-indexed)
        case 'All Time':
        default:
          return true;
      }
    });
    
    console.log('📊 Filtered data count:', filteredData.length);
    
    return filteredData.sort((a, b) => {
      const dateA = new Date(`${a.Date} ${a.Time}`);
      const dateB = new Date(`${b.Date} ${b.Time}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Memoize processed data to prevent unnecessary recalculations
  const processedData = useMemo(() => {
    console.log('🔄 BuoyGraph: Processing data for time period:', selectedTimePeriod);
    if (!data || data.length === 0) {
      console.log('⚠️ BuoyGraph: No data to process');
      return [];
    }
    const filteredData = filterDataByTimePeriod(data, selectedTimePeriod);
    console.log('📅 BuoyGraph: Filtered data:', filteredData.length, 'records');
    const result = filteredData.slice(-50); // Limit to last 50 data points for performance
    console.log('✂️ BuoyGraph: Final processed data:', result.length, 'records');
    return result;
  }, [data, selectedTimePeriod]);
  
  // Safety check - if no data, show empty state with helpful message
  if (!processedData || processedData.length === 0) {
    return (
      <View style={styles.fullscreenContainer}>
        <View style={styles.controlPanel}>
          <View style={styles.controlRow}>
            {/* Chart Type Selector */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Chart Type</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowChartDropdown(true)}
              >
                <View style={styles.dropdownContent}>
                  <Ionicons name={getSelectedChartOption()?.icon as any} size={getResponsiveIconSize(20)} color={getSelectedChartOption()?.color} />
                  <Text style={styles.dropdownText}>{getSelectedChartOption()?.label}</Text>
                  <Ionicons name="chevron-down" size={getResponsiveIconSize(16)} color="#64748b" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Time Period Selector */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Time Period</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowTimeDropdown(true)}
              >
                <View style={styles.dropdownContent}>
                  <Ionicons name={getSelectedTimeOption()?.icon as any} size={getResponsiveIconSize(20)} color="#0ea5e9" />
                  <Text style={styles.dropdownText}>{getSelectedTimeOption()?.label}</Text>
                  <Ionicons name="chevron-down" size={getResponsiveIconSize(16)} color="#64748b" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={getResponsiveIconSize(64)} color="#94a3b8" style={styles.noDataIcon} />
          <Text style={styles.noDataText}>No data available for {selectedTimePeriod}</Text>
          <Text style={styles.noDataSubtext}>
            Try selecting "All Time", "August 2025", or "June 2025" from the time period dropdown above.
          </Text>
        </View>

        {/* Dropdown Modals */}
        <Modal
          visible={showChartDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowChartDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowChartDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <Text style={styles.modalTitle}>Select Chart Type</Text>
              {chartOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedChart(option.value);
                    setShowChartDropdown(false);
                  }}
                >
                  <Ionicons name={option.icon as any} size={20} color={option.color} />
                  <Text style={styles.dropdownOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={showTimeDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimeDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowTimeDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <Text style={styles.modalTitle}>Select Time Period</Text>
              {timePeriodOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedTimePeriod(option.value);
                    setShowTimeDropdown(false);
                  }}
                >
                  <Ionicons name={option.icon as any} size={20} color="#0ea5e9" />
                  <Text style={styles.dropdownOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // Additional safety check for data integrity
  if (!Array.isArray(processedData) || processedData.some(item => !item || typeof item !== 'object')) {
    return (
      <View style={styles.fullscreenContainer}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Invalid data format for charts</Text>
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

  // Enhanced Custom Line Chart Component with gradients and animations
  const CustomLineChart = ({ 
    data, 
    labels, 
    color, 
    title, 
    height,
    showGradient = true
  }: { 
    data: number[], 
    labels: string[], 
    color: string, 
    title: string,
    height?: number,
    showGradient?: boolean
  }) => {
    const responsiveHeight = height || Math.max(180, screenHeight * 0.25);
    const chartWidth = Math.max(screenWidth, labels.length * Math.max(50, screenWidth * 0.12));
    const chartHeight = responsiveHeight;
    const padding = Math.max(30, screenWidth * 0.08);
    const graphWidth = chartWidth - (padding * 2);
    const graphHeight = chartHeight - (padding * 2);

    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const valueRange = maxValue - minValue;

    const points = data.map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * graphWidth;
      const y = padding + graphHeight - ((value - minValue) / Math.max(valueRange, 1)) * graphHeight;
      return { x, y, value };
    });

    // Create path for line
    const pathData = points.map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    }).join(' ');

    // Create area path for gradient
    const areaPath = pathData + ` L ${points[points.length - 1].x} ${padding + graphHeight} L ${points[0].x} ${padding + graphHeight} Z`;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.chartStats}>
            <Text style={styles.chartStatText}>
              Max: {maxValue.toFixed(1)} | Min: {minValue.toFixed(1)}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
              </LinearGradient>
            </Defs>
            
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = padding + ratio * graphHeight;
              const value = minValue + (1 - ratio) * valueRange;
              return (
                <G key={index}>
                  <Line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#f3f4f6"
                    strokeWidth="0.5"
                    strokeDasharray={index === 0 || index === 4 ? "0" : "3,3"}
                  />
                  <SvgText
                    x={padding - 10}
                    y={y + 3}
                    fontSize={Math.max(8, screenWidth * 0.02)}
                    fill="#9ca3af"
                    textAnchor="end"
                    fontWeight="400"
                  >
                    {value.toFixed(1)}
                  </SvgText>
                </G>
              );
            })}

            {/* X-axis labels */}
            {labels.map((label, index) => {
              const x = padding + (index / Math.max(labels.length - 1, 1)) * graphWidth;
              return (
                <SvgText
                  key={index}
                  x={x}
                  y={chartHeight - 10}
                  fontSize={Math.max(8, screenWidth * 0.02)}
                  fill="#9ca3af"
                  textAnchor="middle"
                  fontWeight="400"
                >
                  {label}
                </SvgText>
              );
            })}

            {/* Area gradient */}
            {showGradient && (
              <Path
                d={areaPath}
                fill={`url(#gradient-${color})`}
              />
            )}

            {/* Line path */}
            <Path
              d={pathData}
              stroke={color}
              strokeWidth={Math.max(2, screenWidth * 0.005)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={Math.max(3, screenWidth * 0.008)}
                fill={color}
                stroke="#ffffff"
                strokeWidth={Math.max(1, screenWidth * 0.003)}
              />
            ))}
          </Svg>
        </ScrollView>
      </View>
    );
  };

  // Enhanced Combined Line Chart with better styling
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
    const chartWidth = Math.max(screenWidth, labels.length * Math.max(50, screenWidth * 0.12));
    const chartHeight = Math.max(220, screenHeight * 0.28);
    const padding = Math.max(30, screenWidth * 0.08);
    const graphWidth = chartWidth - (padding * 2);
    const graphHeight = chartHeight - (padding * 2);

    const allData = [...pHData, ...tempData, ...tdsData];
    const maxValue = Math.max(...allData, 1);
    const minValue = Math.min(...allData, 0);
    const valueRange = maxValue - minValue;

    const createPoints = (data: number[]) => {
      return data.map((value, index) => {
        const x = padding + (index / Math.max(data.length - 1, 1)) * graphWidth;
        const y = padding + graphHeight - ((value - minValue) / Math.max(valueRange, 1)) * graphHeight;
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

    // Calculate statistics for each parameter
    const pHMax = Math.max(...pHData);
    const pHMin = Math.min(...pHData);
    const tempMax = Math.max(...tempData);
    const tempMin = Math.min(...tempData);
    const tdsMax = Math.max(...tdsData);
    const tdsMin = Math.min(...tdsData);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.chartStats}>
            <Text style={styles.chartStatText}>
              Data Points: {pHData.length} | Period: {selectedTimePeriod}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="gradient-pH" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
              </LinearGradient>
              <LinearGradient id="gradient-temp" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
              </LinearGradient>
              <LinearGradient id="gradient-tds" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
              </LinearGradient>
            </Defs>
            
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = padding + ratio * graphHeight;
              const value = minValue + (1 - ratio) * valueRange;
              return (
                <G key={index}>
                  <Line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#f3f4f6"
                    strokeWidth="0.5"
                    strokeDasharray={index === 0 || index === 4 ? "0" : "3,3"}
                  />
                  <SvgText
                    x={padding - 10}
                    y={y + 3}
                    fontSize={Math.max(8, screenWidth * 0.02)}
                    fill="#9ca3af"
                    textAnchor="end"
                    fontWeight="400"
                  >
                    {value.toFixed(1)}
                  </SvgText>
                </G>
              );
            })}

            {/* X-axis labels */}
            {labels.map((label, index) => {
              const x = padding + (index / Math.max(labels.length - 1, 1)) * graphWidth;
              return (
                <SvgText
                  key={index}
                  x={x}
                  y={chartHeight - 10}
                  fontSize={Math.max(8, screenWidth * 0.02)}
                  fill="#9ca3af"
                  textAnchor="middle"
                  fontWeight="400"
                >
                  {label}
                </SvgText>
              );
            })}

            {/* pH Line */}
            <Path
              d={createPath(pHPoints)}
              stroke="#0ea5e9"
              strokeWidth={Math.max(2, screenWidth * 0.005)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Temperature Line */}
            <Path
              d={createPath(tempPoints)}
              stroke="#ef4444"
              strokeWidth={Math.max(2, screenWidth * 0.005)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* TDS Line */}
            <Path
              d={createPath(tdsPoints)}
              stroke="#22c55e"
              strokeWidth={Math.max(2, screenWidth * 0.005)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {pHPoints.map((point, index) => (
              <Circle
                key={`pH-${index}`}
                cx={point.x}
                cy={point.y}
                r={Math.max(2.5, screenWidth * 0.006)}
                fill="#0ea5e9"
                stroke="#ffffff"
                strokeWidth={Math.max(1, screenWidth * 0.003)}
              />
            ))}
            {tempPoints.map((point, index) => (
              <Circle
                key={`temp-${index}`}
                cx={point.x}
                cy={point.y}
                r={Math.max(2.5, screenWidth * 0.006)}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth={Math.max(1, screenWidth * 0.003)}
              />
            ))}
            {tdsPoints.map((point, index) => (
              <Circle
                key={`tds-${index}`}
                cx={point.x}
                cy={point.y}
                r={Math.max(2.5, screenWidth * 0.006)}
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth={Math.max(1, screenWidth * 0.003)}
              />
            ))}
          </Svg>
        </ScrollView>

        {/* Enhanced Legend with Statistics */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0ea5e9' }]} />
            <Text style={styles.legendText}>pH ({pHMin.toFixed(1)}-{pHMax.toFixed(1)})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Temp ({tempMin.toFixed(1)}-{tempMax.toFixed(1)}°C)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>TDS ({tdsMin.toFixed(1)}-{tdsMax.toFixed(1)}ppm)</Text>
          </View>
        </View>
      </View>
    );
  };

  // Monthly Comparison Pie Chart Component
  const MonthlyBarChart = ({ data, selectedParam }: { data: BuoyData[]; selectedParam: 'pH' | 'temp' | 'tds' }) => {
    const monthlyData = useMemo(() => {
      const grouped = data.reduce((acc, item) => {
        try {
          const date = new Date(`${item.Date} ${item.Time}`);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (!acc[monthKey]) {
            acc[monthKey] = {
              month: monthKey,
              pH: [],
              temp: [],
              tds: [],
              count: 0
            };
          }
          
          const pH = parseFloat(item.pH);
          const temp = parseFloat(item['Temp (°C)']);
          const tds = parseFloat(item['TDS (ppm)']);
          
          if (!isNaN(pH)) acc[monthKey].pH.push(pH);
          if (!isNaN(temp)) acc[monthKey].temp.push(temp);
          if (!isNaN(tds)) acc[monthKey].tds.push(tds);
          acc[monthKey].count++;
          
        } catch (error) {
          console.warn('Error processing data for bar chart:', error);
        }
        return acc;
      }, {} as Record<string, { month: string; pH: number[]; temp: number[]; tds: number[]; count: number }>);

      return Object.values(grouped).map(month => ({
        month: month.month,
        avgPH: month.pH.length > 0 ? month.pH.reduce((a, b) => a + b, 0) / month.pH.length : 0,
        avgTemp: month.temp.length > 0 ? month.temp.reduce((a, b) => a + b, 0) / month.temp.length : 0,
        avgTDS: month.tds.length > 0 ? month.tds.reduce((a, b) => a + b, 0) / month.tds.length : 0,
        count: month.count
      })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    }, [data]);

    if (monthlyData.length === 0) return null;

    const maxPH = Math.max(...monthlyData.map(d => d.avgPH));
    const maxTemp = Math.max(...monthlyData.map(d => d.avgTemp));
    const maxTDS = Math.max(...monthlyData.map(d => d.avgTDS));

    const getQualityColor = (value: number, type: 'pH' | 'temp' | 'tds') => {
      if (type === 'pH') {
        if (value >= 6.5 && value <= 8.5) return '#22c55e'; // Good
        if (value >= 6.0 && value <= 9.0) return '#f59e0b'; // Fair
        return '#ef4444'; // Poor
      } else if (type === 'temp') {
        if (value >= 20 && value <= 30) return '#22c55e'; // Good
        if (value >= 15 && value <= 35) return '#f59e0b'; // Fair
        return '#ef4444'; // Poor
      } else if (type === 'tds') {
        if (value <= 500) return '#22c55e'; // Good
        if (value <= 1000) return '#f59e0b'; // Fair
        return '#ef4444'; // Poor
      }
      return '#6b7280';
    };

    const getQualityLabel = (value: number, type: 'pH' | 'temp' | 'tds') => {
      if (type === 'pH') {
        if (value >= 6.5 && value <= 8.5) return 'Good';
        if (value >= 6.0 && value <= 9.0) return 'Fair';
        return 'Poor';
      } else if (type === 'temp') {
        if (value >= 20 && value <= 30) return 'Good';
        if (value >= 15 && value <= 35) return 'Fair';
        return 'Poor';
      } else if (type === 'tds') {
        if (value <= 500) return 'Good';
        if (value <= 1000) return 'Fair';
        return 'Poor';
      }
      return 'Unknown';
    };

    const getParameterData = (month: any) => {
      switch (selectedParam) {
        case 'pH':
          return {
            value: month.avgPH,
            maxValue: maxPH,
            label: 'pH',
            unit: '',
            color: getQualityColor(month.avgPH, 'pH'),
            quality: getQualityLabel(month.avgPH, 'pH'),
            formattedValue: month.avgPH.toFixed(1)
          };
        case 'temp':
          return {
            value: month.avgTemp,
            maxValue: maxTemp,
            label: 'Temp',
            unit: '°C',
            color: getQualityColor(month.avgTemp, 'temp'),
            quality: getQualityLabel(month.avgTemp, 'temp'),
            formattedValue: month.avgTemp.toFixed(1)
          };
        case 'tds':
          return {
            value: month.avgTDS,
            maxValue: maxTDS,
            label: 'TDS',
            unit: ' ppm',
            color: getQualityColor(month.avgTDS, 'tds'),
            quality: getQualityLabel(month.avgTDS, 'tds'),
            formattedValue: month.avgTDS.toFixed(0)
          };
        default:
          return {
            value: month.avgPH,
            maxValue: maxPH,
            label: 'pH',
            unit: '',
            color: getQualityColor(month.avgPH, 'pH'),
            quality: getQualityLabel(month.avgPH, 'pH'),
            formattedValue: month.avgPH.toFixed(1)
          };
      }
    };

    const selectedOption = parameterOptions.find(opt => opt.value === selectedParam);

    return (
      <View style={styles.barChartContainer}>
        <Text style={styles.barChartTitle}>Monthly {selectedOption?.label} Comparison</Text>
        <Text style={styles.barChartSubtitle}>Average values and quality ratings by month</Text>
        
        {/* Parameter Selection Dropdown */}
        <View style={styles.barChartDropdownContainer}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Parameter</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowParameterDropdown(true)}
            >
              <View style={styles.dropdownContent}>
                <Ionicons 
                  name={getSelectedParameterOption()?.icon as any} 
                  size={getResponsiveIconSize(18)} 
                  color={getSelectedParameterOption()?.color || "#0ea5e9"} 
                />
                <Text style={styles.dropdownText}>{getSelectedParameterOption()?.label}</Text>
              </View>
              <Ionicons name="chevron-down" size={getResponsiveIconSize(16)} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barChartScroll}>
          <View style={styles.barChartContent}>
            {monthlyData.map((month, index) => {
              const paramData = getParameterData(month);
              return (
                <View key={month.month} style={styles.barChartMonth}>
                  <Text style={styles.barChartMonthLabel}>{month.month}</Text>
                  
                  {/* Single Parameter Bar */}
                  <View style={styles.barChartBarContainer}>
                    <Text style={styles.barChartBarLabel}>{paramData.label}</Text>
                    <View style={styles.barChartBar}>
                      <View 
                        style={[
                          styles.barChartBarFill,
                          { 
                            height: `${Math.max(5, (paramData.value / paramData.maxValue) * 100)}%`,
                            backgroundColor: paramData.color
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.barChartBarValue}>{paramData.formattedValue}{paramData.unit}</Text>
                    <Text style={[styles.barChartQuality, { color: paramData.color }]}>
                      {paramData.quality}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Legend */}
        <View style={styles.barChartLegend}>
          <View style={styles.barChartLegendItem}>
            <View style={[styles.barChartLegendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.barChartLegendText}>Good Quality</Text>
          </View>
          <View style={styles.barChartLegendItem}>
            <View style={[styles.barChartLegendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.barChartLegendText}>Fair Quality</Text>
          </View>
          <View style={styles.barChartLegendItem}>
            <View style={[styles.barChartLegendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.barChartLegendText}>Poor Quality</Text>
          </View>
        </View>
      </View>
    );
  };

  const MonthlyPieChart = ({ data }: { data: BuoyData[] }) => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    
    // Group data by month
    const monthlyData = useMemo(() => {
      const monthGroups: { [key: string]: BuoyData[] } = {};
      
      data.forEach(item => {
        const date = new Date(`${item.Date} ${item.Time}`);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(item);
      });

      // Calculate averages for each month
      return Object.entries(monthGroups).map(([monthKey, items]) => {
        const monthName = new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const avgpH = items.reduce((sum, item) => sum + parseFloat(item.pH || '0'), 0) / items.length;
        const avgTemp = items.reduce((sum, item) => sum + parseFloat(item['Temp (°C)'] || '0'), 0) / items.length;
        const avgTDS = items.reduce((sum, item) => sum + parseFloat(item['TDS (ppm)'] || '0'), 0) / items.length;
        
        return {
          month: monthName,
          monthKey,
          count: items.length,
          avgpH: isNaN(avgpH) ? 0 : avgpH,
          avgTemp: isNaN(avgTemp) ? 0 : avgTemp,
          avgTDS: isNaN(avgTDS) ? 0 : avgTDS,
        };
      }).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }, [data]);

    if (monthlyData.length === 0) return null;

    const pieSize = Math.min(screenWidth * 0.6, 200);
    const centerX = pieSize / 2;
    const centerY = pieSize / 2;
    const radius = pieSize * 0.35;

    // Create pie slices for data count comparison
    const totalCount = monthlyData.reduce((sum, month) => sum + month.count, 0);
    let currentAngle = 0;

    const pieSlices = monthlyData.map((month, index) => {
      const percentage = month.count / totalCount;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      // Convert angles to radians
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);

      // Calculate path for pie slice
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);

      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      // Colors for different months
      const colors = ['#0ea5e9', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
      const color = colors[index % colors.length];

      return {
        pathData,
        color,
        month: month.month,
        count: month.count,
        percentage: (percentage * 100).toFixed(1),
        avgpH: month.avgpH.toFixed(1),
        avgTemp: month.avgTemp.toFixed(1),
        avgTDS: month.avgTDS.toFixed(1),
      };
    });

    return (
      <View style={styles.pieChartContainer}>
        <Text style={styles.pieChartTitle}>Monthly Data Comparison</Text>
        <View style={styles.pieChartContent}>
          <View style={styles.pieChartSvg}>
            <Svg width={pieSize} height={pieSize}>
              {pieSlices.map((slice, index) => (
                <SvgPath
                  key={index}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ))}
            </Svg>
          </View>
          <View style={styles.pieChartLegend}>
            {pieSlices.map((slice, index) => (
              <View key={index} style={styles.pieLegendItem}>
                <View style={[styles.pieLegendDot, { backgroundColor: slice.color }]} />
                <View style={styles.pieLegendText}>
                  <Text style={styles.pieLegendMonth}>{slice.month}</Text>
                  <Text style={styles.pieLegendDetails}>
                    {slice.percentage}%
                  </Text>
                </View>
              </View>
            ))}
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
              height={Math.max(180, screenHeight * 0.25)}
            />
          );
        case 'Temperature':
          return (
            <CustomLineChart 
              data={tempData} 
              labels={labels} 
              color="#ef4444" 
              title="Temperature (°C)" 
              height={Math.max(180, screenHeight * 0.25)}
            />
          );
        case 'TDS':
          return (
            <CustomLineChart 
              data={tdsData} 
              labels={labels} 
              color="#22c55e" 
              title="TDS (ppm)" 
              height={Math.max(180, screenHeight * 0.25)}
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

  return (
    <ScrollView style={styles.fullscreenContainer} showsVerticalScrollIndicator={false}>
      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <View style={styles.controlRow}>
          {/* Chart Type Selector */}
      <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Chart Type</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
              onPress={() => setShowChartDropdown(true)}
        >
          <View style={styles.dropdownContent}>
            <Ionicons 
                  name={getSelectedChartOption()?.icon as any} 
                  size={getResponsiveIconSize(18)} 
                  color={getSelectedChartOption()?.color || "#0ea5e9"} 
                />
                <Text style={styles.dropdownText}>{getSelectedChartOption()?.label}</Text>
              </View>
              <Ionicons name="chevron-down" size={getResponsiveIconSize(16)} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Time Period Selector */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Time Period</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowTimeDropdown(true)}
            >
              <View style={styles.dropdownContent}>
                <Ionicons 
                  name={getSelectedTimeOption()?.icon as any} 
                  size={getResponsiveIconSize(18)} 
              color="#0ea5e9" 
            />
                <Text style={styles.dropdownText}>{getSelectedTimeOption()?.label}</Text>
          </View>
              <Ionicons name="chevron-down" size={getResponsiveIconSize(16)} color="#64748b" />
        </TouchableOpacity>
          </View>
        </View>

        {/* Data Summary */}
        <View style={styles.dataSummary}>
          <View style={styles.summaryItem}>
            <Ionicons name="analytics" size={getResponsiveIconSize(16)} color="#0ea5e9" />
            <Text style={styles.summaryText}>{processedData.length} data points</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={getResponsiveIconSize(16)} color="#22c55e" />
            <Text style={styles.summaryText}>{selectedTimePeriod}</Text>
          </View>
        </View>
      </View>

      {/* Chart Section */}
      <View style={styles.chartSection}>
        {renderChart()}
      </View>

      {/* Monthly Comparison Pie Chart */}
      <MonthlyPieChart data={data} />

      {/* Monthly Quality Comparison Bar Chart */}
      <MonthlyBarChart data={data} selectedParam={selectedParameter} />

      {/* Chart Type Dropdown Modal */}
      <Modal
        visible={showChartDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChartDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChartDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.modalTitle}>Select Chart Type</Text>
            {chartOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  selectedChart === option.value && styles.selectedOption
                ]}
                onPress={() => {
                  setSelectedChart(option.value);
                  setShowChartDropdown(false);
                }}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={getResponsiveIconSize(20)} 
                  color={selectedChart === option.value ? '#ffffff' : option.color} 
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

      {/* Time Period Dropdown Modal */}
      <Modal
        visible={showTimeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimeDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.modalTitle}>Select Time Period</Text>
            {timePeriodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  selectedTimePeriod === option.value && styles.selectedOption
                ]}
                onPress={() => {
                  setSelectedTimePeriod(option.value);
                  setShowTimeDropdown(false);
                }}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={getResponsiveIconSize(20)} 
                  color={selectedTimePeriod === option.value ? '#ffffff' : '#0ea5e9'} 
                />
                <Text style={[
                  styles.dropdownOptionText,
                  selectedTimePeriod === option.value && styles.selectedOptionText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
        </Modal>

        {/* Parameter Dropdown Modal */}
        <Modal
          visible={showParameterDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowParameterDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowParameterDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <Text style={styles.modalTitle}>Select Parameter</Text>
              {parameterOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    selectedParameter === option.value && styles.selectedOption
                  ]}
                  onPress={() => {
                    setSelectedParameter(option.value);
                    setShowParameterDropdown(false);
                  }}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={getResponsiveIconSize(20)} 
                    color={selectedParameter === option.value ? "#ffffff" : option.color} 
                  />
                  <Text style={[
                    styles.dropdownOptionText,
                    selectedParameter === option.value && styles.selectedOptionText
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
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  controlPanel: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Math.max(12, Dimensions.get('window').width * 0.03),
    paddingVertical: Math.max(8, Dimensions.get('window').height * 0.01),
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Math.max(8, Dimensions.get('window').height * 0.01),
  },
  parameterSelectorContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Math.max(12, Dimensions.get('window').width * 0.03),
    paddingVertical: Math.max(8, Dimensions.get('window').height * 0.01),
  },
  dropdownContainer: {
    flex: 1,
    marginHorizontal: Math.max(4, Dimensions.get('window').width * 0.01),
  },
  dropdownLabel: {
    fontSize: Math.max(10, Dimensions.get('window').width * 0.025),
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: Math.max(4, Dimensions.get('window').height * 0.005),
  },
  dropdownButton: {
    backgroundColor: '#f9fafb',
    borderRadius: Math.max(6, Dimensions.get('window').width * 0.015),
    padding: Math.max(8, Dimensions.get('window').width * 0.02),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderColor: '#d1d5db',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownText: {
    fontSize: Math.max(11, Dimensions.get('window').width * 0.028),
    fontWeight: '500',
    color: '#374151',
    marginLeft: Math.max(6, Dimensions.get('window').width * 0.015),
    flex: 1,
  },
  dataSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Math.max(8, Dimensions.get('window').height * 0.01),
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: Math.max(9, Dimensions.get('window').width * 0.022),
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: Math.max(4, Dimensions.get('window').width * 0.01),
  },
  chartSection: {
    flex: 1,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Math.max(40, Dimensions.get('window').height * 0.05),
    backgroundColor: '#ffffff',
  },
  noDataIcon: {
    marginBottom: Math.max(12, Dimensions.get('window').height * 0.015),
  },
  noDataText: {
    fontSize: Math.max(16, Dimensions.get('window').width * 0.04),
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: Math.max(6, Dimensions.get('window').height * 0.008),
  },
  noDataSubtext: {
    fontSize: Math.max(12, Dimensions.get('window').width * 0.03),
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: Math.max(16, Dimensions.get('window').width * 0.04),
    paddingHorizontal: Math.max(16, Dimensions.get('window').width * 0.04),
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    padding: Math.max(8, Dimensions.get('window').width * 0.02),
    flex: 1,
  },
  chartHeader: {
    marginBottom: Math.max(12, Dimensions.get('window').height * 0.015),
  },
  chartTitle: {
    fontSize: Math.max(16, Dimensions.get('window').width * 0.04),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: Math.max(4, Dimensions.get('window').height * 0.005),
  },
  chartStats: {
    alignItems: 'center',
  },
  chartStatText: {
    fontSize: Math.max(10, Dimensions.get('window').width * 0.025),
    color: '#6b7280',
    fontWeight: '400',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Math.max(12, Dimensions.get('window').height * 0.015),
    paddingTop: Math.max(12, Dimensions.get('window').height * 0.015),
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: Math.max(8, Dimensions.get('window').width * 0.02),
    height: Math.max(8, Dimensions.get('window').width * 0.02),
    borderRadius: Math.max(4, Dimensions.get('window').width * 0.01),
    marginRight: Math.max(4, Dimensions.get('window').width * 0.01),
  },
  legendText: {
    fontSize: Math.max(9, Dimensions.get('window').width * 0.022),
    fontWeight: '500',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#ffffff',
    borderRadius: Math.max(12, Dimensions.get('window').width * 0.03),
    padding: Math.max(12, Dimensions.get('window').width * 0.03),
    width: '80%',
    maxWidth: Math.min(300, Dimensions.get('window').width * 0.8),
  },
  modalTitle: {
    fontSize: Math.max(14, Dimensions.get('window').width * 0.035),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: Math.max(12, Dimensions.get('window').height * 0.015),
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Math.max(10, Dimensions.get('window').width * 0.025),
    borderRadius: Math.max(6, Dimensions.get('window').width * 0.015),
    marginVertical: Math.max(2, Dimensions.get('window').height * 0.002),
  },
  selectedOption: {
    backgroundColor: '#0ea5e9',
  },
  dropdownOptionText: {
    fontSize: Math.max(12, Dimensions.get('window').width * 0.03),
    fontWeight: '500',
    color: '#374151',
    marginLeft: Math.max(8, Dimensions.get('window').width * 0.02),
  },
  selectedOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  // Pie Chart Styles
  pieChartContainer: {
    backgroundColor: '#ffffff',
    padding: Math.max(12, Dimensions.get('window').width * 0.03),
    marginTop: Math.max(8, Dimensions.get('window').height * 0.01),
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  pieChartTitle: {
    fontSize: Math.max(14, Dimensions.get('window').width * 0.035),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: Math.max(12, Dimensions.get('window').height * 0.015),
  },
  pieChartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pieChartSvg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartLegend: {
    flex: 1,
    marginLeft: Math.max(12, Dimensions.get('window').width * 0.03),
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Math.max(8, Dimensions.get('window').height * 0.01),
  },
  pieLegendDot: {
    width: Math.max(12, Dimensions.get('window').width * 0.03),
    height: Math.max(12, Dimensions.get('window').width * 0.03),
    borderRadius: Math.max(6, Dimensions.get('window').width * 0.015),
    marginRight: Math.max(8, Dimensions.get('window').width * 0.02),
    marginTop: Math.max(2, Dimensions.get('window').height * 0.002),
  },
  pieLegendText: {
    flex: 1,
  },
  pieLegendMonth: {
    fontSize: Math.max(12, Dimensions.get('window').width * 0.03),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: Math.max(2, Dimensions.get('window').height * 0.002),
  },
  pieLegendDetails: {
    fontSize: Math.max(10, Dimensions.get('window').width * 0.025),
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: Math.max(2, Dimensions.get('window').height * 0.002),
  },
  pieLegendAverages: {
    fontSize: Math.max(9, Dimensions.get('window').width * 0.022),
    fontWeight: '400',
    color: '#9ca3af',
    lineHeight: Math.max(12, Dimensions.get('window').width * 0.03),
  },
  // Bar Chart Styles
  barChartContainer: {
    backgroundColor: '#ffffff',
    padding: Math.max(12, Dimensions.get('window').width * 0.03),
    marginTop: Math.max(8, Dimensions.get('window').height * 0.01),
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  barChartTitle: {
    fontSize: Math.max(14, Dimensions.get('window').width * 0.035),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: Math.max(4, Dimensions.get('window').height * 0.005),
  },
  barChartSubtitle: {
    fontSize: Math.max(10, Dimensions.get('window').width * 0.025),
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: Math.max(12, Dimensions.get('window').height * 0.015),
  },
  barChartDropdownContainer: {
    alignItems: 'center',
    marginBottom: Math.max(12, Dimensions.get('window').height * 0.015),
  },
  barChartScroll: {
    marginBottom: Math.max(12, Dimensions.get('window').height * 0.015),
  },
  barChartContent: {
    flexDirection: 'row',
    paddingHorizontal: Math.max(8, Dimensions.get('window').width * 0.02),
  },
  barChartMonth: {
    alignItems: 'center',
    marginHorizontal: Math.max(8, Dimensions.get('window').width * 0.02),
    minWidth: Math.max(60, Dimensions.get('window').width * 0.15),
  },
  barChartMonthLabel: {
    fontSize: Math.max(10, Dimensions.get('window').width * 0.025),
    fontWeight: '600',
    color: '#374151',
    marginBottom: Math.max(8, Dimensions.get('window').height * 0.01),
  },
  barChartBarContainer: {
    alignItems: 'center',
    marginBottom: Math.max(8, Dimensions.get('window').height * 0.01),
  },
  barChartBarLabel: {
    fontSize: Math.max(8, Dimensions.get('window').width * 0.02),
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: Math.max(4, Dimensions.get('window').height * 0.005),
  },
  barChartBar: {
    width: Math.max(20, Dimensions.get('window').width * 0.05),
    height: Math.max(60, Dimensions.get('window').height * 0.08),
    backgroundColor: '#f3f4f6',
    borderRadius: Math.max(2, Dimensions.get('window').width * 0.005),
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barChartBarFill: {
    width: '100%',
    borderRadius: Math.max(2, Dimensions.get('window').width * 0.005),
    minHeight: Math.max(2, Dimensions.get('window').height * 0.002),
  },
  barChartBarValue: {
    fontSize: Math.max(8, Dimensions.get('window').width * 0.02),
    fontWeight: '600',
    color: '#1f2937',
    marginTop: Math.max(2, Dimensions.get('window').height * 0.002),
    textAlign: 'center',
  },
  barChartQuality: {
    fontSize: Math.max(7, Dimensions.get('window').width * 0.018),
    fontWeight: '500',
    marginTop: Math.max(1, Dimensions.get('window').height * 0.001),
    textAlign: 'center',
  },
  barChartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Math.max(12, Dimensions.get('window').width * 0.03),
  },
  barChartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Math.max(4, Dimensions.get('window').width * 0.01),
  },
  barChartLegendDot: {
    width: Math.max(8, Dimensions.get('window').width * 0.02),
    height: Math.max(8, Dimensions.get('window').width * 0.02),
    borderRadius: Math.max(4, Dimensions.get('window').width * 0.01),
  },
  barChartLegendText: {
    fontSize: Math.max(9, Dimensions.get('window').width * 0.022),
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default BuoyGraph;
