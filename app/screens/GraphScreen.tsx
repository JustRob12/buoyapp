import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import BuoyGraph from '../components/BuoyGraph';
import { getLatestBuoyDataForGraph, BuoyData, testApiConnection, getAvailableMonthsFromAPI, fetchBuoyData } from '../services/buoyService';
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
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
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
    // Load available months for reporting
    (async () => {
      try {
        const { months } = await getAvailableMonthsFromAPI();
        setAvailableMonths(months);
        if (months.length > 0) setSelectedMonth(months[0]);
      } catch (e) {
        console.log('Error loading months', e);
      }
    })();
  }, []);

  const generateNarrativeReport = async () => {
    if (!selectedMonth) return;
    try {
      setGenerating(true);
      // Fetch data page-by-page from API and filter by the selected month
      const parseSelected = (label: string) => {
        // Expect formats like "Aug 2025"
        const parts = label.trim().split(/\s+/);
        if (parts.length === 2) {
          const [monStr, yearStr] = parts;
          const monthIndex = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
          } as Record<string, number>;
          const m = monthIndex[monStr as keyof typeof monthIndex];
          const y = parseInt(yearStr, 10);
          if (!isNaN(m) && !isNaN(y)) return { m, y };
        }
        const fallback = new Date(label);
        return { m: fallback.getMonth(), y: fallback.getFullYear() };
      };

      const { m: targetMonth, y: targetYear } = parseSelected(selectedMonth);
      const targetPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-`;
      const monthData: BuoyData[] = [];
      let page = 1;
      let hasMore = true;

      const recordMatchesTargetMonth = (dateStr: string, timeStr: string): boolean => {
        const trimmedDate = (dateStr || '').trim();
        const trimmedTime = (timeStr || '').trim();
        const tryDate = (d: Date | null) => !!d && !isNaN(d.getTime()) && d.getMonth() === targetMonth && d.getFullYear() === targetYear;

        if (trimmedDate.includes('/')) {
          const parts = trimmedDate.split('/');
          if (parts.length === 3) {
            const a = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10)); // MM/DD/YYYY
            if (tryDate(a)) return true;
            const b = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)); // DD/MM/YYYY
            if (tryDate(b)) return true;
          }
        } else if (trimmedDate.includes('-')) {
          // Fast path for format YYYY-MM-DD: string prefix match avoids timezone issues
          if (trimmedDate.startsWith(targetPrefix)) return true;
          // Fallback to date parsing if prefix fails
          const d = new Date(trimmedDate);
          if (tryDate(d)) return true;
        } else {
          const d = new Date(`${trimmedDate} ${trimmedTime}`);
          if (tryDate(d)) return true;
        }
        return false;
      };

      while (hasMore && page <= 100) {
        const response = await fetchBuoyData(page);
        if (response.data.length === 0) {
          hasMore = false;
          break;
        }
        for (const rec of response.data) {
          if (recordMatchesTargetMonth(rec.Date, rec.Time)) {
            monthData.push(rec);
          }
        }
        page++;
      }

      // Build a professional narrative from stats
      const toNum = (v: string | number) => {
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
        return Number.isFinite(n) ? n : NaN;
      };
      const vals = {
        ph: monthData.map(d => toNum(d.pH)).filter(n => !isNaN(n)),
        temp: monthData.map(d => toNum(d['Temp (°C)'])).filter(n => !isNaN(n)),
        tds: monthData.map(d => toNum(d['TDS (ppm)'])).filter(n => !isNaN(n)),
      };
      const agg = (arr: number[]) => ({
        avg: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN,
        min: arr.length ? Math.min(...arr) : NaN,
        max: arr.length ? Math.max(...arr) : NaN,
      });
      const phStats = agg(vals.ph);
      const tempStats = agg(vals.temp);
      const tdsStats = agg(vals.tds);
      const fmt2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '—');
      const findRowByValue = (key: 'ph' | 'temp' | 'tds', value: number) =>
        monthData.find(d => {
          const v = key === 'ph' ? toNum(d.pH) : key === 'temp' ? toNum(d['Temp (°C)']) : toNum(d['TDS (ppm)']);
          return v === value;
        });
      const phMaxRow = Number.isFinite(phStats.max) ? findRowByValue('ph', phStats.max) : undefined;
      const phMinRow = Number.isFinite(phStats.min) ? findRowByValue('ph', phStats.min) : undefined;
      const tempMaxRow = Number.isFinite(tempStats.max) ? findRowByValue('temp', tempStats.max) : undefined;
      const tdsMaxRow = Number.isFinite(tdsStats.max) ? findRowByValue('tds', tdsStats.max) : undefined;

      // Basic anomaly counts
      const phOut = vals.ph.filter(v => v < 6.5 || v > 8.5).length;
      const hotTemp = vals.temp.filter(v => v > 35).length;
      const highTds = vals.tds.filter(v => v > 300).length;

      // Derive time window and buoy context
      const timeSorted = [...monthData].sort((a, b) => new Date(`${a.Date} ${a.Time}`).getTime() - new Date(`${b.Date} ${b.Time}`).getTime());
      const firstRec = timeSorted[0];
      const lastRec = timeSorted[timeSorted.length - 1];
      const buoysSet = Array.from(new Set(monthData.map(d => d.Buoy)));
      const buoyList = buoysSet.length === 1 ? buoysSet[0] : `${buoysSet.length} buoys`;
      const zeroRows = monthData.filter(d => toNum(d.pH) === 0 && toNum(d['Temp (°C)']) === 0 && toNum(d['TDS (ppm)']) === 0);

      // Build single professional narrative paragraph
      const timeRange = firstRec && lastRec
        ? `from ${firstRec?.Time || ''} on ${firstRec?.Date || ''} to ${lastRec?.Time || ''} on ${lastRec?.Date || ''}`
        : `throughout ${selectedMonth}`;

      const extremeEvents: string[] = [];
      if (phMaxRow) extremeEvents.push(`maximum pH of ${fmt2(phStats.max)} on ${phMaxRow.Date} at ${phMaxRow.Time} (${phMaxRow.Buoy})`);
      if (phMinRow) extremeEvents.push(`minimum pH of ${fmt2(phStats.min)} on ${phMinRow.Date} at ${phMinRow.Time} (${phMinRow.Buoy})`);
      if (tempMaxRow) extremeEvents.push(`peak temperature of ${fmt2(tempStats.max)}°C on ${tempMaxRow.Date} at ${tempMaxRow.Time} (${tempMaxRow.Buoy})`);
      if (tdsMaxRow) extremeEvents.push(`highest TDS concentration of ${fmt2(tdsStats.max)} ppm on ${tdsMaxRow.Date} at ${tdsMaxRow.Time} (${tdsMaxRow.Buoy})`);

      const anomalies: string[] = [];
      if (phOut > 0) anomalies.push(`${phOut} pH reading${phOut > 1 ? 's' : ''} outside the acceptable range of 6.5–8.5`);
      if (hotTemp > 0) anomalies.push(`${hotTemp} temperature reading${hotTemp > 1 ? 's' : ''} exceeding 35°C`);
      if (highTds > 0) anomalies.push(`${highTds} TDS measurement${highTds > 1 ? 's' : ''} surpassing 300 ppm`);

      let narrative = `During ${selectedMonth}, the AquaNet water quality monitoring system deployed ${buoyList} to conduct comprehensive assessments of aquatic conditions, capturing ${monthData.length} valid measurements ${timeRange} through automated sensor arrays that recorded pH, temperature, and total dissolved solids (TDS) parameters with associated geospatial coordinates. `;
      
      narrative += `Analysis of the dataset reveals an average pH of ${fmt2(phStats.avg)} with a range from ${fmt2(phStats.min)} to ${fmt2(phStats.max)}, while temperature measurements averaged ${fmt2(tempStats.avg)}°C (ranging from ${fmt2(tempStats.min)}°C to ${fmt2(tempStats.max)}°C) and TDS concentrations averaged ${fmt2(tdsStats.avg)} ppm (ranging from ${fmt2(tdsStats.min)} to ${fmt2(tdsStats.max)} ppm). `;
      
      if (extremeEvents.length > 0) {
        narrative += `Notable extreme values observed during this period include ${extremeEvents.join(', ')}. `;
      }
      
      if (anomalies.length > 0) {
        narrative += `Notable observations include ${anomalies.join(', ')}. `;
      }
      
      if (zeroRows.length > 0) {
        narrative += `Additionally, ${zeroRows.length} record${zeroRows.length > 1 ? 's' : ''} contained zero values across all parameters, potentially indicating sensor initialization periods or transmission artifacts. `;
      }
      
      narrative += `Overall, the monitoring period demonstrates ${phOut > 0 || hotTemp > 0 || highTds > 0 ? 'variable conditions with several parameters exceeding typical thresholds, suggesting' : 'relatively stable water quality conditions, with'} moderate TDS levels and fluctuating pH and temperature patterns that warrant continued observation and periodic sensor calibration verification to ensure data accuracy and identify long-term environmental trends.`;

      // Prepare inline SVG line graph for pH, Temp, and TDS across the month
      const chartDataSorted = timeSorted;
      const phSeries = chartDataSorted.map(d => toNum(d.pH));
      const tempSeries = chartDataSorted.map(d => toNum(d['Temp (°C)']));
      const tdsSeries = chartDataSorted.map(d => toNum(d['TDS (ppm)']));

      // Chart dimensions: Reduced size for better fit - 10 cm × 5.5 cm (at 96 DPI: 378px × 209px)
      const chartWidth = 378;
      const chartHeight = 209;
      const padLeft = 50;
      const padRight = 30;
      const padTop = 40;
      const padBottom = 50;
      const plotWidth = chartWidth - padLeft - padRight;
      const plotHeight = chartHeight - padTop - padBottom;

      const finiteMin = (arr: number[]) => arr.filter(n => Number.isFinite(n)).reduce((m, v) => Math.min(m, v), Number.POSITIVE_INFINITY);
      const finiteMax = (arr: number[]) => arr.filter(n => Number.isFinite(n)).reduce((m, v) => Math.max(m, v), Number.NEGATIVE_INFINITY);

      // Use fixed Y-axis range 0-350 to match the image
      const yMinSafe = 0;
      const yMaxSafe = 350;

      const xStep = chartDataSorted.length > 1 ? plotWidth / (chartDataSorted.length - 1) : 0;
      const scaleX = (i: number) => padLeft + i * xStep;
      const scaleY = (v: number) => {
        const t = (v - yMinSafe) / (yMaxSafe - yMinSafe);
        return padTop + plotHeight - t * plotHeight;
      };
      const toPoints = (series: number[]) => series
        .map((v, i) => ({ v, i }))
        .filter(p => Number.isFinite(p.v))
        .map(p => `${scaleX(p.i)},${scaleY(p.v)}`)
        .join(' ');

      const phPoints = toPoints(phSeries);
      const tempPoints = toPoints(tempSeries);
      const tdsPoints = toPoints(tdsSeries);
      
      // Generate Y-axis labels: 0, 50, 100, 150, 200, 250, 300, 350
      const yTicks = 7; // 0 to 350 in steps of 50
      const yLabels: string[] = [];
      const yPositions: number[] = [];
      for (let i = 0; i <= yTicks; i++) {
        const value = i * 50; // 0, 50, 100, 150, 200, 250, 300, 350
        yLabels.push(value.toString());
        yPositions.push(padTop + plotHeight - (i / yTicks) * plotHeight);
      }

      // Generate grid lines
      const gridLines = yPositions.map((y, i) => 
        i < yPositions.length - 1 ? `<line x1="${padLeft}" y1="${y}" x2="${padLeft + plotWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>` : ''
      ).join('');

      const chartSvg = `
        <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>
          ${gridLines}
          <line x1="${padLeft}" y1="${padTop + plotHeight}" x2="${padLeft + plotWidth}" y2="${padTop + plotHeight}" stroke="#374151" stroke-width="1.5"/>
          <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotHeight}" stroke="#374151" stroke-width="1.5"/>
          ${yLabels.map((label, i) => `<text x="${padLeft - 8}" y="${yPositions[i] + 4}" font-family="Arial" font-size="10" fill="#374151" text-anchor="end">${label}</text>`).join('')}
          ${phPoints ? `<polyline fill="none" stroke="#2563eb" stroke-width="2.5" points="${phPoints}" />` : ''}
          ${tempPoints ? `<polyline fill="none" stroke="#ef4444" stroke-width="2.5" points="${tempPoints}" />` : ''}
          ${tdsPoints ? `<polyline fill="none" stroke="#10b981" stroke-width="2.5" points="${tdsPoints}" />` : ''}
          <rect x="${padLeft}" y="${padTop - 25}" width="200" height="18" fill="#ffffff" stroke="none" />
          <circle cx="${padLeft + 5}" cy="${padTop - 15}" r="4" fill="#2563eb"/>
          <text x="${padLeft + 12}" y="${padTop - 11}" font-family="Arial" font-size="11" fill="#374151" font-weight="500">pH</text>
          <circle cx="${padLeft + 60}" cy="${padTop - 15}" r="4" fill="#ef4444"/>
          <text x="${padLeft + 67}" y="${padTop - 11}" font-family="Arial" font-size="11" fill="#374151" font-weight="500">Temp (°C)</text>
          <circle cx="${padLeft + 140}" cy="${padTop - 15}" r="4" fill="#10b981"/>
          <text x="${padLeft + 147}" y="${padTop - 11}" font-family="Arial" font-size="11" fill="#374151" font-weight="500">TDS (ppm)</text>
        </svg>
      `;
      // Also build a PNG chart via QuickChart for better Word compatibility
      const capped = timeSorted.slice(-100);
      const labels = capped.map(d => {
        const dateParts = d.Date.split('-');
        const timeParts = d.Time.split(':');
        return `${dateParts[1]}-${dateParts[2]} ${timeParts[0]}:${timeParts[1]}`;
      });
      const phData = capped.map(d => toNum(d.pH));
      const tempData = capped.map(d => toNum(d['Temp (°C)']));
      const tdsData = capped.map(d => toNum(d['TDS (ppm)']));
      
      // Redesigned graph with modern style - filled areas with gradient effect
      const qcConfig = {
        type: 'line',
        data: { 
          labels, 
          datasets: [
            { 
              label: 'pH', 
              data: phData, 
              borderColor: '#3b82f6', 
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            },
            { 
              label: 'Temp (°C)', 
              data: tempData, 
              borderColor: '#ef4444', 
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            },
            { 
              label: 'TDS (ppm)', 
              data: tdsData, 
              borderColor: '#10b981', 
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            },
          ]
        },
        options: { 
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 10,
              bottom: 10,
              left: 10,
              right: 10
            }
          },
          plugins: { 
            legend: { 
              position: 'top',
              align: 'center',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12,
                  family: 'Arial',
                  weight: 'bold'
                },
                color: '#1f2937'
              }
            },
            title: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: {
                size: 13,
                family: 'Arial',
                weight: 'bold'
              },
              bodyFont: {
                size: 12,
                family: 'Arial'
              },
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              cornerRadius: 6
            }
          }, 
          scales: { 
            x: {
              display: true,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.08)',
                drawBorder: true,
                borderColor: '#d1d5db',
                borderWidth: 1.5
              },
              ticks: {
                font: {
                  size: 10,
                  family: 'Arial'
                },
                maxRotation: 45,
                minRotation: 45,
                color: '#4b5563',
                padding: 8
              }
            },
            y: { 
              beginAtZero: true,
              display: true,
              min: 0,
              max: 350,
              ticks: {
                stepSize: 50,
                font: {
                  size: 11,
                  family: 'Arial',
                  weight: '500'
                },
                color: '#4b5563',
                padding: 10
              },
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.08)',
                drawBorder: true,
                borderColor: '#d1d5db',
                borderWidth: 1.5
              }
            } 
          },
          elements: {
            line: {
              tension: 0.4,
              borderJoinStyle: 'round',
              borderCapStyle: 'round'
            },
            point: {
              hoverRadius: 5,
              hoverBorderWidth: 3
            }
          }
        }
      };
       const qcUrl = `https://quickchart.io/chart?width=378&height=209&format=png&chart=${encodeURIComponent(JSON.stringify(qcConfig))}`;
       let chartImgTag = '';
       try {
         const targetDir = ((FileSystem as any).cacheDirectory) || ((FileSystem as any).documentDirectory) || '';
         const chartPath = targetDir + `chart_${Date.now()}.png`;
         const dl = await (FileSystem as any).downloadAsync(qcUrl, chartPath);
         const base64 = await (FileSystem as any).readAsStringAsync(dl.uri, { encoding: 'base64' });
         chartImgTag = `<img src="data:image/png;base64,${base64}" alt="Line graph" style="width:10cm;height:5.5cm;max-width:378px;max-height:209px;border:1px solid #d1d5db;border-radius:4px;display:block;margin:15px auto;page-break-inside:avoid;" />`;
       } catch (e) {
         chartImgTag = `<div style="width:10cm;height:5.5cm;max-width:378px;max-height:209px;margin:15px auto;text-align:center;page-break-inside:avoid;">${chartSvg}</div>`; // fallback to inline SVG
       }
      const rows = monthData.map(d => `
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
            <title>AquaNet Narrative Report - ${selectedMonth}</title>
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
            <div class="page">
              <div class="page-header">${headerImg}</div>
              <div class="content-container">
       
                <h2>${selectedMonth}</h2>
                <p>${narrative}</p>
                
                <h3>Line Graph Overview</h3>
                <div class="chart-wrapper">${chartImgTag}</div>
              </div>
            </div>
            
            <div class="page">
              <div class="content-container">
                <h3>Detailed Water Quality Data</h3>
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
      const fileName = `AquaNet_Narrative_Report_${selectedMonth.replace(/\s/g, '_')}`;

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

          {/* Narrative Report Section */}
          <View style={styles.reportSection}>
            <Text style={styles.reportTitle}>Download Narrative Report</Text>
            <Text style={styles.reportSubtitle}>Choose a month to generate a Word report</Text>

            <View style={styles.monthPickerContainer}>
              <TouchableOpacity
                style={styles.monthPicker}
                onPress={() => setShowMonthPicker(!showMonthPicker)}
                disabled={availableMonths.length === 0}
              >
                <Text style={styles.monthPickerText}>
                  {selectedMonth || 'No months available'}
                </Text>
                <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
              </TouchableOpacity>

              {showMonthPicker && (
                <View style={styles.monthList}>
                  {availableMonths.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthItem, selectedMonth === m && styles.monthItemSelected]}
                      onPress={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                    >
                      <Text style={[styles.monthItemText, selectedMonth === m && styles.monthItemTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.downloadButton, (!selectedMonth || generating) && styles.downloadButtonDisabled]}
              onPress={generateNarrativeReport}
              disabled={!selectedMonth || generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#ffffff" />
                  <Text style={styles.downloadButtonText}>Download</Text>
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
