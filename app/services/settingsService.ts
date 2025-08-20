import AsyncStorage from '@react-native-async-storage/async-storage';

// Settings interface
export interface AppSettings {
  autoRefreshInterval: number; // in seconds, 0 = manual only
  defaultBuoySelection: number;
  dataRetentionPoints: number;
  offlineMode: boolean;
  notificationsEnabled: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  autoRefreshInterval: 60, // 1 minute default
  defaultBuoySelection: 1,
  dataRetentionPoints: 20,
  offlineMode: false,
  notificationsEnabled: true,
};

// Settings service class
class SettingsService {
  private static instance: SettingsService;
  private settings: AppSettings = DEFAULT_SETTINGS;
  private listeners: ((settings: AppSettings) => void)[] = [];

  private constructor() {}

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // Load settings from storage
  async loadSettings(): Promise<AppSettings> {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.settings;
    }
  }

  // Save settings to storage
  async saveSettings(newSettings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      this.settings = newSettings;
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Get current settings
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  // Update a specific setting
  async updateSetting<K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ): Promise<void> {
    const newSettings = { ...this.settings, [key]: value };
    await this.saveSettings(newSettings);
  }

  // Reset settings to defaults
  async resetSettings(): Promise<void> {
    await this.saveSettings(DEFAULT_SETTINGS);
  }

  // Get specific setting values
  getAutoRefreshInterval(): number {
    return this.settings.autoRefreshInterval;
  }

  getDefaultBuoySelection(): number {
    return this.settings.defaultBuoySelection;
  }

  getDataRetentionPoints(): number {
    return this.settings.dataRetentionPoints;
  }

  isOfflineModeEnabled(): boolean {
    return this.settings.offlineMode;
  }

  isNotificationsEnabled(): boolean {
    return this.settings.notificationsEnabled;
  }

  // Subscribe to settings changes
  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of settings changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  // Format refresh interval for display
  formatRefreshInterval(seconds: number): string {
    if (seconds === 0) return 'Manual Only';
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${seconds / 60} minutes`;
    return `${seconds / 3600} hours`;
  }

  // Check if auto-refresh is enabled
  isAutoRefreshEnabled(): boolean {
    return this.settings.autoRefreshInterval > 0;
  }

  // Get refresh interval in milliseconds
  getRefreshIntervalMs(): number {
    return this.settings.autoRefreshInterval * 1000;
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance();

// Export convenience functions
export const loadSettings = () => settingsService.loadSettings();
export const saveSettings = (settings: AppSettings) => settingsService.saveSettings(settings);
export const getSettings = () => settingsService.getSettings();
export const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => 
  settingsService.updateSetting(key, value);
export const resetSettings = () => settingsService.resetSettings();
export const subscribeToSettings = (listener: (settings: AppSettings) => void) => 
  settingsService.subscribe(listener);
