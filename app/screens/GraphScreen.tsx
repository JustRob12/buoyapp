import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import BuoyGraph from '../components/BuoyGraph';
import { getLatestBuoyDataForGraph, BuoyData, testApiConnection, fetchBuoyData } from '../services/buoyService';
import { settingsService, loadSettings } from '../services/settingsService';
import { sendMultipleBuoysNotification } from '../services/notificationService';
import { getCachedBuoyData, cacheBuoyData, isOfflineModeEnabled, clearCache } from '../services/offlineService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';

// Declare html2pdf from window for web platform
declare const html2pdf: any;

// Import PNG assets
const headerPNGAsset = Asset.fromModule(require('../assets/header.png'));
const footerPNGAsset = Asset.fromModule(require('../assets/footer.png'));

const GraphScreen = () => {
  const navigation = useNavigation();
  const [graphData, setGraphData] = useState<BuoyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('Reading Data...');
  const [downloadComplete, setDownloadComplete] = useState(false);
  const cancelDownloadRef = useRef(false);

  const fetchGraphData = async () => {
    try {
      console.log('🚀 GraphScreen: Starting to fetch graph data...');
      setError(null);
      
      // Test API connection first
      await testApiConnection();
      
      const settings = await loadSettings();
      const dataPoints = settings.dataRetentionPoints;
      console.log('⚙️ GraphScreen: Settings loaded, dataPoints:', dataPoints);
      
      let data: BuoyData[] = [];
      let isOfflineData = false;
      
      // First, try to get data from API
      try {
        console.log('📡 GraphScreen: Calling getLatestBuoyDataForGraph...');
        data = await getLatestBuoyDataForGraph(dataPoints);
        console.log('📊 GraphScreen: API returned', data.length, 'data points');
        
        // If we got data from API and offline mode is enabled, cache it
        if (data.length > 0 && isOfflineModeEnabled()) {
          await cacheBuoyData(data);
        }
      } catch (apiError) {
        console.log('❌ GraphScreen: API fetch failed, trying offline data...', apiError);
        
        // If API fails, try to get cached offline data
        if (isOfflineModeEnabled()) {
          const cachedData = await getCachedBuoyData();
          if (cachedData && cachedData.length > 0) {
            data = cachedData.slice(0, dataPoints);
            isOfflineData = true;
            console.log('Using offline cached data for graphs');
          }
        }
        
        if (data.length === 0) {
          throw apiError; // Re-throw if no offline data available
        }
      }
      
      // Check if this is new data
      const isNewData = graphData.length > 0 && (
        data.length !== graphData.length || 
        data[0]?.Date !== graphData[0]?.Date ||
        data[0]?.Time !== graphData[0]?.Time
      );
      
      console.log('✅ GraphScreen: Setting graph data:', data.length, 'records');
      setGraphData(data);
      
      // Send notification for new graph data (only for online data)
      if (isNewData && data.length > 0 && !isOfflineData) {
        await sendMultipleBuoysNotification(data);
      }
    } catch (err) {
      console.error('❌ GraphScreen: Error fetching graph data:', err);
      setError('Failed to fetch graph data. Please try again.');
    } finally {
      console.log('🏁 GraphScreen: Finished loading, setting loading to false');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGraphData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const cancelDownload = () => {
    cancelDownloadRef.current = true;
    setShowDownloadModal(false);
    setGenerating(false);
    setDownloadProgress('Reading Data...');
    setDownloadComplete(false);
  };

  const generateNarrativeReport = async () => {
    try {
      // Reset cancel flag and show modal first
      cancelDownloadRef.current = false;
      setGenerating(true);
      setShowDownloadModal(true);
      setDownloadProgress('Clearing cache...');
      setDownloadComplete(false);
      
      // Clear cached data and reset state before starting download
      console.log('🧹 Clearing cached data and resetting state...');
      try {
        await clearCache();
        console.log('✅ Cache cleared successfully');
        // Small delay to ensure cache is fully cleared
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (clearErr) {
        console.log('⚠️ Error clearing cache (continuing anyway):', clearErr);
      }
      
      // Clear graph data from state to free memory
      setGraphData([]);
      setError(null);
      
      // Force garbage collection hint if available
      if (Platform.OS === 'web' && (window as any).gc) {
        (window as any).gc();
      }
      
      // Update progress
      setDownloadProgress('Reading Data...');
      
      // Helper to parse date and extract month, filtering out invalid years (like 2068)
      const getMonthFromRecord = (dateStr: string, timeStr: string): string | null => {
        const trimmedDate = (dateStr || '').trim();
        const trimmedTime = (timeStr || '').trim();
        
        let date: Date | null = null;
        if (trimmedDate.includes('/')) {
          const parts = trimmedDate.split('/');
          if (parts.length === 3) {
            const year = parseInt(parts[2], 10);
            // Filter out invalid years (like 2068)
            if (year < 2020 || year > 2030) {
              return null;
            }
            date = new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
            if (isNaN(date.getTime())) {
              date = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
          }
        } else if (trimmedDate.includes('-')) {
          date = new Date(trimmedDate);
          // Filter out invalid years
          if (date.getFullYear() < 2020 || date.getFullYear() > 2030) {
            return null;
          }
        } else {
          date = new Date(`${trimmedDate} ${trimmedTime}`);
          // Filter out invalid years
          if (date.getFullYear() < 2020 || date.getFullYear() > 2030) {
            return null;
          }
        }
        
        if (date && !isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return null;
      };

      // Fetch ALL data from API to compare months (limit to 50 pages to prevent timeout)
      console.log('📊 Fetching all data from API for month comparison...');
      setDownloadProgress('Reading Data...');
      const allData: BuoyData[] = [];
      let page = 1;
      let hasMore = true;
      const maxPages = 50; // Limit pages to prevent timeout

      while (hasMore && page <= maxPages) {
        // Check for cancellation
        if (cancelDownloadRef.current) {
          console.log('❌ Download cancelled by user');
          return;
        }
        
        // Update progress for each page
        if (page % 10 === 0) {
          setDownloadProgress(`Reading Data... (Page ${page})`);
        }
        
        const response = await fetchBuoyData(page);
        if (response.data.length === 0) {
          hasMore = false;
          break;
        }
        allData.push(...response.data);
        page++;
      }
      
      console.log(`✅ Fetched ${allData.length} total records from ${page - 1} pages`);

      // Check for cancellation after data fetch
      if (cancelDownloadRef.current) {
        console.log('❌ Download cancelled by user');
        return;
      }

      console.log(`✅ Fetched ${allData.length} total records from API`);
      setDownloadProgress('Processing Data...');

      // Filter out invalid years (like 2068) and group data by month
      const dataByMonth = new Map<string, BuoyData[]>();
      allData.forEach(rec => {
        const monthKey = getMonthFromRecord(rec.Date, rec.Time);
        if (monthKey) {
          if (!dataByMonth.has(monthKey)) {
            dataByMonth.set(monthKey, []);
          }
          dataByMonth.get(monthKey)!.push(rec);
        }
      });

      console.log(`📊 Available months: ${Array.from(dataByMonth.keys()).join(', ')}`);

      // Check for cancellation
      if (cancelDownloadRef.current) {
        console.log('❌ Download cancelled by user');
        return;
      }

      setDownloadProgress('Generating Charts...');

      // Helper to convert string to number
      const toNum = (v: string | number) => {
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
        return Number.isFinite(n) ? n : NaN;
      };

      // Generate pie charts for each month showing distribution of pH, Temperature, and TDS within that month
      const generatePieChartForMonth = (monthKey: string, monthData: BuoyData[], type: 'ph' | 'temp' | 'tds') => {
        const values = monthData.map(d => {
          const val = type === 'ph' ? toNum(d.pH) : type === 'temp' ? toNum(d['Temp (°C)']) : toNum(d['TDS (ppm)']);
          return val;
        }).filter(n => !isNaN(n) && n > 0);

        if (values.length === 0) {
          return null;
        }

        // Define ranges based on type
        let ranges: { label: string; min: number; max: number }[] = [];
        if (type === 'ph') {
          ranges = [
            { label: 'Acidic (< 6.5)', min: 0, max: 6.5 },
            { label: 'Normal (6.5-8.5)', min: 6.5, max: 8.5 },
            { label: 'Alkaline (> 8.5)', min: 8.5, max: 14 }
          ];
        } else if (type === 'temp') {
          const minTemp = Math.min(...values);
          const maxTemp = Math.max(...values);
          const range = maxTemp - minTemp;
          const step = range / 3;
          ranges = [
            { label: `Low (${minTemp.toFixed(1)}-${(minTemp + step).toFixed(1)}°C)`, min: minTemp, max: minTemp + step },
            { label: `Medium (${(minTemp + step).toFixed(1)}-${(minTemp + step * 2).toFixed(1)}°C)`, min: minTemp + step, max: minTemp + step * 2 },
            { label: `High (${(minTemp + step * 2).toFixed(1)}-${maxTemp.toFixed(1)}°C)`, min: minTemp + step * 2, max: maxTemp + 1 }
          ];
        } else { // tds
          const minTds = Math.min(...values);
          const maxTds = Math.max(...values);
          const range = maxTds - minTds;
          const step = range / 3;
          ranges = [
            { label: `Low (${minTds.toFixed(0)}-${(minTds + step).toFixed(0)} ppm)`, min: minTds, max: minTds + step },
            { label: `Medium (${(minTds + step).toFixed(0)}-${(minTds + step * 2).toFixed(0)} ppm)`, min: minTds + step, max: minTds + step * 2 },
            { label: `High (${(minTds + step * 2).toFixed(0)}-${maxTds.toFixed(0)} ppm)`, min: minTds + step * 2, max: maxTds + 1 }
          ];
        }

        // Count values in each range
        const rangeCounts = ranges.map(range => {
          const count = values.filter(v => v >= range.min && v < range.max).length;
          return count;
        });

        // Filter out ranges with zero counts
        const labels = ranges.map((r, i) => rangeCounts[i] > 0 ? r.label : null).filter(l => l !== null) as string[];
        const data = rangeCounts.filter(c => c > 0);
        
        if (data.length === 0) {
          return null;
        }

        const typeColors = {
          ph: ['#3b82f6', '#10b981', '#ef4444'],
          temp: ['#06b6d4', '#f59e0b', '#ef4444'],
          tds: ['#10b981', '#f59e0b', '#8b5cf6']
        };

        const chartConfig = {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: typeColors[type].slice(0, labels.length),
              borderColor: '#ffffff',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `${monthKey} - ${type === 'ph' ? 'pH' : type === 'temp' ? 'Temperature' : 'TDS'} Distribution`,
                font: {
                  size: 12,
                  family: 'Arial',
                  weight: 'bold'
                },
                color: '#1f2937'
              },
              legend: {
                position: 'right',
                labels: {
                  font: {
                    size: 9,
                    family: 'Arial'
                  },
                  padding: 8
                }
              }
            }
          }
        };
        
        return `https://quickchart.io/chart?width=350&height=280&format=png&chart=${encodeURIComponent(JSON.stringify(chartConfig))}`;
      };

      // Generate pie chart URLs for each month (pH, Temp, TDS for each month)
      const pieChartUrls = new Map<string, { ph: string | null; temp: string | null; tds: string | null }>();
      dataByMonth.forEach((monthData, monthKey) => {
        pieChartUrls.set(monthKey, {
          ph: generatePieChartForMonth(monthKey, monthData, 'ph'),
          temp: generatePieChartForMonth(monthKey, monthData, 'temp'),
          tds: generatePieChartForMonth(monthKey, monthData, 'tds')
        });
      });

      // Generate line graph for EACH available month showing TDS, pH, and Temperature over time
      const generateLineChartForMonth = (monthKey: string, monthData: BuoyData[]) => {
        const timeSorted = [...monthData].sort((a, b) => {
          const dateA = new Date(`${a.Date} ${a.Time}`);
          const dateB = new Date(`${b.Date} ${b.Time}`);
          return dateA.getTime() - dateB.getTime();
        });

        // Prepare labels and data for line graph
        const labels = timeSorted.map(d => {
          try {
            const dateParts = d.Date.includes('-') ? d.Date.split('-') : d.Date.split('/');
            const timeParts = d.Time.split(':');
            if (dateParts.length >= 3) {
              return `${dateParts[1]}-${dateParts[2]} ${timeParts[0]}:${timeParts[1]}`;
            }
            return `${d.Date} ${d.Time}`;
          } catch {
            return `${d.Date} ${d.Time}`;
          }
        });
        
        const phData = timeSorted.map(d => toNum(d.pH));
        const tempData = timeSorted.map(d => toNum(d['Temp (°C)']));
        const tdsData = timeSorted.map(d => toNum(d['TDS (ppm)']));
        
        // Generate line graph for this month
        const lineChartConfig = {
          type: 'line',
          data: { 
            labels: labels.length > 50 ? labels.filter((_, i) => i % Math.ceil(labels.length / 50) === 0) : labels, 
            datasets: [
              { 
                label: 'pH', 
                data: phData.length > 50 ? phData.filter((_, i) => i % Math.ceil(phData.length / 50) === 0) : phData, 
                borderColor: '#3b82f6', 
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
              },
              { 
                label: 'Temp (°C)', 
                data: tempData.length > 50 ? tempData.filter((_, i) => i % Math.ceil(tempData.length / 50) === 0) : tempData, 
                borderColor: '#ef4444', 
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
              },
              { 
                label: 'TDS (ppm)', 
                data: tdsData.length > 50 ? tdsData.filter((_, i) => i % Math.ceil(tdsData.length / 50) === 0) : tdsData, 
                borderColor: '#10b981', 
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
              },
            ]
          },
          options: { 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: { 
                position: 'top',
                align: 'center',
                labels: {
                  usePointStyle: true,
                  padding: 15,
                  font: { size: 12, family: 'Arial', weight: 'bold' },
                  color: '#1f2937'
                }
              },
              title: {
                display: true,
                text: `${monthKey} - TDS, pH, and Temperature Over Time`,
                font: { size: 14, family: 'Arial', weight: 'bold' },
                color: '#1f2937'
              }
            }, 
            scales: { 
              x: {
                display: true,
                ticks: {
                  font: { size: 9, family: 'Arial' },
                  maxRotation: 45,
                  minRotation: 45
                }
              },
              y: { 
                beginAtZero: true,
                display: true,
                ticks: {
                  font: { size: 10, family: 'Arial' }
                }
              } 
            }
          }
        };
        
        return `https://quickchart.io/chart?width=600&height=400&format=png&chart=${encodeURIComponent(JSON.stringify(lineChartConfig))}`;
      };

      // Generate line chart URLs for all months
      const lineChartUrls = new Map<string, string>();
      dataByMonth.forEach((monthData, monthKey) => {
        lineChartUrls.set(monthKey, generateLineChartForMonth(monthKey, monthData));
      });
      
      // Helper to convert image URL to base64 (only for native platforms)
      const getImageAsBase64 = async (url: string): Promise<string> => {
        if (Platform.OS === 'web') {
          // For web, return URL directly - html2canvas will handle it
          return url;
        }
        // For native, convert to base64
        try {
          const targetDir = ((FileSystem as any).cacheDirectory) || ((FileSystem as any).documentDirectory) || '';
          const chartPath = targetDir + `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
          const dl = await (FileSystem as any).downloadAsync(url, chartPath);
          const base64 = await (FileSystem as any).readAsStringAsync(dl.uri, { encoding: 'base64' });
          // Clean up file immediately after reading
          try {
            await FileSystem.deleteAsync(dl.uri, { idempotent: true });
          } catch {}
          return `data:image/png;base64,${base64}`;
        } catch (e) {
          console.error(`Error downloading image:`, e);
          return '';
        }
      };

      // Generate image HTML on-the-fly (don't store in memory)
      const getImageHtml = (src: string, alt: string): string => {
        if (!src) {
          return `<div style="text-align:center;padding:20px;border:1px solid #d1d5db;margin:15px auto;">No ${alt} data</div>`;
        }
        if (Platform.OS === 'web') {
          // For web: use URL directly, html2canvas will fetch it
          return `<img src="${src}" alt="${alt}" style="width:100%;max-width:400px;height:auto;border:1px solid #d1d5db;border-radius:4px;display:block;margin:15px auto;page-break-inside:avoid;" crossorigin="anonymous" />`;
        } else {
          // For native: use base64
          return `<img src="${src}" alt="${alt}" style="width:100%;max-width:400px;height:auto;border:1px solid #d1d5db;border-radius:4px;display:block;margin:15px auto;page-break-inside:avoid;" />`;
        }
      };

      // Generate chart images on-the-fly during HTML generation (for native only)
      // For web, we'll use URLs directly in HTML

      // Load header and footer PNG images (generate fresh each time, don't store)
      const getHeaderFooterImages = async (): Promise<{ header: string; footer: string }> => {
        try {
          console.log('📸 Loading header and footer PNG images...');
          
          // Download and read PNG assets
          await headerPNGAsset.downloadAsync();
          await footerPNGAsset.downloadAsync();
          
          const headerBase64 = await FileSystem.readAsStringAsync(headerPNGAsset.localUri || headerPNGAsset.uri, { encoding: 'base64' });
          const footerBase64 = await FileSystem.readAsStringAsync(footerPNGAsset.localUri || footerPNGAsset.uri, { encoding: 'base64' });
          
          console.log('✅ Successfully loaded header and footer PNG images');
          
          const headerImg = `<img src="data:image/png;base64,${headerBase64}" alt="Header" style="width:100%;height:auto;display:block;margin:0;padding:0;border:none;" />`;
          const footerImg = `<img src="data:image/png;base64,${footerBase64}" alt="Footer" style="width:100%;height:auto;display:block;margin:0;padding:0;border:none;" />`;
          
          // Clear base64 strings from memory immediately after use
          return { header: headerImg, footer: footerImg };
        } catch (e) {
          console.error('❌ Error loading PNG images:', e);
          // Fallback to HTML-based header and footer if images can't be loaded
          return {
            header: `<div style="background:linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);color:#ffffff;padding:25px;text-align:left;margin-bottom:25px;border-radius:0;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <h1 style="margin:0;font-family:Arial;font-size:28px;color:#ffffff;font-weight:bold;letter-spacing:1px;">AQUANET</h1>
                  <p style="margin:8px 0 0 0;font-family:Arial;font-size:14px;color:#e0e7ff;">Narrative Report on<br/>Water Quality Monitoring</p>
                </div>
                <div style="display:flex;gap:15px;align-items:center;">
                  <div style="width:60px;height:60px;background:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#1e3a8a;">D</div>
                  <div style="width:60px;height:60px;background:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#1e3a8a;">F</div>
                  <div style="width:60px;height:60px;background:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#1e3a8a;">IT</div>
                </div>
              </div>
            </div>`,
            footer: `<div style="background:#1e293b;color:#ffffff;padding:18px;text-align:center;margin-top:40px;font-family:Arial;font-size:12px;border-top:2px solid #334155;">
              © 2025 AQUANET | Water Quality Monitoring Report
            </div>`
          };
        }
      };

      // Check for cancellation before generating HTML
      if (cancelDownloadRef.current) {
        console.log('❌ Download cancelled by user');
        return;
      }

      setDownloadProgress('Generating Map...');

      // Generate map visualization with buoy locations and connecting lines using Leaflet
      const generateMapVisualization = (data: BuoyData[]): string => {
        // Extract unique buoy coordinates (get latest location for each buoy) - matching BuoyMap.tsx logic
        const buoyCoords = new Map<string, { lat: number; lng: number; buoy: string; id: string }>();
        
        data.forEach(item => {
          const lat = parseFloat(item.Latitude) || 0;
          const lng = parseFloat(item.Longitude) || 0;
          const buoy = item.Buoy.trim();
          
          if (lat !== 0 && lng !== 0 && buoy) {
            // Use latest location for each buoy
            if (!buoyCoords.has(buoy)) {
              buoyCoords.set(buoy, { lat, lng, buoy, id: item.ID });
            }
          }
        });

        // Sort coordinates by buoy number for logical connection order - matching BuoyMap.tsx
        const coordinates = Array.from(buoyCoords.values()).sort((a, b) => {
          const numA = parseInt(a.buoy.replace('Buoy', '').trim()) || 999;
          const numB = parseInt(b.buoy.replace('Buoy', '').trim()) || 999;
          return numA - numB;
        });
        
        if (coordinates.length === 0) {
          return '<div style="text-align:center;padding:20px;border:1px solid #d1d5db;margin:15px auto;">No location data available for map</div>';
        }

        // Calculate map bounds with minimum buffer to ensure visibility
        const lats = coordinates.map(c => c.lat);
        const lngs = coordinates.map(c => c.lng);
        let minLat = Math.min(...lats);
        let maxLat = Math.max(...lats);
        let minLng = Math.min(...lngs);
        let maxLng = Math.max(...lngs);
        
        // Add minimum buffer to ensure map is zoomed out enough to see context
        // This is especially important for Mindanao region
        const latBuffer = Math.max((maxLat - minLat) * 0.3, 0.05); // At least 0.05 degrees or 30% of range
        const lngBuffer = Math.max((maxLng - minLng) * 0.3, 0.05); // At least 0.05 degrees or 30% of range
        
        minLat = minLat - latBuffer;
        maxLat = maxLat + latBuffer;
        minLng = minLng - lngBuffer;
        maxLng = maxLng + lngBuffer;
        
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        // Get buoy colors - matching BuoyMap.tsx
        const getBuoyColor = (buoyName: string) => {
          const buoyNumber = buoyName.replace('Buoy', '').trim();
          switch (buoyNumber) {
            case '1': return '#0ea5e9'; // Sky blue
            case '2': return '#ef4444'; // Red
            case '3': return '#22c55e'; // Green
            case '4': return '#f59e0b'; // Orange
            case '5': return '#8b5cf6'; // Purple
            default: return '#64748b'; // Gray
          }
        };

        // Calculate distance between buoys - matching BuoyMap.tsx
        const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const R = 6371000; // Earth radius in meters
          const dLat = toRad(lat2 - lat1);
          const dLng = toRad(lng2 - lng1);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        // Build distance labels for each consecutive pair - matching BuoyMap.tsx
        const segmentLabels = coordinates.length > 1
          ? coordinates.slice(0, -1).map((start, i) => {
              const end = coordinates[i + 1];
              const distanceMeters = calculateDistanceMeters(
                start.lat,
                start.lng,
                end.lat,
                end.lng
              );
              const label = distanceMeters < 1000
                ? `${Math.round(distanceMeters)} m`
                : `${(distanceMeters / 1000).toFixed(1)} km`;
              const midLat = (start.lat + end.lat) / 2;
              const midLng = (start.lng + end.lng) / 2;
              return { midLat, midLng, label, key: `${start.id}-${end.id}` };
            })
          : [];

        // Create markers data
        const markersData = coordinates.map(coord => ({
          lat: coord.lat,
          lng: coord.lng,
          buoy: coord.buoy,
          color: getBuoyColor(coord.buoy),
          label: coord.buoy.replace('Buoy', '').trim() || '?'
        }));

        // Create polyline coordinates
        const polylineCoords = coordinates.map(coord => [coord.lat, coord.lng]);

        // Generate unique map ID
        const mapId = `buoy-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create bounds for fitBounds
        const bounds = coordinates.length > 0 ? [
          [minLat, minLng],
          [maxLat, maxLng]
        ] : [[centerLat, centerLng], [centerLat, centerLng]];

        return `
          <div id="${mapId}" style="width:100%;height:600px;border:2px solid #e2e8f0;border-radius:8px;margin:20px 0;position:relative;"></div>
          <script>
            (function() {
              function initMap() {
                if (typeof L === 'undefined') {
                  setTimeout(initMap, 100);
                  return;
                }
                
                try {
                const map = L.map('${mapId}', {
                  preferCanvas: true, // Use canvas renderer for better html2canvas compatibility
                  zoomControl: false,
                  attributionControl: false,
                  renderer: L.canvas({ padding: 0.5 }) // Force canvas renderer
                });

                // Use CartoDB tile provider which supports CORS better
                // This tile provider works better with html2canvas
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                  maxZoom: 19,
                  attribution: '© OpenStreetMap contributors © CARTO',
                  crossOrigin: 'anonymous', // Enable CORS for tile images
                  subdomains: 'abcd'
                }).addTo(map);

                // Create custom icon function
                const createCustomIcon = (color, label) => {
                  return L.divIcon({
                    className: 'custom-buoy-marker',
                    html: \`<div style="
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      background-color: \${color};
                      border: 3px solid #ffffff;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: #ffffff;
                      font-weight: bold;
                      font-size: 14px;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">\${label}</div>\`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                  });
                };

                // Add markers FIRST - matching BuoyMap.tsx
                const markers = ${JSON.stringify(markersData)};
                const markerGroup = L.layerGroup();
                markers.forEach(marker => {
                  const markerObj = L.marker([marker.lat, marker.lng], {
                    icon: createCustomIcon(marker.color, marker.label)
                  }).bindPopup(\`<b>\${marker.buoy}</b>\`);
                  markerObj.addTo(map);
                  markerGroup.addLayer(markerObj);
                });

                // Add polyline connecting buoys - matching BuoyMap.tsx
                const polylineCoords = ${JSON.stringify(polylineCoords)};
                if (polylineCoords.length > 1) {
                  L.polyline(polylineCoords, {
                    color: '#0ea5e9',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '5, 5'
                  }).addTo(map);
                }

                // Fit bounds AFTER adding all markers to show all buoys and Mindanao region
                const bounds = ${JSON.stringify(bounds)};
                const boundsLatLng = L.latLngBounds(bounds);
                
                // Wait for map to be ready, then fit bounds
                map.whenReady(function() {
                  // Ensure bounds are valid and not too small
                  if (boundsLatLng.isValid() && !boundsLatLng.getNorthEast().equals(boundsLatLng.getSouthWest())) {
                    // Fit bounds with padding to show all buoys and surrounding Mindanao area
                    map.fitBounds(boundsLatLng, { 
                      padding: [100, 100], // Increased padding to show more of Mindanao
                      maxZoom: 11 // Limit max zoom to ensure we see the Mindanao region context
                    });
                  } else {
                    // Fallback: set view with appropriate zoom for Mindanao region
                    map.setView([${centerLat}, ${centerLng}], 9); // Zoom level 9 shows Mindanao region well
                  }
                });

                // Add distance labels - matching BuoyMap.tsx
                const segmentLabels = ${JSON.stringify(segmentLabels)};
                segmentLabels.forEach(seg => {
                  const labelDiv = document.createElement('div');
                  labelDiv.style.cssText = \`
                    background-color: rgba(255,255,255,0.85);
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 2px 6px;
                    font-size: 8px;
                    font-weight: 800;
                    color: #000000;
                    white-space: nowrap;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                  \`;
                  labelDiv.textContent = seg.label;
                  
                  L.marker([seg.midLat, seg.midLng], {
                    icon: L.divIcon({
                      className: 'distance-label',
                      html: labelDiv.outerHTML,
                      iconSize: [null, null],
                      iconAnchor: [0, 0]
                    })
                  }).addTo(map);
                });

                  // Wait for map to fully render
                  map.whenReady(function() {
                    setTimeout(function() {
                      // Map is ready for capture
                      if (window.mapReadyCallback) {
                        window.mapReadyCallback();
                      }
                    }, 1500);
                  });
                } catch (error) {
                  console.error('Error initializing map:', error);
                  const mapDiv = document.getElementById('${mapId}');
                  if (mapDiv) {
                    mapDiv.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444;">Error loading map</div>';
                  }
                }
              }
              
              // Start initialization
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initMap);
              } else {
                initMap();
              }
            })();
          </script>
        `;
      };

      setDownloadProgress('Generating PDF...');

      // Generate narrative report about GPS movements
      const generateGPSMovementNarrative = (data: BuoyData[]): string => {
        if (!data || data.length === 0) {
          return 'Insufficient GPS data available to analyze location behavior.';
        }

        // Track the buoy's movement over time (recorded every 10 minutes)
        const positions: Array<{ lat: number; lng: number; timestamp: number }> = [];
        
        data.forEach(item => {
          const lat = parseFloat(item.Latitude) || 0;
          const lng = parseFloat(item.Longitude) || 0;
          
          if (lat !== 0 && lng !== 0) {
            try {
              const timestamp = new Date(`${item.Date} ${item.Time}`).getTime();
              if (!isNaN(timestamp)) {
                positions.push({ lat, lng, timestamp });
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        });

        if (positions.length === 0) {
          return 'No valid GPS movement data available for analysis.';
        }

        // Sort by timestamp to track movement chronologically
        positions.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate distance between two points using Haversine formula
        const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const R = 6371000; // Earth radius in meters
          const dLat = toRad(lat2 - lat1);
          const dLng = toRad(lng2 - lng1);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        // Calculate bearing (direction) between two points in degrees
        const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const toDeg = (rad: number) => (rad * 180) / Math.PI;
          
          const dLng = toRad(lng2 - lng1);
          const lat1Rad = toRad(lat1);
          const lat2Rad = toRad(lat2);
          
          const y = Math.sin(dLng) * Math.cos(lat2Rad);
          const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
          
          let bearing = toDeg(Math.atan2(y, x));
          bearing = (bearing + 360) % 360; // Normalize to 0-360
          
          return bearing;
        };

        // Convert bearing to cardinal direction
        const bearingToDirection = (bearing: number): string => {
          const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
          const index = Math.round(bearing / 45) % 8;
          return directions[index];
        };

        // Analyze movement patterns - track cumulative distance, maximum displacement, and direction
        let totalDistance = 0;
        let maxDistance = 0;
        const distances: number[] = [];
        const bearings: number[] = [];
        
        for (let i = 1; i < positions.length; i++) {
          const distance = calculateDistance(
            positions[i - 1].lat,
            positions[i - 1].lng,
            positions[i].lat,
            positions[i].lng
          );
          const bearing = calculateBearing(
            positions[i - 1].lat,
            positions[i - 1].lng,
            positions[i].lat,
            positions[i].lng
          );
          
          distances.push(distance);
          bearings.push(bearing);
          totalDistance += distance;
          maxDistance = Math.max(maxDistance, distance);
        }

        // Calculate overall direction (from start to end position)
        let overallDirection = '';
        let overallBearing = 0;
        if (positions.length > 1) {
          overallBearing = calculateBearing(
            positions[0].lat,
            positions[0].lng,
            positions[positions.length - 1].lat,
            positions[positions.length - 1].lng
          );
          overallDirection = bearingToDirection(overallBearing);
        }

        // Calculate average direction (circular mean of bearings)
        const calculateAverageBearing = (bearings: number[]): number => {
          if (bearings.length === 0) return 0;
          
          let sinSum = 0;
          let cosSum = 0;
          
          bearings.forEach(bearing => {
            const rad = (bearing * Math.PI) / 180;
            sinSum += Math.sin(rad);
            cosSum += Math.cos(rad);
          });
          
          const avgRad = Math.atan2(sinSum / bearings.length, cosSum / bearings.length);
          let avgDeg = (avgRad * 180) / Math.PI;
          avgDeg = (avgDeg + 360) % 360;
          
          return avgDeg;
        };

        const avgBearing = bearings.length > 0 ? calculateAverageBearing(bearings) : 0;
        const avgDirection = bearings.length > 0 ? bearingToDirection(avgBearing) : '';

        // Calculate average distance between 10-minute intervals
        const avgDistancePerInterval = distances.length > 0 ? totalDistance / distances.length : 0;
        const totalTrackingPoints = positions.length;
        
        // Generate narrative based on analysis
        let narrative = 'Based on GPS movement analysis, the buoy\'s position has been tracked every 10 minutes throughout the monitoring period. ';
        
        if (totalDistance < 50) {
          narrative += 'The buoy has remained relatively stationary, indicating a stable deployment position with minimal drift. ';
        } else if (totalDistance < 500) {
          narrative += 'The buoy has shown moderate movement patterns, likely influenced by natural water currents and tidal patterns. ';
        } else {
          narrative += 'The buoy has exhibited significant movement patterns, suggesting it may be subject to water currents, wind forces, or intentional repositioning. ';
        }
        
        if (maxDistance > 1000) {
          narrative += `The maximum displacement observed between consecutive 10-minute intervals was approximately ${(maxDistance / 1000).toFixed(1)} kilometers. `;
        } else if (maxDistance > 100) {
          narrative += `The maximum displacement observed between consecutive 10-minute intervals was approximately ${Math.round(maxDistance)} meters. `;
        } else {
          narrative += `Movement between 10-minute intervals was generally minimal, with displacements under 100 meters. `;
        }
        
        narrative += `The total cumulative movement distance tracked over ${totalTrackingPoints} data points is approximately ${(totalDistance / 1000).toFixed(2)} kilometers, with an average movement of ${(avgDistancePerInterval).toFixed(1)} meters per 10-minute interval. `
        
        // Add direction summary
        if (positions.length > 1 && totalDistance > 10) {
          const formatDirection = (dir: string): string => {
            const dirLower = dir.toLowerCase();
            // Handle compound directions (northeast, southwest, etc.)
            if (dirLower.includes('north') && dirLower.includes('east')) return 'northeast';
            if (dirLower.includes('north') && dirLower.includes('west')) return 'northwest';
            if (dirLower.includes('south') && dirLower.includes('east')) return 'southeast';
            if (dirLower.includes('south') && dirLower.includes('west')) return 'southwest';
            // Handle cardinal directions
            if (dirLower === 'north') return 'north';
            if (dirLower === 'south') return 'south';
            if (dirLower === 'east') return 'east';
            if (dirLower === 'west') return 'west';
            return dirLower;
          };

          const formattedOverall = formatDirection(overallDirection);
          const formattedAvg = formatDirection(avgDirection);

          if (overallDirection && avgDirection) {
            if (overallDirection === avgDirection) {
              narrative += `Direction Summary: The buoy's movement shows a consistent ${formattedOverall}ward trend throughout the monitoring period. The overall net displacement from the starting position to the final position is in a ${formattedOverall}ward direction. `;
            } else {
              narrative += `Direction Summary: The buoy's movement shows an average ${formattedAvg}ward trend during tracking intervals, while the overall net displacement from start to end position is in a ${formattedOverall}ward direction. `;
            }
          } else if (overallDirection) {
            narrative += `Direction Summary: The overall net displacement of the buoy from its starting position to its final position is in a ${formattedOverall}ward direction. `;
          }
        }
        
        if (maxDistance < 50) {
          narrative += 'These movement patterns suggest the buoy is well-anchored and maintaining its designated monitoring position, which is ideal for consistent water quality data collection.';
        } else if (maxDistance < 500) {
          narrative += 'The observed movements are within acceptable ranges for floating monitoring systems, likely influenced by natural water currents and tidal patterns while maintaining overall positional stability.';
        } else {
          narrative += 'The significant movements observed may indicate strong current conditions, potential anchor issues, or intentional repositioning, which should be considered when analyzing spatial variations in water quality parameters.';
        }

        return narrative;
      };

      // Generate HTML with images on-the-fly (don't store in memory)
      const generateHtml = async (): Promise<string> => {
        // Check for cancellation
        if (cancelDownloadRef.current) {
          throw new Error('Download cancelled');
        }

        const { header: headerImg, footer: footerImg } = await getHeaderFooterImages();
        
        // Check for cancellation
        if (cancelDownloadRef.current) {
          throw new Error('Download cancelled');
        }
        
        // Generate table rows for all data (all months combined) - on-the-fly
      const allValidData: BuoyData[] = [];
      dataByMonth.forEach((monthData) => {
        allValidData.push(...monthData);
      });
      
      // Sort all data by date
      const sortedAllData = allValidData.sort((a, b) => {
        const dateA = new Date(`${a.Date} ${a.Time}`);
        const dateB = new Date(`${b.Date} ${b.Time}`);
        return dateB.getTime() - dateA.getTime(); // Newest first
      });
      
      const rows = sortedAllData.map(d => `
        <tr>
          <td style="padding:6px;border:1px solid #e5e7eb">${d.Buoy}</td>
          <td style="padding:6px;border:1px solid #e5e7eb">${d.Date}</td>
          <td style="padding:6px;border:1px solid #e5e7eb">${d.Time}</td>
          <td style="padding:6px;border:1px solid #e5e7eb">${d.pH}</td>
          <td style="padding:6px;border:1px solid #e5e7eb">${d['Temp (°C)']}</td>
          <td style="padding:6px;border:1px solid #e5e7eb">${d['TDS (ppm)']}</td>
        </tr>
      `).join('');

        // For native platforms, convert chart URLs to base64 on-the-fly
        // For web, use URLs directly
        const sortedMonths = Array.from(dataByMonth.keys()).sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateB.getTime() - dateA.getTime();
        });

        // Generate month sections with images
        const monthSections = await Promise.all(
          sortedMonths.map(async (monthKey) => {
            // Check for cancellation before processing each month
            if (cancelDownloadRef.current) {
              throw new Error('Download cancelled');
            }
            
            const pieUrls = pieChartUrls.get(monthKey);
            const lineUrl = lineChartUrls.get(monthKey);
            
            // For native: convert to base64 on-the-fly, for web: use URLs
            let phImgHtml = '<div style="text-align:center;padding:20px;">No pH data</div>';
            let tempImgHtml = '<div style="text-align:center;padding:20px;">No Temp data</div>';
            let tdsImgHtml = '<div style="text-align:center;padding:20px;">No TDS data</div>';
            let lineImgHtml = '<div style="text-align:center;padding:20px;">No line chart data</div>';
            
            if (Platform.OS === 'web') {
              // Web: use URLs directly - html2canvas will fetch them
              phImgHtml = getImageHtml(pieUrls?.ph || '', 'pH Distribution');
              tempImgHtml = getImageHtml(pieUrls?.temp || '', 'Temperature Distribution');
              tdsImgHtml = getImageHtml(pieUrls?.tds || '', 'TDS Distribution');
              lineImgHtml = getImageHtml(lineUrl || '', 'Line Chart');
            } else {
              // Check for cancellation before downloading images
              if (cancelDownloadRef.current) {
                throw new Error('Download cancelled');
              }
              
              // Native: convert to base64 on-the-fly, don't store
              const [phBase64, tempBase64, tdsBase64, lineBase64] = await Promise.all([
                pieUrls?.ph ? getImageAsBase64(pieUrls.ph) : Promise.resolve(''),
                pieUrls?.temp ? getImageAsBase64(pieUrls.temp) : Promise.resolve(''),
                pieUrls?.tds ? getImageAsBase64(pieUrls.tds) : Promise.resolve(''),
                lineUrl ? getImageAsBase64(lineUrl) : Promise.resolve('')
              ]);
              
              // Check for cancellation after downloading images
              if (cancelDownloadRef.current) {
                throw new Error('Download cancelled');
              }
              
              phImgHtml = getImageHtml(phBase64, 'pH Distribution');
              tempImgHtml = getImageHtml(tempBase64, 'Temperature Distribution');
              tdsImgHtml = getImageHtml(tdsBase64, 'TDS Distribution');
              lineImgHtml = getImageHtml(lineBase64, 'Line Chart');
            }
            
            // Generate GPS movement narrative for this month's data
            const monthData = dataByMonth.get(monthKey) || [];
            const monthGPSNarrative = generateGPSMovementNarrative(monthData);
            
            return `
            <div class="page">
              <div class="page-header">${headerImg}</div>
              <div class="content-container">
                <h2>Water Quality Report - ${monthKey}</h2>
                
                <h3>Distribution Charts - ${monthKey}</h3>
                <div style="display:flex;flex-wrap:wrap;justify-content:space-around;margin:20px 0;">
                  <div style="flex:1;min-width:300px;margin:10px;">
                    <h4 style="text-align:center;font-size:11pt;margin-bottom:10px;">pH Distribution</h4>
                    ${phImgHtml}
            </div>
                  <div style="flex:1;min-width:300px;margin:10px;">
                    <h4 style="text-align:center;font-size:11pt;margin-bottom:10px;">Temperature Distribution</h4>
                    ${tempImgHtml}
            </div>
                  <div style="flex:1;min-width:300px;margin:10px;">
                    <h4 style="text-align:center;font-size:11pt;margin-bottom:10px;">TDS Distribution</h4>
                    ${tdsImgHtml}
          </div>
                </div>
              </div>
            </div>
            <div class="page">
              <div class="content-container">
                <h3>Line Graph - ${monthKey}</h3>
                <p style="font-size:9pt;color:#64748b;margin-bottom:15px;">TDS, pH, and Temperature trends over time for ${monthKey} (${monthData.length} records)</p>
                <div class="chart-wrapper">${lineImgHtml}</div>
              </div>
            </div>
            <div class="page">
              <div class="content-container">
                <h3>GPS Movement Analysis - ${monthKey}</h3>
                <p style="font-size:10pt;color:#1f2937;margin-bottom:15px;text-align:justify;line-height:1.6;">
                  ${monthGPSNarrative}
                </p>
              </div>
            </div>
            `;
          })
        );

        return `
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>AquaNet Water Quality Report - All Months</title>
            <style>
              * {
                margin: 0;
                padding: 0;
              }
              @page {
                size: A4 portrait;
                margin: 0.5cm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                line-height: 1.4;
                background: white;
              }
              .page-header {
                width: 100%;
                padding: 0;
                page-break-inside: avoid;
                margin-bottom: 10px;
              }
              .page-header img {
                width: 100%;
                height: auto;
                display: block;
                margin: 0;
                padding: 0;
              }
              .page {
                page-break-after: always;
                padding: 0;
              }
              .page:last-child {
                page-break-after: avoid;
              }
              .content-container {
                padding: 10px;
                page-break-inside: avoid;
              }
              h1 { font-size: 16pt; font-weight: bold; margin: 5px 0 3px 0; color: #000000; }
              h2 { font-size: 12pt; font-weight: bold; margin: 5px 0 8px 0; color: #1e3a8a; }
              h3 { font-size: 11pt; font-weight: bold; margin: 8px 0 5px 0; color: #000000; }
              p { font-size: 10pt; line-height: 1.4; margin-bottom: 8px; text-align: justify; }
              table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 8pt; }
              th { padding: 4px; border: 1px solid #cbd5e0; background: #eff6ff; text-align: left; font-weight: bold; }
              td { padding: 3px 4px; border: 1px solid #cbd5e0; }
              .chart-wrapper { margin: 8px 0; text-align: center; page-break-inside: avoid; }
              .chart-wrapper img { max-width: 100%; height: auto; margin: 0; display: block; }
            </style>
          </head>
          <body>
            ${monthSections.join('')}
            
            <div class="page">
              <div class="content-container">
                <h3>Complete Data Table - All Months</h3>
                <p style="font-size:9pt;color:#64748b;margin-bottom:15px;">All available data from all months (${sortedAllData.length} records)</p>
                <table>
                  <thead>
                    <tr>
                      <th>Buoy</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>pH</th>
                      <th>Temp (°C)</th>
                      <th>TDS (ppm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </div>
            </div>
            ${footerImg}
          </body>
        </html>`;
      };

      // Generate HTML fresh each time (don't store in state)
      const html = await generateHtml();
      
      // Check for cancellation after HTML generation
      if (cancelDownloadRef.current) {
        console.log('❌ Download cancelled by user');
        return;
      }
      
      // Clear all temporary data to free memory
      pieChartUrls.clear();
      lineChartUrls.clear();

      // Save as PDF
      const fileName = `AquaNet_Water_Quality_Report_All_Months`;

      if (Platform.OS === 'web') {
        // Web: use html2pdf with html2canvas (optimized for memory)
        try {
          console.log('📄 Starting PDF generation from HTML...');
          
          // Check if html2pdf is available
          if (typeof html2pdf === 'undefined') {
            console.log('⚠️ html2pdf not available, loading...');
            
            // Load html2pdf library dynamically
            await new Promise<void>((resolve, reject) => {
              // Check for cancellation
              if (cancelDownloadRef.current) {
                reject(new Error('Download cancelled'));
                return;
              }
              
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
              script.onload = () => {
                console.log('✅ html2pdf library loaded');
                resolve();
              };
              script.onerror = () => {
                console.error('❌ Failed to load html2pdf library');
                reject(new Error('Failed to load PDF library'));
              };
              document.head.appendChild(script);
            });
          }
          
          // Check for cancellation before creating container
          if (cancelDownloadRef.current) {
            console.log('❌ Download cancelled by user');
            return;
          }
          
          // Create a temporary container for the HTML (fresh each time)
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '0';
            container.style.top = '0';
            container.style.width = '210mm';
            container.style.height = 'auto';
            container.style.overflow = 'visible';
            container.style.zIndex = '9999';
            container.style.backgroundColor = '#ffffff';
            container.innerHTML = html;
            document.body.appendChild(container);
            
          try {
            const options = {
              margin: 2,
              filename: `${fileName}.pdf`,
              image: { type: 'png', quality: 0.95 },
              html2canvas: { 
                scale: 2,
                useCORS: true,
                allowTaint: true, // Allow taint to capture map images
                backgroundColor: '#ffffff',
                logging: false,
                removeContainer: true,
                async: true,
                onclone: (clonedDoc: Document) => {
                  // Clean up any temporary elements in cloned document
                  const clonedContainer = clonedDoc.querySelector('div[style*="position: fixed"]') as HTMLElement;
                  if (clonedContainer) {
                    clonedContainer.style.position = 'relative';
                    clonedContainer.style.left = 'auto';
                    clonedContainer.style.top = 'auto';
                    clonedContainer.style.zIndex = 'auto';
                  }
                }
              },
              jsPDF: { 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'a4',
                compress: true
              },
              pagebreak: { mode: 'avoid-all', before: '.page', after: '.page' }
            };
            
            console.log('📋 PDF options configured, starting conversion with html2canvas...');
            
            // Check for cancellation before PDF generation
            if (cancelDownloadRef.current) {
              throw new Error('Download cancelled');
            }
            
            // Convert HTML to PDF using html2pdf (uses html2canvas internally)
            await (html2pdf as any)().set(options).from(container).save();
            
            // Check for cancellation after PDF generation
            if (cancelDownloadRef.current) {
              throw new Error('Download cancelled');
            }
            
            console.log('✅ PDF generated and downloaded successfully');
            
            // Show done checkmark before closing
            setDownloadProgress('Done!');
            setDownloadComplete(true);
            
            // Wait a moment to show the checkmark, then close modal
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (!cancelDownloadRef.current) {
              setShowDownloadModal(false);
            }
          } finally {
            // Always clean up container immediately after PDF generation
            if (container.parentNode) {
              document.body.removeChild(container);
            }
            // Force garbage collection hint (browser may or may not honor)
            if ((window as any).gc) {
              (window as any).gc();
            }
          }
        } catch (pdfError) {
          console.error('❌ PDF generation error:', pdfError);
          if (!cancelDownloadRef.current) {
          setError('Failed to generate PDF. Please try again.');
          }
        } finally {
          setShowDownloadModal(false);
          setGenerating(false);
        }
      } else {
        // Native: Generate PDF using expo-print
        console.log('📄 Generating PDF for mobile platform...');
        let pdfGenerated = false;
        
        try {
          // Check for cancellation
          if (cancelDownloadRef.current) {
            console.log('❌ Download cancelled by user');
            return;
          }
          
          console.log('📋 Starting PDF generation...');
          
          // Print HTML to PDF with increased timeout (60 seconds for large PDFs)
          let result: any;
          try {
            result = await Promise.race([
              Print.printToFileAsync({
                html: html,
                base64: false,
                margins: { left: 10, top: 10, right: 10, bottom: 10 },
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PDF generation timeout')), 60000)
              )
            ]);
            
            // Check for cancellation after PDF generation
            if (cancelDownloadRef.current) {
              throw new Error('Download cancelled');
            }
            
            pdfGenerated = true;
          } catch (timeoutErr) {
            if (cancelDownloadRef.current) {
              console.log('❌ Download cancelled by user');
              return;
            }
            console.error('⏱️ PDF generation timed out:', timeoutErr);
            throw timeoutErr;
          }

          console.log('✅ PDF generated at:', result.uri);
          console.log('📤 Renaming PDF with proper filename...');

          // Rename the PDF to a proper filename
          const baseDir = (FileSystem as any).documentDirectory;
          const properFileName = `${fileName}.pdf`;
          const finalPdfPath = baseDir + properFileName;

          try {
            // Copy the generated PDF to our desired location with proper name
            await FileSystem.copyAsync({
              from: result.uri,
              to: finalPdfPath,
            });
            console.log('✅ PDF renamed to:', finalPdfPath);

            // Show done checkmark before sharing
            setDownloadProgress('Done!');
            setDownloadComplete(true);
            
            // Wait a moment to show the checkmark
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (cancelDownloadRef.current) {
              return;
            }

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              console.log('✅ Sharing is available');
              try {
                setShowDownloadModal(false);
                await Sharing.shareAsync(finalPdfPath, { 
                  mimeType: 'application/pdf', 
                  dialogTitle: 'Share Report'
                });
                console.log('✅ PDF shared successfully');
              } catch (shareErr) {
                console.error('Share error:', shareErr);
                setError('✅ PDF generated! Open Files app to find it.');
              }
            } else {
              console.log('⚠️ Sharing not available');
              setError('✅ PDF generated! Check your Downloads or Documents folder.');
              setShowDownloadModal(false);
            }
          } catch (renameErr) {
            if (cancelDownloadRef.current) {
              console.log('❌ Download cancelled by user');
              return;
            }
            console.error('Error renaming PDF, sharing original:', renameErr);
            // If renaming fails, show done and share the original file
            setDownloadProgress('Done!');
            setDownloadComplete(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (!cancelDownloadRef.current) {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                setShowDownloadModal(false);
              await Sharing.shareAsync(result.uri, { 
                mimeType: 'application/pdf', 
                dialogTitle: 'Share Report'
              });
              } else {
                setShowDownloadModal(false);
              }
            }
          }
        } catch (err) {
          console.error('❌ Error generating PDF:', err);
          if (!cancelDownloadRef.current) {
          if (!pdfGenerated) {
            setError('PDF generation failed. Please try again or use web version.');
          } else {
            setError('PDF was generated but sharing failed. Check your file manager.');
            }
          }
        } finally {
          console.log('🏁 PDF generation process complete');
          setShowDownloadModal(false);
          setGenerating(false);
          // Clear HTML from memory
          // Note: html variable will be garbage collected after function ends
        }
      }
      
      // Clear all data structures to free memory
      dataByMonth.clear();
      allData.length = 0;
      
    } catch (e) {
      console.error('Error generating report', e);
      if (!cancelDownloadRef.current) {
      setError('Failed to generate report. Please try again.');
      }
    } finally {
      setShowDownloadModal(false);
      setGenerating(false);
      setDownloadProgress('Reading Data...');
      setDownloadComplete(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="AquaNet" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Buoy Data Graphs</Text>
              <Text style={styles.subtitle}>Choose chart type and scroll horizontally to see more data</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Ionicons name="refresh-outline" size={20} color="#0ea5e9" />
              )}
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={styles.loadingText}>Loading graph data...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : graphData.length > 0 ? (
            <>
              {console.log('📈 GraphScreen: Rendering BuoyGraph with', graphData.length, 'data points')}
              <BuoyGraph data={graphData} />
              
              {/* Report Section - Only show when data is loaded */}
              <View style={styles.reportSection}>
                <Text style={styles.reportTitle}>Download Water Quality Report</Text>
                <Text style={styles.reportSubtitle}>Download a comprehensive report with charts and data for all available months</Text>

                <TouchableOpacity
                  style={[styles.downloadButton, generating && styles.downloadButtonDisabled]}
                  onPress={generateNarrativeReport}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="download" size={18} color="#ffffff" />
                      <Text style={styles.downloadButtonText}>Download All Months Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No graph data available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Download Progress Modal */}
      <Modal
        visible={showDownloadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDownload}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {downloadComplete ? 'Report Generated!' : 'Generating Report'}
              </Text>
            </View>
            
            <View style={styles.modalBody}>
              {downloadComplete ? (
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={80} color="#10b981" />
                </View>
              ) : (
                <ActivityIndicator size="large" color="#0ea5e9" style={styles.modalSpinner} />
              )}
              <Text style={styles.modalProgressText}>{downloadProgress}</Text>
            </View>
            
            {!downloadComplete && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelDownload}
                >
                  <Text style={styles.cancelButtonText}>Cancel Download</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'left',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    paddingHorizontal: 20,
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
  },
  reportSection: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  monthPickerContainer: {
    marginBottom: 12,
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthPickerText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  monthList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    maxHeight: 200,
  },
  monthItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  monthItemSelected: {
    backgroundColor: '#eff6ff',
  },
  monthItemText: {
    fontSize: 14,
    color: '#334155',
  },
  monthItemTextSelected: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  downloadButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingVertical: 12,
  },
  downloadButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  downloadButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 0,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
  },
  modalBody: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSpinner: {
    marginBottom: 20,
  },
  checkmarkContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalProgressText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default GraphScreen;
