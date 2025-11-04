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

      const intro = `The water quality monitoring activity for ${selectedMonth} utilized ${buoyList} to assess conditions within the observed aquatic area. Key parameters recorded included pH, temperature, and total dissolved solids (TDS), with each measurement associated to latitude/longitude for spatial reference.`;

      const methodology = firstRec && lastRec
        ? `Measurements were captured automatically between ${firstRec?.Time || ''} and ${lastRec?.Time || ''} on ${firstRec?.Date || ''}. Sampling frequency is nominally periodic based on buoy availability, and all records were stored in the AquaNet monitoring repository for analysis.`
        : `Measurements were captured automatically and stored in the AquaNet monitoring repository for analysis.`;

      const results = [
        `Across ${monthData.length} valid records, the average pH was ${fmt2(phStats.avg)} (range ${fmt2(phStats.min)}–${fmt2(phStats.max)}).`,
        `Average temperature was ${fmt2(tempStats.avg)}°C (range ${fmt2(tempStats.min)}–${fmt2(tempStats.max)}°C) and average TDS was ${fmt2(tdsStats.avg)} ppm (range ${fmt2(tdsStats.min)}–${fmt2(tdsStats.max)} ppm).`,
        phMaxRow ? `The highest pH (${fmt2(phStats.max)}) occurred on ${phMaxRow.Date} at ${phMaxRow.Time} (${phMaxRow.Buoy}).` : '',
        phMinRow ? `The lowest pH (${fmt2(phStats.min)}) occurred on ${phMinRow.Date} at ${phMinRow.Time} (${phMinRow.Buoy}).` : '',
        tempMaxRow ? `Peak temperature (${fmt2(tempStats.max)}°C) was noted on ${tempMaxRow.Date} at ${tempMaxRow.Time} (${tempMaxRow.Buoy}).` : '',
        tdsMaxRow ? `Peak TDS (${fmt2(tdsStats.max)} ppm) was recorded on ${tdsMaxRow.Date} at ${tdsMaxRow.Time} (${tdsMaxRow.Buoy}).` : '',
        phOut ? `${phOut} pH readings fell outside the commonly accepted range of 6.5–8.5.` : '',
        hotTemp ? `${hotTemp} temperature readings exceeded 35°C.` : '',
        highTds ? `${highTds} TDS readings exceeded 300 ppm.` : '',
        zeroRows.length ? `A total of ${zeroRows.length} early records contained zero values across parameters, which may indicate sensor initialization or transmission artifacts.` : ''
      ].filter(Boolean).join(' ');

      const conclusion = `Overall, the dataset indicates moderate TDS with variable pH and temperature conditions during the observation window. We recommend verifying sensor calibration and continuing periodic observations to confirm trends and contextualize short‑term variability.`;

      // Prepare inline SVG line graph for pH, Temp, and TDS across the month
      const chartDataSorted = timeSorted;
      const phSeries = chartDataSorted.map(d => toNum(d.pH));
      const tempSeries = chartDataSorted.map(d => toNum(d['Temp (°C)']));
      const tdsSeries = chartDataSorted.map(d => toNum(d['TDS (ppm)']));

      const chartWidth = 640;
      const chartHeight = 260;
      const pad = 32;

      const finiteMin = (arr: number[]) => arr.filter(n => Number.isFinite(n)).reduce((m, v) => Math.min(m, v), Number.POSITIVE_INFINITY);
      const finiteMax = (arr: number[]) => arr.filter(n => Number.isFinite(n)).reduce((m, v) => Math.max(m, v), Number.NEGATIVE_INFINITY);

      const yMinC = Math.min(
        Number.isFinite(finiteMin(phSeries)) ? finiteMin(phSeries) : 0,
        Number.isFinite(finiteMin(tempSeries)) ? finiteMin(tempSeries) : 0,
        Number.isFinite(finiteMin(tdsSeries)) ? finiteMin(tdsSeries) : 0,
      );
      const yMaxC = Math.max(
        Number.isFinite(finiteMax(phSeries)) ? finiteMax(phSeries) : 1,
        Number.isFinite(finiteMax(tempSeries)) ? finiteMax(tempSeries) : 1,
        Number.isFinite(finiteMax(tdsSeries)) ? finiteMax(tdsSeries) : 1,
      );
      const yMinSafe = isFinite(yMinC) ? yMinC : 0;
      const yMaxSafe = isFinite(yMaxC) && yMaxC !== yMinC ? yMaxC : yMinSafe + 1;

      const xStep = chartDataSorted.length > 1 ? (chartWidth - 2 * pad) / (chartDataSorted.length - 1) : 0;
      const scaleX = (i: number) => pad + i * xStep;
      const scaleY = (v: number) => {
        const t = (v - yMinSafe) / (yMaxSafe - yMinSafe);
        return chartHeight - pad - t * (chartHeight - 2 * pad);
      };
      const toPoints = (series: number[]) => series
        .map((v, i) => ({ v, i }))
        .filter(p => Number.isFinite(p.v))
        .map(p => `${scaleX(p.i)},${scaleY(p.v)}`)
        .join(' ');

      const phPoints = toPoints(phSeries);
      const tempPoints = toPoints(tempSeries);
      const tdsPoints = toPoints(tdsSeries);
      const yLabelLow = fmt2(yMinSafe);
      const yLabelMid = fmt2((yMinSafe + yMaxSafe) / 2);
      const yLabelHigh = fmt2(yMaxSafe);

      const chartSvg = `
        <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>
          <line x1="${pad}" y1="${chartHeight - pad}" x2="${chartWidth - pad}" y2="${chartHeight - pad}" stroke="#cbd5e1" stroke-width="1"/>
          <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${chartHeight - pad}" stroke="#cbd5e1" stroke-width="1"/>
          <text x="6" y="${chartHeight - pad + 4}" font-family="Arial" font-size="10" fill="#334155">${yLabelLow}</text>
          <text x="6" y="${(scaleY((yMinSafe + yMaxSafe) / 2)) + 4}" font-family="Arial" font-size="10" fill="#334155">${yLabelMid}</text>
          <text x="6" y="${pad + 4}" font-family="Arial" font-size="10" fill="#334155">${yLabelHigh}</text>
          ${phPoints ? `<polyline fill="none" stroke="#2563eb" stroke-width="2" points="${phPoints}" />` : ''}
          ${tempPoints ? `<polyline fill="none" stroke="#ef4444" stroke-width="2" points="${tempPoints}" />` : ''}
          ${tdsPoints ? `<polyline fill="none" stroke="#10b981" stroke-width="2" points="${tdsPoints}" />` : ''}
          <rect x="${chartWidth - pad - 180}" y="${pad - 22}" width="170" height="18" fill="#ffffff" stroke="#e2e8f0" />
          <circle cx="${chartWidth - pad - 165}" cy="${pad - 13}" r="3" fill="#2563eb"/>
          <text x="${chartWidth - pad - 156}" y="${pad - 10}" font-family="Arial" font-size="10" fill="#334155">pH</text>
          <circle cx="${chartWidth - pad - 120}" cy="${pad - 13}" r="3" fill="#ef4444"/>
          <text x="${chartWidth - pad - 111}" y="${pad - 10}" font-family="Arial" font-size="10" fill="#334155">Temp (°C)</text>
          <circle cx="${chartWidth - pad - 50}" cy="${pad - 13}" r="3" fill="#10b981"/>
          <text x="${chartWidth - pad - 41}" y="${pad - 10}" font-family="Arial" font-size="10" fill="#334155">TDS</text>
        </svg>
      `;
      // Also build a PNG chart via QuickChart for better Word compatibility
      const capped = timeSorted.slice(-100);
      const labels = capped.map(d => `${d.Date.split('-').slice(1).join('-')} ${d.Time}`);
      const phData = capped.map(d => toNum(d.pH));
      const tempData = capped.map(d => toNum(d['Temp (°C)']));
      const tdsData = capped.map(d => toNum(d['TDS (ppm)']));
      const qcConfig = {
        type: 'line',
        data: { labels, datasets: [
          { label: 'pH', data: phData, borderColor: '#2563eb', fill: false },
          { label: 'Temp (°C)', data: tempData, borderColor: '#ef4444', fill: false },
          { label: 'TDS (ppm)', data: tdsData, borderColor: '#10b981', fill: false },
        ]},
        options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: false } } }
      };
      const qcUrl = `https://quickchart.io/chart?width=800&height=300&format=png&chart=${encodeURIComponent(JSON.stringify(qcConfig))}`;
      let chartImgTag = '';
      try {
        const targetDir = ((FileSystem as any).cacheDirectory) || ((FileSystem as any).documentDirectory) || '';
        const chartPath = targetDir + `chart_${Date.now()}.png`;
        const dl = await (FileSystem as any).downloadAsync(qcUrl, chartPath);
        const base64 = await (FileSystem as any).readAsStringAsync(dl.uri, { encoding: 'base64' });
        chartImgTag = `<img src="data:image/png;base64,${base64}" alt="Line graph" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:6px;" />`;
      } catch (e) {
        chartImgTag = `<div>${chartSvg}</div>`; // fallback to inline SVG
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

      const html = `
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>AquaNet Narrative Report - ${selectedMonth}</title>
          </head>
          <body>
            <h1 style="font-family:Arial;color:#000000;">AquaNet Narrative Report</h1>
            <h2 style="font-family:Arial;">${selectedMonth}</h2>
            <h3 style="font-family:Arial;color:#000000;">Introduction</h3>
            <p style="font-family:Arial;color:#000000;line-height:1.6;">${intro}</p>
            <h3 style="font-family:Arial;color:#000000;">Methodology</h3>
            <p style="font-family:Arial;color:#000000;line-height:1.6;">${methodology}</p>
            <h3 style="font-family:Arial;color:#000000;">Results and Discussion</h3>
            <p style="font-family:Arial;color:#000000;line-height:1.6;">${results}</p>
            <h3 style="font-family:Arial;color:#000000;">Conclusion</h3>
            <p style="font-family:Arial;color:#000000;line-height:1.6;">${conclusion}</p>

            <h3 style=\"font-family:Arial;color:#000000;\">Line Graph Overview</h3>
            <div>${chartImgTag}</div>
            <table style="border-collapse:collapse;font-family:Arial;font-size:12px;">
              <thead>
                <tr>
                  <th style="padding:6px;border:1px solid #e5e7eb;background:#f1f5f9;">Buoy</th>
                  <th style="padding:6px;border:1px solid #e5e7eb;background:#f1f5f9;">Date</th>
                  <th style="padding:6px;border:1px solid #e5e7eb;background:#f1f5f9;">Time</th>
                  <th style="padding:6px;border:1px solid #e5e7eb;background:#f1f5f9;">pH</th>
                  <th style="padding:6px;border:1px solid #e5e7eb;background:#f1f5f9;">Temp (°C)</th>
                  <th style="padding:6px;border:1px solid #e5e7eb;background:#f1f5f9;">TDS (ppm)</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </body>
        </html>`;

      // Save as .doc (Word can open HTML with .doc extension)
      const fileName = `AquaNet_Narrative_Report_${selectedMonth.replace(/\s/g, '_')}.doc`;

      if (Platform.OS === 'web') {
        // Web: use Blob and trigger download
        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const baseDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
        if (!baseDir) {
          // As a last resort on native, try to share from a data URI by writing to cache with a generated path
          const tmpPath = `${Date.now()}_${fileName}`;
          const uri = (((FileSystem as any).cacheDirectory) || '') + tmpPath;
          await FileSystem.writeAsStringAsync(uri, html, { encoding: 'utf8' });
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, { mimeType: 'application/msword', dialogTitle: 'Share Report' });
          } else {
            console.log('Report saved to:', uri);
          }
        } else {
          const fileUri = baseDir + fileName;
          await FileSystem.writeAsStringAsync(fileUri, html, { encoding: 'utf8' });
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, { mimeType: 'application/msword', dialogTitle: 'Share Report' });
          } else {
            console.log('Report saved to:', fileUri);
          }
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
                  <Text style={styles.downloadButtonText}>Download .doc</Text>
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
