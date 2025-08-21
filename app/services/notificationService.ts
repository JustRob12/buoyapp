import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { settingsService } from './settingsService';
import { BuoyData } from './buoyService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private lastNotificationTime: number = 0;
  private readonly NOTIFICATION_COOLDOWN = 30000; // 30 seconds cooldown between notifications

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Configure for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('buoy-data', {
          name: 'Buoy Data Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Check if notifications are enabled in settings
  isNotificationsEnabled(): boolean {
    return settingsService.isNotificationsEnabled();
  }

  // Send notification for new buoy data
  async sendNewDataNotification(buoyData: BuoyData): Promise<void> {
    if (!this.isNotificationsEnabled()) {
      return; // Don't send notifications if disabled in settings
    }

    // Check cooldown to prevent spam
    const now = Date.now();
    if (now - this.lastNotificationTime < this.NOTIFICATION_COOLDOWN) {
      return;
    }

    try {
      // Request permissions if not already granted
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      // Format the notification message
      const buoyName = buoyData.Buoy;
      const temperature = buoyData['Temp (°C)'];
      const ph = buoyData.pH;
      const tds = buoyData['TDS (ppm)'];

      const message = `New data from ${buoyName}: ${temperature}°C, pH ${ph}, TDS ${tds} ppm`;

      // Send the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Buoy Data Available',
          body: message,
          data: { buoyData },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      this.lastNotificationTime = now;
      console.log('Notification sent for new buoy data');
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Send notification for multiple buoys
  async sendMultipleBuoysNotification(buoyDataArray: BuoyData[]): Promise<void> {
    if (!this.isNotificationsEnabled() || buoyDataArray.length === 0) {
      return;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastNotificationTime < this.NOTIFICATION_COOLDOWN) {
      return;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      const buoyCount = buoyDataArray.length;
      const message = `New data from ${buoyCount} buoy${buoyCount > 1 ? 's' : ''} available`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Multiple Buoy Updates',
          body: message,
          data: { buoyDataArray },
          sound: 'default',
        },
        trigger: null,
      });

      this.lastNotificationTime = now;
      console.log(`Notification sent for ${buoyCount} buoys`);
    } catch (error) {
      console.error('Error sending multiple buoys notification:', error);
    }
  }

  // Send notification for data refresh
  async sendDataRefreshNotification(): Promise<void> {
    if (!this.isNotificationsEnabled()) {
      return;
    }

    const now = Date.now();
    if (now - this.lastNotificationTime < this.NOTIFICATION_COOLDOWN) {
      return;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Buoy Data Refreshed',
          body: 'Latest buoy data has been updated',
          sound: 'default',
        },
        trigger: null,
      });

      this.lastNotificationTime = now;
      console.log('Data refresh notification sent');
    } catch (error) {
      console.error('Error sending refresh notification:', error);
    }
  }

  // Send notification for connection issues
  async sendConnectionErrorNotification(): Promise<void> {
    if (!this.isNotificationsEnabled()) {
      return;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Connection Error',
          body: 'Unable to fetch buoy data. Please check your connection.',
          sound: 'default',
        },
        trigger: null,
      });

      console.log('Connection error notification sent');
    } catch (error) {
      console.error('Error sending connection error notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // Get notification permissions status
  async getPermissionsStatus(): Promise<{ status: string; granted: boolean }> {
    try {
      const result = await Notifications.getPermissionsAsync();
      return {
        status: result.status,
        granted: result.granted,
      };
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return { status: 'undetermined', granted: false };
    }
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return true; // expo-notifications is supported on all platforms
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export convenience functions
export const requestNotificationPermissions = () => notificationService.requestPermissions();
export const sendNewDataNotification = (buoyData: BuoyData) => notificationService.sendNewDataNotification(buoyData);
export const sendMultipleBuoysNotification = (buoyDataArray: BuoyData[]) => notificationService.sendMultipleBuoysNotification(buoyDataArray);
export const sendDataRefreshNotification = () => notificationService.sendDataRefreshNotification();
export const sendConnectionErrorNotification = () => notificationService.sendConnectionErrorNotification();
export const cancelAllNotifications = () => notificationService.cancelAllNotifications();
export const getPermissionsStatus = () => notificationService.getPermissionsStatus();
export const isNotificationsSupported = () => notificationService.isSupported();
export const isNotificationsEnabled = () => notificationService.isNotificationsEnabled();
