import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BuoyData } from '../services/buoyService';
import BuoyEchoAnimation from './BuoyEchoAnimation';

interface BuoyCardProps {
  data: BuoyData;
}

const BuoyCard: React.FC<BuoyCardProps> = ({ data }) => {
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

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
          <View style={styles.buoyImageContainer}>
            <BuoyEchoAnimation 
              size={120}
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
          </View>
          <Text style={styles.buoyLabel}>{data.Buoy}</Text>
          <Text style={styles.buoySubtitle}>Active Sensor</Text>
        </View>
      </View>

      {/* Sensor Data Grid */}
      <View style={styles.sensorGrid}>
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={[styles.sensorIcon, { backgroundColor: '#0ea5e9' }]}>
              <Text style={styles.sensorIconText}>pH</Text>
            </View>
            <Text style={styles.sensorLabel}>pH Level</Text>
          </View>
          <Text style={styles.sensorValue}>{data.pH}</Text>
          <Text style={styles.sensorUnit}>pH Scale</Text>
        </View>

        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={[styles.sensorIcon, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.sensorIconText}>°C</Text>
            </View>
            <Text style={styles.sensorLabel}>Temperature</Text>
          </View>
          <Text style={styles.sensorValue}>{data['Temp (°C)']}</Text>
          <Text style={styles.sensorUnit}>Celsius</Text>
        </View>

        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={[styles.sensorIcon, { backgroundColor: '#22c55e' }]}>
              <Text style={styles.sensorIconText}>TDS</Text>
            </View>
            <Text style={styles.sensorLabel}>TDS</Text>
          </View>
          <Text style={styles.sensorValue}>{data['TDS (ppm)']}</Text>
          <Text style={styles.sensorUnit}>ppm</Text>
        </View>
      </View>

      {/* Location Info */}
      <View style={styles.locationSection}>
        <Text style={styles.locationTitle}>Location</Text>
        <View style={styles.locationData}>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>Latitude</Text>
            <Text style={styles.locationValue}>{data.Latitude}</Text>
          </View>
          <View style={styles.locationItem}>
            <Text style={styles.locationLabel}>Longitude</Text>
            <Text style={styles.locationValue}>{data.Longitude}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 32,
  },
  buoyContainer: {
    alignItems: 'center',
  },
  buoyImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    width: 70,
    height: 70,
  },
  buoyLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  buoySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  sensorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sensorCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  sensorHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sensorIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  sensorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  sensorUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
  },
  locationSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  locationData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationItem: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
});

export default BuoyCard;
