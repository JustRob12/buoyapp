import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export const checkNetworkConnectivity = async (): Promise<NetworkState> => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type ?? 'unknown'
    };
  } catch (error) {
    console.error('Error checking network connectivity:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown'
    };
  }
};

export const addNetworkListener = (callback: (state: NetworkState) => void) => {
  return NetInfo.addEventListener(state => {
    callback({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type ?? 'unknown'
    });
  });
};

export const isOnline = async (): Promise<boolean> => {
  const networkState = await checkNetworkConnectivity();
  return networkState.isConnected && networkState.isInternetReachable;
};


