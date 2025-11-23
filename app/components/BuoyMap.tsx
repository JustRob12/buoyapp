import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { getLatestBuoyDataForGraph, BuoyData } from '../services/buoyService';

interface BuoyMapProps {
  data?: BuoyData[];
  latestLocation?: {
    latitude: number;
    longitude: number;
    buoy: string;
  };
}

const BuoyMap: React.FC<BuoyMapProps> = ({ data: propData, latestLocation }) => {
  const [mapData, setMapData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const webViewRef = useRef<WebView>(null);

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

  // Load HTML content
  useEffect(() => {
    const loadHtml = () => {
      try {
        // Embed the HTML directly with Leaflet
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>AquaNet Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body, html {
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        #map {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        let map;
        let markers = [];
        let distanceMarkers = [];
        let polyline = null;
        let latestLocation = null;
        let hasAutoZoomed = false;
        let userHasInteracted = false;

        // Initialize map
        function initMap() {
            const defaultCenter = [12.8797, 121.7740];
            const defaultZoom = 8;

            map = L.map('map').setView(defaultCenter, defaultZoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
        }

        function getBuoyColor(buoyName) {
            const buoyNumber = buoyName.replace('Buoy ', '').trim();
            const colors = {
                '1': '#0ea5e9',
                '2': '#ef4444',
                '3': '#22c55e',
                '4': '#f59e0b',
                '5': '#8b5cf6'
            };
            return colors[buoyNumber] || '#64748b';
        }

        function createMarkerIcon(color, isLatest) {
            const opacity = isLatest ? 1.0 : 0.5;
            return L.divIcon({
                className: 'custom-marker',
                html: '<div style="width: 40px; height: 40px; border-radius: 50%; background-color: ' + color + '; border: 3px solid white; display: flex; align-items: center; justify-content: center; opacity: ' + opacity + '; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="width: 20px; height: 20px; border-radius: 50%; background-color: white;"></div></div>',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
        }

        function updateMap(coords, latestLoc, forceZoom) {
            if (!map) {
                console.error('Map not initialized yet');
                return;
            }

            // Clear existing markers
            markers.forEach(marker => {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            markers = [];
            
            // Clear existing distance markers
            distanceMarkers.forEach(marker => {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            distanceMarkers = [];
            
            if (polyline && map.hasLayer(polyline)) {
                map.removeLayer(polyline);
                polyline = null;
            }

            if (!coords || coords.length === 0) {
                console.log('No coordinates to display');
                return;
            }

            const previousLatestLocation = latestLocation;
            latestLocation = latestLoc;
            console.log('Updating map with', coords.length, 'markers');

            // Add markers
            coords.forEach((coord) => {
                const isLatest = latestLocation && 
                    Math.abs(coord.latitude - latestLocation.latitude) < 0.0001 &&
                    Math.abs(coord.longitude - latestLocation.longitude) < 0.0001;
                
                const color = getBuoyColor(coord.buoy);
                const icon = createMarkerIcon(color, isLatest);

                const marker = L.marker([coord.latitude, coord.longitude], { icon })
                    .addTo(map)
                    .bindPopup('<strong>' + coord.buoy + '</strong><br>pH: ' + coord.pH + '<br>Temp: ' + coord.temperature + '°C<br>TDS: ' + coord.tds + ' ppm');

                markers.push(marker);
            });

            // Add polyline connecting markers with distance labels
            if (coords.length > 1) {
                const latlngs = coords.map(coord => [coord.latitude, coord.longitude]);
                polyline = L.polyline(latlngs, {
                    color: '#0ea5e9',
                    weight: 3,
                    dashArray: '5, 5'
                }).addTo(map);

                // Add distance labels between consecutive markers
                for (let i = 0; i < coords.length - 1; i++) {
                    const start = coords[i];
                    const end = coords[i + 1];
                    
                    // Calculate distance using Haversine formula
                    const R = 6371000; // Earth radius in meters
                    const toRad = (deg) => (deg * Math.PI) / 180;
                    const dLat = toRad(end.latitude - start.latitude);
                    const dLon = toRad(end.longitude - start.longitude);
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(toRad(start.latitude)) * Math.cos(toRad(end.latitude)) *
                              Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distanceMeters = R * c;
                    
                    // Format distance
                    const distanceText = distanceMeters < 1000 
                        ? Math.round(distanceMeters) + ' m'
                        : (distanceMeters / 1000).toFixed(2) + ' km';
                    
                    // Calculate midpoint for label placement
                    const midLat = (start.latitude + end.latitude) / 2;
                    const midLng = (start.longitude + end.longitude) / 2;
                    
                    // Create custom icon for distance label
                    const distanceIcon = L.divIcon({
                        className: 'distance-label',
                        html: '<div style="background-color: rgba(255, 255, 255, 0.9); border: 2px solid #0ea5e9; border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: bold; color: #1e293b; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">' + distanceText + '</div>',
                        iconSize: [null, null],
                        iconAnchor: [0, 0]
                    });
                    
                    // Add marker for distance label
                    const distanceMarker = L.marker([midLat, midLng], {
                        icon: distanceIcon,
                        interactive: false,
                        zIndexOffset: 1000
                    }).addTo(map);
                    
                    distanceMarkers.push(distanceMarker);
                }
            }

            // Only zoom if:
            // 1. Force zoom is requested (initial load)
            // 2. User hasn't interacted with the map yet
            // 3. Latest location has changed
            const shouldZoom = forceZoom || (!userHasInteracted && !hasAutoZoomed) || 
                (latestLocation && previousLatestLocation && 
                 (Math.abs(latestLocation.latitude - previousLatestLocation.latitude) > 0.0001 ||
                  Math.abs(latestLocation.longitude - previousLatestLocation.longitude) > 0.0001));

            if (shouldZoom) {
                setTimeout(function() {
                    if (latestLocation) {
                        // Zoom to latest location with very close zoom level (centered)
                        map.setView([latestLocation.latitude, latestLocation.longitude], 18, {
                            animate: true,
                            duration: 1.0
                        });
                        hasAutoZoomed = true;
                    } else if (coords.length > 0 && markers.length > 0 && !hasAutoZoomed) {
                        try {
                            const group = new L.featureGroup(markers);
                            map.fitBounds(group.getBounds().pad(0.1), {
                                animate: true,
                                duration: 1.0
                            });
                            hasAutoZoomed = true;
                        } catch (e) {
                            console.error('Error fitting bounds:', e);
                        }
                    }
                }, 100);
            }
        }

        // Make updateMap available globally
        window.updateMap = updateMap;

        // Listen for messages from React Native WebView
        window.addEventListener('message', function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'updateMap') {
                    if (map) {
                        updateMap(data.coordinates, data.latestLocation);
                    } else {
                        // If map not ready, wait and try again
                        setTimeout(() => {
                            if (map) {
                                updateMap(data.coordinates, data.latestLocation);
                            }
                        }, 500);
                    }
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        });

        // Track user interaction with map
        function trackUserInteraction() {
            userHasInteracted = true;
        }

        // Initialize map when page loads
        window.addEventListener('load', function() {
            initMap();
            
            // Track user interactions (zoom, pan, drag)
            setTimeout(function() {
                if (map) {
                    map.on('zoomstart', trackUserInteraction);
                    map.on('dragstart', trackUserInteraction);
                    map.on('moveend', function() {
                        // Only track if user manually moved (not programmatic)
                        if (!map._animatingZoom) {
                            trackUserInteraction();
                        }
                    });
                }
            }, 1000);
            
            // Check for pending data
            setTimeout(function() {
                if (window.pendingMapData && map) {
                    updateMap(window.pendingMapData.coordinates, window.pendingMapData.latestLocation, true);
                }
                // Notify React Native that map is ready
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
                }
            }, 500);
        });
    </script>
</body>
</html>`;
        setHtmlContent(html);
      } catch (err) {
        console.error('Error loading HTML:', err);
        setError('Failed to load map.');
      }
    };

    loadHtml();
  }, []);

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
        timestamp: new Date(`${item.Date} ${item.Time}`).getTime(),
      }))
      .filter(coord => coord.latitude !== 0 && coord.longitude !== 0)
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent first
  };

  const coordinates = getMapCoordinates();

  // Find the latest location in coordinates
  const getLatestCoordinate = () => {
    if (latestLocation && latestLocation.latitude !== 0 && latestLocation.longitude !== 0) {
      return {
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        buoy: latestLocation.buoy,
      };
    }
    // If no latestLocation prop, use the most recent coordinate (first one after sorting)
    if (coordinates.length > 0) {
      return {
        latitude: coordinates[0].latitude,
        longitude: coordinates[0].longitude,
        buoy: coordinates[0].buoy,
      };
    }
    return null;
  };

  const latestCoord = getLatestCoordinate();

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);

  // Update map when data changes - only force zoom on initial load
  useEffect(() => {
    if (webViewRef.current && htmlContent && coordinates.length > 0 && !loading) {
      // Use injectJavaScript for reliable updates
      const shouldForceZoom = isInitialLoadRef.current;
      sendMapData(shouldForceZoom);
      // After first load, don't force zoom anymore
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
  }, [coordinates, latestCoord, htmlContent, loading]);

  if (loading) {
    return (
      <View style={styles.fullscreenContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.fullscreenContainer}>
        <Ionicons name="warning" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (coordinates.length === 0) {
    return (
      <View style={styles.fullscreenContainer}>
        <Ionicons name="map" size={48} color="#64748b" />
        <Text style={styles.noDataText}>No location data available</Text>
      </View>
    );
  }

  if (!htmlContent) {
    return (
      <View style={styles.fullscreenContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Function to send data to WebView
  const sendMapData = (forceZoom: boolean = false) => {
    if (webViewRef.current && coordinates.length > 0) {
      const message = JSON.stringify({
        type: 'updateMap',
        coordinates: coordinates,
        latestLocation: latestCoord,
      });
      // Use injectedJavaScript for more reliable communication
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            const data = ${message};
            // Always update map if it exists
            if (typeof window.updateMap === 'function') {
              if (window.map) {
                // Only force zoom if requested (initial load)
                window.updateMap(data.coordinates, data.latestLocation, ${forceZoom ? 'true' : 'false'});
              } else {
                // Store data and update when map is ready
                window.pendingMapData = data;
                window.pendingMapData.forceZoom = ${forceZoom ? 'true' : 'false'};
                // Try again after a short delay
                setTimeout(function() {
                  if (window.map && typeof window.updateMap === 'function') {
                    const shouldForceZoom = window.pendingMapData.forceZoom || false;
                    window.updateMap(data.coordinates, data.latestLocation, shouldForceZoom);
                  }
                }, 500);
              }
            }
          } catch(e) {
            console.error('Error updating map:', e);
          }
        })();
        true; // Required for injected JavaScript
      `);
    }
  };

  // Listen for messages from WebView
      const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        // Map is ready, send the data with force zoom on initial load
        setTimeout(() => {
          sendMapData(isInitialLoadRef.current);
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
          }
        }, 300);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: htmlContent }}
      style={styles.fullscreenMap}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      scalesPageToFit={true}
      onMessage={handleMessage}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error: ', nativeEvent);
        setError('Failed to load map. Please check your internet connection.');
      }}
      onLoadEnd={() => {
        // Send initial data when map loads (force zoom only on first load)
        setTimeout(() => {
          sendMapData(isInitialLoadRef.current);
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
          }
        }, 1000);
      }}
    />
  );
};

const styles = StyleSheet.create({
  fullscreenMap: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#f8fafc',
  },
  fullscreenContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
});

export default BuoyMap;
