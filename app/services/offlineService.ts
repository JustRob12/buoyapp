import AsyncStorage from '@react-native-async-storage/async-storage';
import { BuoyData } from './buoyService';
import { settingsService } from './settingsService';

const OFFLINE_CACHE_KEY = 'offline_buoy_data';
const OFFLINE_CACHE_TIMESTAMP_KEY = 'offline_cache_timestamp';
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

export interface OfflineCache {
  data: BuoyData[];
  timestamp: number;
  buoyCount: number;
}

class OfflineService {
  private static instance: OfflineService;

  private constructor() {}

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  // Check if offline mode is enabled
  isOfflineModeEnabled(): boolean {
    return settingsService.isOfflineModeEnabled();
  }

  // Cache buoy data for offline use
  async cacheBuoyData(data: BuoyData[]): Promise<void> {
    if (!this.isOfflineModeEnabled()) {
      return; // Don't cache if offline mode is disabled
    }

    try {
      const cache: OfflineCache = {
        data,
        timestamp: Date.now(),
        buoyCount: data.length,
      };

      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
      await AsyncStorage.setItem(OFFLINE_CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log(`Cached ${data.length} buoy data points for offline use`);
    } catch (error) {
      console.error('Error caching buoy data:', error);
    }
  }

  // Get cached buoy data
  async getCachedBuoyData(): Promise<BuoyData[] | null> {
    if (!this.isOfflineModeEnabled()) {
      return null; // Don't use cache if offline mode is disabled
    }

    try {
      const cachedData = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      const timestamp = await AsyncStorage.getItem(OFFLINE_CACHE_TIMESTAMP_KEY);

      if (!cachedData || !timestamp) {
        return null;
      }

      const cache: OfflineCache = JSON.parse(cachedData);
      const cacheAge = Date.now() - parseInt(timestamp);
      const cacheAgeHours = cacheAge / (1000 * 60 * 60);

      // Check if cache is expired
      if (cacheAgeHours > CACHE_EXPIRY_HOURS) {
        console.log('Offline cache expired, clearing...');
        await this.clearCache();
        return null;
      }

      console.log(`Retrieved ${cache.data.length} cached buoy data points`);
      return cache.data;
    } catch (error) {
      console.error('Error retrieving cached buoy data:', error);
      return null;
    }
  }

  // Get cache info
  async getCacheInfo(): Promise<{ hasCache: boolean; dataPoints: number; age: string } | null> {
    try {
      const cachedData = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      const timestamp = await AsyncStorage.getItem(OFFLINE_CACHE_TIMESTAMP_KEY);

      if (!cachedData || !timestamp) {
        return { hasCache: false, dataPoints: 0, age: '' };
      }

      const cache: OfflineCache = JSON.parse(cachedData);
      const cacheAge = Date.now() - parseInt(timestamp);
      const cacheAgeHours = Math.floor(cacheAge / (1000 * 60 * 60));
      const cacheAgeMinutes = Math.floor((cacheAge % (1000 * 60 * 60)) / (1000 * 60));

      let ageString = '';
      if (cacheAgeHours > 0) {
        ageString = `${cacheAgeHours}h ${cacheAgeMinutes}m ago`;
      } else {
        ageString = `${cacheAgeMinutes}m ago`;
      }

      return {
        hasCache: true,
        dataPoints: cache.data.length,
        age: ageString,
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return null;
    }
  }

  // Clear cached data
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_CACHE_KEY);
      await AsyncStorage.removeItem(OFFLINE_CACHE_TIMESTAMP_KEY);
      console.log('Offline cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Check if cache is available and valid
  async isCacheAvailable(): Promise<boolean> {
    if (!this.isOfflineModeEnabled()) {
      return false;
    }

    const cacheInfo = await this.getCacheInfo();
    return cacheInfo?.hasCache || false;
  }

  // Get cache size in bytes (approximate)
  async getCacheSize(): Promise<number> {
    try {
      const cachedData = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      if (cachedData) {
        return new Blob([cachedData]).size;
      }
      return 0;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance();

// Export convenience functions
export const cacheBuoyData = (data: BuoyData[]) => offlineService.cacheBuoyData(data);
export const getCachedBuoyData = () => offlineService.getCachedBuoyData();
export const getCacheInfo = () => offlineService.getCacheInfo();
export const clearCache = () => offlineService.clearCache();
export const isCacheAvailable = () => offlineService.isCacheAvailable();
export const getCacheSize = () => offlineService.getCacheSize();
export const isOfflineModeEnabled = () => offlineService.isOfflineModeEnabled();
