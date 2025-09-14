import axios from 'axios';
import { isOnline } from './networkService';

export interface BuoyData {
  ID: string;
  Buoy: string;
  Date: string;
  Time: string;
  Latitude: string;
  Longitude: string;
  pH: string;
  'Temp (°C)': string;
  'TDS (ppm)': string;
}

export interface BuoyResponse {
  data: BuoyData[];
  totalPages: number;
  currentPage: number;
}

// Function to clean HTML tags from text
const cleanHtmlTags = (text: string): string => {
  return text.replace(/<[^>]*>/g, '').trim();
};

// Retry mechanism for API calls
const retryApiCall = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      console.log(`API call attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
};

const API_BASE_URL = 'https://dorsu.edu.ph/buoy/dashboard.php';

// Test function to check API directly
export const testApiConnection = async (): Promise<void> => {
  try {
    console.log('🧪 Testing API connection...');
    const response = await axios.get(`${API_BASE_URL}?page=1`, {
      timeout: 10000,
    });
    console.log('✅ API Response Status:', response.status);
    console.log('📄 Response Data Length:', response.data.length);
    console.log('📋 First 500 characters of response:', response.data.substring(0, 500));
  } catch (error) {
    console.error('❌ API Test Failed:', error);
  }
};

export const fetchBuoyData = async (page: number = 1, buoyFilter?: string, dateFilter?: string): Promise<BuoyResponse> => {
  try {
    console.log(`🌐 Fetching data from API: ${API_BASE_URL}?page=${page}`);
    
    // Check network connectivity first
    const online = await isOnline();
    if (!online) {
      throw new Error('No internet connection available');
    }

    const response = await retryApiCall(() => 
      axios.get(`${API_BASE_URL}?page=${page}`, {
        timeout: 10000, // 10 second timeout
      })
    );
    
    console.log(`📡 API Response status: ${response.status}`);
    console.log(`📄 Response data length: ${response.data.length} characters`);
    
    // Parse the HTML response to extract table data
    const htmlContent = response.data;
    
    // Extract table rows using regex
    const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gs;
    const rows = htmlContent.match(tableRowRegex) || [];
    
    console.log(`🔍 Found ${rows.length} table rows in HTML`);
    
    let buoyData: BuoyData[] = [];
    
    rows.forEach((row: string, index: number) => {
      // Skip header row
      if (index === 0) {
        console.log('📋 Header row:', row.substring(0, 200) + '...');
        return;
      }
      
      // Extract cell data
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
      const cells = [...row.matchAll(cellRegex)].map(match => match[1].trim());
      
      console.log(`📊 Row ${index}: Found ${cells.length} cells`);
      
      if (cells.length >= 9) {
        const parsedData = {
          ID: cleanHtmlTags(cells[0]),
          Buoy: cleanHtmlTags(cells[1]),
          Date: cleanHtmlTags(cells[2]),
          Time: cleanHtmlTags(cells[3]),
          Latitude: cleanHtmlTags(cells[4]),
          Longitude: cleanHtmlTags(cells[5]),
          pH: cleanHtmlTags(cells[6]),
          'Temp (°C)': cleanHtmlTags(cells[7]),
          'TDS (ppm)': cleanHtmlTags(cells[8])
        };
        
        console.log(`✅ Parsed data row ${index}:`, parsedData);
        console.log(`🕐 Raw time data: "${parsedData.Time}"`);
        buoyData.push(parsedData);
      } else {
        console.log(`⚠️ Row ${index} has insufficient cells (${cells.length}/9):`, cells);
      }
    });
    
    // Apply filters
    if (buoyFilter) {
      buoyData = buoyData.filter(data => {
        const buoyName = data.Buoy.trim();
        const match = buoyName.match(/Buoy\s*(\d+)/i);
        return match && match[1] === buoyFilter;
      });
    }
    
    if (dateFilter) {
      const now = new Date();
      buoyData = buoyData.filter(data => {
        const dataDate = new Date(data.Date);
        
        switch (dateFilter) {
          case 'today':
            return dataDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return dataDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return dataDate >= monthAgo;
          default:
            return true;
        }
      });
    }
    
    // Extract pagination info
    const paginationRegex = /page=(\d+)/g;
    const pageMatches = [...htmlContent.matchAll(paginationRegex)];
    const totalPages = pageMatches.length > 0 ? Math.max(...pageMatches.map(m => parseInt(m[1]))) : 1;
    
    console.log(`🎯 Final result: ${buoyData.length} buoy records parsed`);
    console.log('📊 Sample parsed data:', buoyData.slice(0, 2));
    
    return {
      data: buoyData,
      totalPages,
      currentPage: page
    };
  } catch (error) {
    console.error('❌ Error fetching buoy data:', error);
    throw error;
  }
};

export const getLatestBuoyData = async (): Promise<BuoyData | null> => {
  try {
    const response = await fetchBuoyData(1);
    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error('Error fetching latest buoy data:', error);
    return null;
  }
};

export const getLatestBuoyDataForGraph = async (count: number = 20): Promise<BuoyData[]> => {
  try {
    console.log('🔍 Starting to fetch buoy data for graph...');
    
    // Limit count to prevent performance issues
    const maxCount = Math.min(count, 50);
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from multiple pages until we have enough data points
    while (allData.length < maxCount && page <= 10) { // Increased to 10 pages max for more data
      console.log(`📄 Fetching page ${page}...`);
      const response = await fetchBuoyData(page);
      console.log(`📊 Page ${page} returned ${response.data.length} records`);
      
      if (response.data.length > 0) {
        console.log('📋 Sample data from page:', response.data[0]);
      }
      
      allData.push(...response.data);
      
      if (response.data.length === 0) {
        console.log('🛑 No more data found, stopping...');
        break; // No more data
      }
      page++;
    }
    
    console.log(`✅ Total data fetched: ${allData.length} records`);
    console.log('📈 Returning data for graph:', allData.slice(0, maxCount).length, 'records');
    
    // Return the latest 'maxCount' data points
    return allData.slice(0, maxCount);
  } catch (error) {
    console.error('❌ Error fetching buoy data for graph:', error);
    return [];
  }
};

export const getAvailableBuoyNumbers = async (): Promise<number[]> => {
  try {
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from multiple pages to get all available buoys
    while (true) { // Fetch all available pages
      const response = await fetchBuoyData(page);
      allData.push(...response.data);
      
      if (response.data.length === 0) break; // No more data
      page++;
    }
    
    console.log('Total data fetched:', allData.length);
    console.log('Unique buoy names:', [...new Set(allData.map(d => d.Buoy))]);
    
    // Extract unique buoy numbers
    const buoyNumbers = new Set<number>();
    
    allData.forEach(data => {
      const buoyName = data.Buoy.trim();
      // Extract number from "Buoy X" format
      const match = buoyName.match(/Buoy\s*(\d+)/i);
      if (match) {
        buoyNumbers.add(parseInt(match[1]));
      }
    });
    
    // Convert to array and sort
    const result = Array.from(buoyNumbers).sort((a, b) => a - b);
    console.log('Available buoy numbers found:', result);
    console.log('Sample buoy names from data:', allData.slice(0, 5).map(d => d.Buoy));
    return result;
  } catch (error) {
    console.error('Error fetching available buoy numbers:', error);
    return [];
  }
};

export const getLatestBuoyDataForMultipleBuoys = async (buoyCount: number = 1): Promise<BuoyData[]> => {
  try {
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from multiple pages to get enough data for all buoys
    while (allData.length < buoyCount * 10) { // Fetch more data to ensure we have latest for each buoy
      const response = await fetchBuoyData(page);
      allData.push(...response.data);
      
      if (response.data.length === 0) break; // No more data
      page++;
    }
    
    // Group data by buoy and get the latest entry for each
    const buoyMap = new Map<string, BuoyData>();
    
    allData.forEach(data => {
      const buoyName = data.Buoy;
      if (!buoyMap.has(buoyName) || new Date(`${data.Date} ${data.Time}`) > new Date(`${buoyMap.get(buoyName)!.Date} ${buoyMap.get(buoyName)!.Time}`)) {
        buoyMap.set(buoyName, data);
      }
    });
    
    // Convert map to array and sort by buoy name
    const latestBuoyData = Array.from(buoyMap.values())
      .sort((a, b) => a.Buoy.localeCompare(b.Buoy))
      .slice(0, buoyCount);
    
    return latestBuoyData;
  } catch (error) {
    console.error('Error fetching latest buoy data for multiple buoys:', error);
    return [];
  }
};

export const getLatestBuoyDataForSpecificBuoy = async (buoyNumber: number): Promise<BuoyData | null> => {
  try {
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from multiple pages to get enough data
    while (true) { // Fetch all available pages to ensure we get the buoy data
      const response = await fetchBuoyData(page);
      allData.push(...response.data);
      
      if (response.data.length === 0) break; // No more data
      page++;
    }
    
    // Filter data for the specific buoy and get the latest entry
    const buoyData = allData.filter(data => {
      const buoyName = data.Buoy.trim();
      const match = buoyName.match(/Buoy\s*(\d+)/i);
      return match && parseInt(match[1]) === buoyNumber;
    });
    
    console.log(`Looking for Buoy ${buoyNumber}, found ${buoyData.length} entries`);
    if (buoyData.length > 0) {
      console.log('Sample buoy data:', buoyData[0]);
    }
    
    if (buoyData.length === 0) {
      return null;
    }
    
    // Get the latest entry for this buoy
    const latestData = buoyData.reduce((latest, current) => {
      const latestDate = new Date(`${latest.Date} ${latest.Time}`);
      const currentDate = new Date(`${current.Date} ${current.Time}`);
      return currentDate > latestDate ? current : latest;
    });
    
    return latestData;
  } catch (error) {
    console.error('Error fetching latest buoy data for specific buoy:', error);
    return null;
  }
};

export const getAllBuoyData = async (maxPages: number = 50): Promise<BuoyData[]> => {
  try {
    const allData: BuoyData[] = [];
    let page = 1;
    let hasMoreData = true;
    
    console.log('Starting to fetch all buoy data...');
    
    // Fetch all available pages with a safety limit
    while (hasMoreData && page <= maxPages) { // Add safety limit to prevent infinite loops
      const response = await fetchBuoyData(page);
      
      if (response.data.length === 0) {
        hasMoreData = false;
        console.log(`No more data found at page ${page}`);
      } else {
        allData.push(...response.data);
        console.log(`Fetched ${response.data.length} records from page ${page}`);
        page++;
      }
    }
    
    console.log(`Total data fetched: ${allData.length} records`);
    
    // Sort by date and time (newest first)
    const sortedData = allData.sort((a, b) => {
      const dateA = new Date(`${a.Date} ${a.Time}`);
      const dateB = new Date(`${b.Date} ${b.Time}`);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sortedData;
  } catch (error) {
    console.error('Error fetching all buoy data:', error);
    return [];
  }
};

export const getAllBuoyDataForCSV = async (maxPages: number = 50): Promise<string> => {
  try {
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from all pages with safety limit
    while (page <= maxPages) {
      const response = await fetchBuoyData(page);
      allData.push(...response.data);
      
      if (response.data.length === 0) break; // No more data
      page++;
    }
    
    // Convert to CSV format
    const csvHeaders = 'ID,Buoy,Date,Time,Latitude,Longitude,pH,Temp (°C),TDS (ppm)\n';
    const csvRows = allData.map(item => 
      `"${item.ID}","${item.Buoy}","${item.Date}","${item.Time}","${item.Latitude}","${item.Longitude}","${item.pH}","${item['Temp (°C)']}","${item['TDS (ppm)']}"`
    ).join('\n');
    
    return csvHeaders + csvRows;
  } catch (error) {
    console.error('Error fetching all buoy data for CSV:', error);
    throw error;
  }
};

export const getAvailableMonthsFromAPI = async (maxPages: number = 50): Promise<{ months: string[]; years: string[] }> => {
  try {
    console.log('🔍 Fetching available months and years from API...');
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from all pages with safety limit
    while (page <= maxPages) {
      const response = await fetchBuoyData(page);
      allData.push(...response.data);
      
      if (response.data.length === 0) break; // No more data
      page++;
    }
    
    console.log(`📊 Total records fetched: ${allData.length}`);
    
    // Extract unique months and years
    const months = new Set<string>();
    const years = new Set<string>();
    
    allData.forEach(item => {
      try {
        const dateStr = item.Date.trim();
        const timeStr = item.Time.trim();
        
        // Handle different date formats more carefully
        let date;
        if (dateStr.includes('/')) {
          // Format: MM/DD/YYYY or DD/MM/YYYY
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // Assume MM/DD/YYYY format
            const month = parseInt(parts[0]);
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            // Validate reasonable date ranges
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
              date = new Date(year, month - 1, day);
            }
          }
        } else if (dateStr.includes('-')) {
          // Format: YYYY-MM-DD
          date = new Date(dateStr);
        } else {
          // Try parsing as is
          date = new Date(`${dateStr} ${timeStr}`);
        }
        
        if (date && !isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
          const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const year = date.getFullYear().toString();
          
          months.add(monthYear);
          years.add(year);
        } else {
          console.warn('Invalid or out-of-range date:', dateStr, timeStr, date);
        }
      } catch (error) {
        console.warn('Error parsing date:', item.Date, item.Time, error);
      }
    });
    
    // Convert to arrays and sort
    const sortedMonths = Array.from(months).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    const sortedYears = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)); // Newest first
    
    console.log('📅 Available months:', sortedMonths);
    console.log('📅 Available years:', sortedYears);
    
    return {
      months: sortedMonths,
      years: sortedYears
    };
  } catch (error) {
    console.error('❌ Error fetching available months from API:', error);
    return { months: [], years: [] };
  }
};
