import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { getLatestBuoyDataForGraph, BuoyData } from '../services/buoyService';

interface BuoyMapProps {
  data?: BuoyData[];
}

const BuoyMap: React.FC<BuoyMapProps> = ({ data: propData }) => {
  const [mapData, setMapData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        let buoyData: BuoyData[];
        
        if (propData) {
          buoyData = propData;
        } else {
          // Fetch data if not provided as prop
          buoyData = await getLatestBuoyDataForGraph(20);
        }
        
        setMapData(buoyData);
      } catch (err) {
        setError('Failed to fetch buoy data for map.');
        console.error('Error fetching map data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propData]);

  // Convert buoy data to map coordinates
  const getMapCoordinates = () => {
    return mapData
      .map(item => ({
        id: item.ID,
        buoy: item.Buoy,
        latitude: parseFloat(item.Latitude) || 0,
        longitude: parseFloat(item.Longitude) || 0,
        pH: item.pH,
        temperature: item['Temp (°C)'],
        tds: item['TDS (ppm)'],
        date: item.Date,
        time: item.Time,
      }))
      .filter(coord => coord.latitude !== 0 && coord.longitude !== 0);
  };

  const coordinates = getMapCoordinates();

  // Calculate center of map
  const getMapCenter = () => {
    if (coordinates.length === 0) {
      return { latitude: 12.8797, longitude: 121.7740 }; // Default to Philippines center
    }

    const avgLat = coordinates.reduce((sum, coord) => sum + coord.latitude, 0) / coordinates.length;
    const avgLng = coordinates.reduce((sum, coord) => sum + coord.longitude, 0) / coordinates.length;

    return { latitude: avgLat, longitude: avgLng };
  };

  // Get buoy color based on buoy number
  const getBuoyColor = (buoyName: string) => {
    const buoyNumber = buoyName.replace('Buoy ', '').trim();
    switch (buoyNumber) {
      case '1': return '#0ea5e9'; // Sky blue
      case '2': return '#ef4444'; // Red
      case '3': return '#22c55e'; // Green
      case '4': return '#f59e0b'; // Orange
      case '5': return '#8b5cf6'; // Purple
      default: return '#64748b'; // Gray
    }
  };

  // Get buoy icon based on buoy number
  const getBuoyIcon = (buoyName: string) => {
    const buoyNumber = buoyName.replace('Buoy ', '').trim();
    switch (buoyNumber) {
      case '1': return 'location';
      case '2': return 'location';
      case '3': return 'location';
      case '4': return 'location';
      case '5': return 'location';
      default: return 'location';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (coordinates.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Ionicons name="map" size={48} color="#64748b" />
        <Text style={styles.noDataText}>No location data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          ...getMapCenter(),
          latitudeDelta: 8.0, // Wider view to show more of Philippines
          longitudeDelta: 8.0, // Wider view to show more of Philippines
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {/* Buoy Markers */}
        {coordinates.map((coord, index) => (
          <Marker
            key={coord.id}
            coordinate={{
              latitude: coord.latitude,
              longitude: coord.longitude,
            }}
            title={coord.buoy}
            description={`pH: ${coord.pH} | Temp: ${coord.temperature}°C | TDS: ${coord.tds} ppm`}
            pinColor={getBuoyColor(coord.buoy)}
          >
            <View style={[styles.markerContainer, { backgroundColor: getBuoyColor(coord.buoy) }]}>
              <Ionicons name={getBuoyIcon(coord.buoy) as any} size={20} color="#ffffff" />
            </View>
          </Marker>
        ))}

        {/* Connect buoys with lines */}
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates.map(coord => ({
              latitude: coord.latitude,
              longitude: coord.longitude,
            }))}
            strokeColor="#0ea5e9"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

     
      {/* <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Buoy Locations</Text>
        <View style={styles.legendItems}>
          {coordinates.slice(0, 5).map((coord) => (
            <View key={coord.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getBuoyColor(coord.buoy) }]} />
              <Text style={styles.legendText}>{coord.buoy}</Text>
            </View>
          ))}
        </View>
        {coordinates.length > 5 && (
          <Text style={styles.legendNote}>+{coordinates.length - 5} more buoys</Text>
        )}
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  legendContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 200,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  legendItems: {
    gap: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  legendNote: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
});

export default BuoyMap;
