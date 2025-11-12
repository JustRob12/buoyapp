import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import BuoyGraph from '../components/BuoyGraph';
import { getLatestBuoyDataForGraph, BuoyData, testApiConnection, fetchBuoyData } from '../services/buoyService';
import { settingsService, loadSettings } from '../services/settingsService';
import { sendMultipleBuoysNotification } from '../services/notificationService';
import { getCachedBuoyData, cacheBuoyData, isOfflineModeEnabled } from '../services/offlineService';
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

  const generateNarrativeReport = async () => {
    try {
      setGenerating(true);
      
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

      // Fetch ALL data from API to compare months
      console.log('📊 Fetching all data from API for month comparison...');
      const allData: BuoyData[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 100) {
        const response = await fetchBuoyData(page);
        if (response.data.length === 0) {
          hasMore = false;
          break;
        }
        allData.push(...response.data);
        page++;
      }

      console.log(`✅ Fetched ${allData.length} total records from API`);

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
      
      // Download pie chart images
      const downloadChartImage = async (url: string, name: string): Promise<string> => {
        try {
          const targetDir = ((FileSystem as any).cacheDirectory) || ((FileSystem as any).documentDirectory) || '';
          const chartPath = targetDir + `${name}_${Date.now()}.png`;
          const dl = await (FileSystem as any).downloadAsync(url, chartPath);
          const base64 = await (FileSystem as any).readAsStringAsync(dl.uri, { encoding: 'base64' });
          return `<img src="data:image/png;base64,${base64}" alt="${name}" style="width:100%;max-width:400px;height:auto;border:1px solid #d1d5db;border-radius:4px;display:block;margin:15px auto;page-break-inside:avoid;" />`;
        } catch (e) {
          console.error(`Error downloading ${name}:`, e);
          return `<div style="text-align:center;padding:20px;border:1px solid #d1d5db;margin:15px auto;">Error loading ${name}</div>`;
        }
      };

      // Download all pie charts for each month
      const pieChartImages = new Map<string, { ph: string; temp: string; tds: string }>();
      for (const [monthKey, urls] of pieChartUrls.entries()) {
        const [phImg, tempImg, tdsImg] = await Promise.all([
          urls.ph ? downloadChartImage(urls.ph, `ph_pie_${monthKey.replace(/\s/g, '_')}`) : Promise.resolve('<div style="text-align:center;padding:20px;">No pH data</div>'),
          urls.temp ? downloadChartImage(urls.temp, `temp_pie_${monthKey.replace(/\s/g, '_')}`) : Promise.resolve('<div style="text-align:center;padding:20px;">No Temp data</div>'),
          urls.tds ? downloadChartImage(urls.tds, `tds_pie_${monthKey.replace(/\s/g, '_')}`) : Promise.resolve('<div style="text-align:center;padding:20px;">No TDS data</div>')
        ]);
        pieChartImages.set(monthKey, { ph: phImg, temp: tempImg, tds: tdsImg });
      }

      // Download all line charts for each month
      const lineChartImages = new Map<string, string>();
      for (const [monthKey, url] of lineChartUrls.entries()) {
        const img = await downloadChartImage(url, `line_chart_${monthKey.replace(/\s/g, '_')}`);
        lineChartImages.set(monthKey, img);
      }
      // Generate table rows for all data (all months combined)
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

      // Load header and footer PNG images
      let headerImg = '';
      let footerImg = '';
      
      try {
        console.log('📸 Loading header and footer PNG images...');
        
        // Download and read PNG assets
        await headerPNGAsset.downloadAsync();
        await footerPNGAsset.downloadAsync();
        
        const headerBase64 = await FileSystem.readAsStringAsync(headerPNGAsset.localUri || headerPNGAsset.uri, { encoding: 'base64' });
        const footerBase64 = await FileSystem.readAsStringAsync(footerPNGAsset.localUri || footerPNGAsset.uri, { encoding: 'base64' });
        
        console.log('✅ Successfully loaded header and footer PNG images');
        console.log('📏 Header PNG size:', headerBase64.length);
        console.log('📏 Footer PNG size:', footerBase64.length);
        
        headerImg = `<img src="data:image/png;base64,${headerBase64}" alt="Header" style="width:100%;height:auto;display:block;margin:0;padding:0;border:none;" />`;
        footerImg = `<img src="data:image/png;base64,${footerBase64}" alt="Footer" style="width:100%;height:auto;display:block;margin:0;padding:0;border:none;" />`;
      } catch (e) {
        console.error('❌ Error loading PNG images:', e);
        // Fallback to HTML-based header and footer if images can't be loaded
        headerImg = `<div style="background:linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);color:#ffffff;padding:25px;text-align:left;margin-bottom:25px;border-radius:0;">
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
        </div>`;
        footerImg = `<div style="background:#1e293b;color:#ffffff;padding:18px;text-align:center;margin-top:40px;font-family:Arial;font-size:12px;border-top:2px solid #334155;">
          © 2025 AQUANET | Water Quality Monitoring Report
        </div>`;
      }

      const html = `
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
            ${Array.from(dataByMonth.keys()).sort((a, b) => {
              const dateA = new Date(a);
              const dateB = new Date(b);
              return dateB.getTime() - dateA.getTime();
            }).map(monthKey => {
              const pieCharts = pieChartImages.get(monthKey);
              const lineChart = lineChartImages.get(monthKey);
              return `
            <div class="page">
              <div class="page-header">${headerImg}</div>
              <div class="content-container">
                <h2>Water Quality Report - ${monthKey}</h2>
                
                <h3>Distribution Charts - ${monthKey}</h3>
                <div style="display:flex;flex-wrap:wrap;justify-content:space-around;margin:20px 0;">
                  <div style="flex:1;min-width:300px;margin:10px;">
                    <h4 style="text-align:center;font-size:11pt;margin-bottom:10px;">pH Distribution</h4>
                    ${pieCharts?.ph || '<div style="text-align:center;padding:20px;">No pH data</div>'}
                  </div>
                  <div style="flex:1;min-width:300px;margin:10px;">
                    <h4 style="text-align:center;font-size:11pt;margin-bottom:10px;">Temperature Distribution</h4>
                    ${pieCharts?.temp || '<div style="text-align:center;padding:20px;">No Temp data</div>'}
                  </div>
                  <div style="flex:1;min-width:300px;margin:10px;">
                    <h4 style="text-align:center;font-size:11pt;margin-bottom:10px;">TDS Distribution</h4>
                    ${pieCharts?.tds || '<div style="text-align:center;padding:20px;">No TDS data</div>'}
                  </div>
                </div>
              </div>
            </div>
            <div class="page">
              <div class="content-container">
                <h3>Line Graph - ${monthKey}</h3>
                <p style="font-size:9pt;color:#64748b;margin-bottom:15px;">TDS, pH, and Temperature trends over time for ${monthKey} (${dataByMonth.get(monthKey)?.length || 0} records)</p>
                <div class="chart-wrapper">${lineChart || '<div style="text-align:center;padding:20px;">No line chart data</div>'}</div>
              </div>
            </div>
            `;
            }).join('')}
            
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
          </body>
        </html>`;

      // Save as PDF
      const fileName = `AquaNet_Water_Quality_Report_All_Months`;

      if (Platform.OS === 'web') {
        // Web: use html2pdf to generate proper PDF from HTML
        try {
          console.log('📄 Starting PDF generation from HTML...');
          
          // Check if html2pdf is available
          if (typeof html2pdf === 'undefined') {
            console.log('⚠️ html2pdf not available, loading...');
            
            // Load html2pdf library dynamically
            return new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
              script.onload = async () => {
                console.log('✅ html2pdf library loaded');
                await generatePdfReport();
                resolve(true);
              };
              script.onerror = () => {
                console.error('❌ Failed to load html2pdf library');
                reject(new Error('Failed to load PDF library'));
              };
              document.head.appendChild(script);
            });
          } else {
            await generatePdfReport();
          }
          
          async function generatePdfReport() {
            // Create a temporary container for the HTML
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.width = '210mm';
            container.style.height = '297mm';
            container.innerHTML = html;
            document.body.appendChild(container);
            
            const options = {
              margin: 2,
              filename: `${fileName}.pdf`,
              image: { type: 'png', quality: 0.98 },
              html2canvas: { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: true
              },
              jsPDF: { 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'a4',
                compress: true
              },
              pagebreak: { mode: 'avoid-all' }
            };
            
            console.log('📋 PDF options configured, starting conversion...');
            
            // Convert HTML to PDF using html2pdf
            await (html2pdf as any)().set(options).from(container).save();
            
            // Clean up
            document.body.removeChild(container);
            
            console.log('✅ PDF generated and downloaded successfully');
          }
        } catch (pdfError) {
          console.error('❌ PDF generation error:', pdfError);
          setError('Failed to generate PDF. Please try again.');
        } finally {
          setGenerating(false);
        }
      } else {
        // Native: Generate PDF using expo-print
        console.log('📄 Generating PDF for mobile platform...');
        let pdfGenerated = false;
        
        try {
          console.log('📋 Starting PDF generation...');
          
          // Print HTML to PDF with timeout
          let result: any;
          try {
            result = await Promise.race([
              Print.printToFileAsync({
                html: html,
                base64: false,
                margins: { left: 10, top: 10, right: 10, bottom: 10 },
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PDF generation timeout')), 30000)
              )
            ]);
            pdfGenerated = true;
          } catch (timeoutErr) {
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

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              console.log('✅ Sharing is available');
              try {
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
            }
          } catch (renameErr) {
            console.error('Error renaming PDF, sharing original:', renameErr);
            // If renaming fails, share the original file
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(result.uri, { 
                mimeType: 'application/pdf', 
                dialogTitle: 'Share Report'
              });
            }
          }
        } catch (err) {
          console.error('❌ Error generating PDF:', err);
          if (!pdfGenerated) {
            setError('PDF generation failed. Please try again or use web version.');
          } else {
            setError('PDF was generated but sharing failed. Check your file manager.');
          }
        } finally {
          console.log('🏁 PDF generation process complete');
        }
      }
    } catch (e) {
      console.error('Error generating report', e);
      setError('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
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
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
            </TouchableOpacity>
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
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No graph data available</Text>
            </View>
          )}

          {/* Report Section */}
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
        </View>
      </ScrollView>
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
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
});

export default GraphScreen;
