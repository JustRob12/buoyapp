import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BuoyData } from '../services/buoyService';
import BuoyEchoAnimation from './BuoyEchoAnimation';

interface BuoyCardProps {
  data: BuoyData;
}

const BuoyCard: React.FC<BuoyCardProps> = ({ data }) => {
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  const handleBuoyImagePress = () => {
    // Navigate to Map tab and pass the latest location data
    navigation.navigate('Map' as never, { 
      latestLocation: {
        latitude: parseFloat(data.Latitude) || 0,
        longitude: parseFloat(data.Longitude) || 0,
        buoy: data.Buoy,
      }
    } as never);
  };

  // Helper function to convert AM to PM for display (fixing database time error)
  const convertAMtoPM = (timeString: string): string => {
    // If time ends with " AM", replace it with " PM"
    if (timeString.trim().endsWith(' AM')) {
      return timeString.replace(' AM', ' PM');
    }
    return timeString;
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date} ${time}`);
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return {
      date: dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: convertAMtoPM(formattedTime)
    };
  };

  const getBuoyImage = (buoyName: string) => {
    const cleanBuoyName = buoyName.trim();
    const buoyNumber = cleanBuoyName.replace('Buoy ', '').trim();

    switch (buoyNumber) {
      case '1':
        return require('../images/buoy1.png');
      case '2':
        return require('../images/buoy2.png');
      case '3':
        return require('../images/buoy3.png');
      case '4':
        return require('../images/buoy4.png');
      case '5':
        return require('../images/buoy5.png');
      default:
        return require('../images/buoy1.png');
    }
  };

  const { date, time } = formatDateTime(data.Date, data.Time);

  // Format TDS to remove .00
  const formatTDS = (tds: string | number) => {
    const tdsValue = typeof tds === 'string' ? parseFloat(tds) : tds;
    if (isNaN(tdsValue)) return tds;
    // Remove .00 if it's a whole number
    return tdsValue % 1 === 0 ? tdsValue.toString() : tdsValue.toFixed(2);
  };

  // Format pH and Temperature to 2 decimal places
  const formatValue = (value: string | number, decimals: number = 2) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    return numValue.toFixed(decimals);
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live Data</Text>
        </View>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.timeText}>{time}</Text>
        </View>
      </View>

      {/* Main Buoy Section */}
      <View style={styles.buoySection}>
        <View style={styles.buoyContainer}>
          <TouchableOpacity 
            style={styles.buoyImageContainer}
            onPress={handleBuoyImagePress}
            activeOpacity={0.8}
          >
            <BuoyEchoAnimation 
              size={100}
              color="#0ea5e9"
              duration={2000}
              delay={0}
              isActive={isScreenFocused}
            />
            <Image
              source={getBuoyImage(data.Buoy)}
              style={styles.buoyImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.buoyLabel}>{data.Buoy}</Text>
          <Text style={styles.buoySubtitle}>Active Sensor</Text>
          {/* Location below image */}
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              {data.Latitude}, {data.Longitude}
            </Text>
          </View>
        </View>
      </View>

      {/* Sensor Data Grid */}
      <View style={styles.sensorGrid}>
        <View style={styles.sensorCard}>
          <View style={[styles.sensorIconContainer, { backgroundColor: '#f0f9ff' }]}>
            <View style={[styles.sensorIcon, { backgroundColor: '#0ea5e9' }]}>
              <Text style={styles.sensorIconText}>pH</Text>
            </View>
          </View>
          <Text style={styles.sensorValue}>{formatValue(data.pH)}</Text>
          <Text style={styles.sensorLabel}>pH Level</Text>
          <Text style={styles.sensorUnit}>pH Scale</Text>
        </View>

        <View style={styles.sensorCard}>
          <View style={[styles.sensorIconContainer, { backgroundColor: '#fef2f2' }]}>
            <View style={[styles.sensorIcon, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.sensorIconText}>°C</Text>
            </View>
          </View>
          <Text style={styles.sensorValue}>{formatValue(data['Temp (°C)'])}</Text>
          <Text style={styles.sensorLabel}>Temperature</Text>
          <Text style={styles.sensorUnit}>Celsius</Text>
        </View>

        <View style={styles.sensorCard}>
          <View style={[styles.sensorIconContainer, { backgroundColor: '#f0fdf4' }]}>
            <View style={[styles.sensorIcon, { backgroundColor: '#22c55e' }]}>
              <Text style={styles.sensorIconText}>TDS</Text>
            </View>
          </View>
          <Text style={styles.sensorValue}>{formatTDS(data['TDS (ppm)'])}</Text>
          <Text style={styles.sensorLabel}>TDS</Text>
          <Text style={styles.sensorUnit}>ppm</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  buoySection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  buoyContainer: {
    alignItems: 'center',
  },
  buoyImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  buoyImage: {
    width: 60,
    height: 60,
  },
  buoyLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  buoySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  locationInfo: {
    marginTop: 4,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
  },
  sensorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  sensorCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
  },
  sensorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sensorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  sensorValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  sensorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2,
  },
  sensorUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default BuoyCard;
