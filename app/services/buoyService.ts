import axios from 'axios';

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

const API_BASE_URL = 'https://dorsu.edu.ph/buoy/dashboard.php';

export const fetchBuoyData = async (page: number = 1, buoyFilter?: string, dateFilter?: string): Promise<BuoyResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}?page=${page}`);
    
    // Parse the HTML response to extract table data
    const htmlContent = response.data;
    
    // Extract table rows using regex
    const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gs;
    const rows = htmlContent.match(tableRowRegex) || [];
    
    let buoyData: BuoyData[] = [];
    
    rows.forEach((row: string, index: number) => {
      // Skip header row
      if (index === 0) return;
      
      // Extract cell data
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
      const cells = [...row.matchAll(cellRegex)].map(match => match[1].trim());
      
      if (cells.length >= 9) {
        buoyData.push({
          ID: cleanHtmlTags(cells[0]),
          Buoy: cleanHtmlTags(cells[1]),
          Date: cleanHtmlTags(cells[2]),
          Time: cleanHtmlTags(cells[3]),
          Latitude: cleanHtmlTags(cells[4]),
          Longitude: cleanHtmlTags(cells[5]),
          pH: cleanHtmlTags(cells[6]),
          'Temp (°C)': cleanHtmlTags(cells[7]),
          'TDS (ppm)': cleanHtmlTags(cells[8])
        });
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
    
    return {
      data: buoyData,
      totalPages,
      currentPage: page
    };
  } catch (error) {
    console.error('Error fetching buoy data:', error);
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
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from multiple pages until we have enough data points
    while (allData.length < count && page <= 10) { // Increased to 10 pages max for more data
      const response = await fetchBuoyData(page);
      allData.push(...response.data);
      
      if (response.data.length === 0) break; // No more data
      page++;
    }
    
    // Return the latest 'count' data points
    return allData.slice(0, count);
  } catch (error) {
    console.error('Error fetching buoy data for graph:', error);
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

export const getAllBuoyData = async (): Promise<BuoyData[]> => {
  try {
    const allData: BuoyData[] = [];
    let page = 1;
    let hasMoreData = true;
    
    console.log('Starting to fetch all buoy data...');
    
    // Fetch all available pages
    while (hasMoreData) { // Fetch all available data
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

export const getAllBuoyDataForCSV = async (): Promise<string> => {
  try {
    const allData: BuoyData[] = [];
    let page = 1;
    
    // Fetch data from all pages
    while (true) {
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
