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

export const fetchBuoyData = async (page: number = 1): Promise<BuoyResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}?page=${page}`);
    
    // Parse the HTML response to extract table data
    const htmlContent = response.data;
    
    // Extract table rows using regex
    const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gs;
    const rows = htmlContent.match(tableRowRegex) || [];
    
    const buoyData: BuoyData[] = [];
    
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
