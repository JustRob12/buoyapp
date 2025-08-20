import { useEffect, useRef, useCallback } from 'react';
import { settingsService, subscribeToSettings } from '../services/settingsService';

interface UseAutoRefreshOptions {
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
}

export const useAutoRefresh = ({ onRefresh, enabled = true }: UseAutoRefreshOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const settingsRef = useRef(settingsService.getSettings());

  const startAutoRefresh = useCallback(() => {
    const settings = settingsRef.current;
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start new interval if auto-refresh is enabled and interval > 0
    if (enabled && settings.autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        onRefresh();
      }, settings.autoRefreshInterval * 1000);
    }
  }, [onRefresh, enabled]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restartAutoRefresh = useCallback(() => {
    stopAutoRefresh();
    startAutoRefresh();
  }, [stopAutoRefresh, startAutoRefresh]);

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = subscribeToSettings((newSettings) => {
      settingsRef.current = newSettings;
      restartAutoRefresh();
    });

    // Start auto-refresh on mount
    startAutoRefresh();

    // Cleanup on unmount
    return () => {
      unsubscribe();
      stopAutoRefresh();
    };
  }, [startAutoRefresh, stopAutoRefresh, restartAutoRefresh]);

  return {
    startAutoRefresh,
    stopAutoRefresh,
    restartAutoRefresh,
    isAutoRefreshEnabled: settingsRef.current.autoRefreshInterval > 0,
    refreshInterval: settingsRef.current.autoRefreshInterval,
  };
};
