import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  // Icon mapping for each tab
  const getTabIcon = (routeName: string, isFocused: boolean, isMapTab: boolean) => {
    const iconSize = 24;
    let iconColor = isFocused ? '#0ea5e9' : '#64748b';
    
    // Map tab always has white icon when it's the center tab
    if (isMapTab) {
      iconColor = '#ffffff';
    }
    
    switch (routeName) {
      case 'Home':
        return <Ionicons name="home" size={iconSize} color={iconColor} />;
      case 'Graph':
        return <Ionicons name="bar-chart" size={iconSize} color={iconColor} />;
      case 'Map':
        return <Ionicons name="map" size={iconSize} color={iconColor} />;
      case 'Data':
        return <Ionicons name="document-text" size={iconSize} color={iconColor} />;
      case 'Settings':
        return <Ionicons name="settings" size={iconSize} color={iconColor} />;
      default:
        return <Ionicons name="home" size={iconSize} color={iconColor} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Special styling for Map tab (center tab)
          const isMapTab = route.name === 'Map';
          
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                styles.tab,
                isMapTab && styles.centerTab,
              ]}
            >
              <View style={[
                styles.tabContent,
                isMapTab && styles.centerTabContent,
              ]}>
                {getTabIcon(route.name, isFocused, isMapTab)}
                <Text style={[
                  styles.tabLabel,
                  isMapTab && styles.centerTabLabel,
                  isFocused && styles.activeTabLabel,
                ]}>
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  tabBar: {
    flexDirection: 'row',
    height: 80,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingBottom: 15,
    paddingTop: 10,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  centerTab: {
    flex: 1.2,
    marginTop: -20,
    zIndex: 10,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
    minWidth: 50,
  },
  centerTabContent: {
    backgroundColor: '#0ea5e9',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
  },
  centerTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 3,
  },
  activeTabLabel: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
});

export default CustomTabBar;
