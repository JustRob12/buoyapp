import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { BuoyData } from '../services/buoyService';

interface BuoyCardProps {
  data: BuoyData;
}

const BuoyCard: React.FC<BuoyCardProps> = ({ data }) => {
  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date} ${time}`);
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const getBuoyImage = (buoyName: string) => {
    // Clean and extract buoy number from the buoy name
    const cleanBuoyName = buoyName.trim(); // Remove extra spaces
    console.log('Original buoy name:', buoyName);
    console.log('Clean buoy name:', cleanBuoyName);
    
    // Extract buoy number from the buoy name (e.g., "Buoy 2" -> "2")
    const buoyNumber = cleanBuoyName.replace('Buoy ', '').trim();
    console.log('Extracted buoy number:', buoyNumber);
    
    switch (buoyNumber) {
      case '1':
        console.log('Loading buoy1.png');
        return require('../images/buoy1.png');
      case '2':
        console.log('Loading buoy2.png');
        return require('../images/buoy2.png');
      case '3':
        console.log('Loading buoy3.png');
        return require('../images/buoy3.png');
      case '4':
        console.log('Loading buoy4.png');
        return require('../images/buoy4.png');
      case '5':
        console.log('Loading buoy5.png');
        return require('../images/buoy5.png');
      default:
        console.log('Default fallback to buoy1.png');
        return require('../images/buoy1.png'); // Default fallback
    }
  };

  const { date, time } = formatDateTime(data.Date, data.Time);

  return (
    <View style={styles.container}>
      {/* Date and Time at the top */}
      <View style={styles.dateTimeContainer}>
        <Text style={styles.dateText}>{date}</Text>
        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* Big Center Buoy */}
      <View style={styles.buoyContainer}>
        <View style={styles.buoyCircle}>
          <Image 
            source={getBuoyImage(data.Buoy)}
            style={styles.buoyImage}
            resizeMode="contain"
            onError={(error) => console.log('Image loading error:', error)}
            onLoad={() => console.log('Image loaded successfully')}
          />
          <Text style={styles.buoyText}>{data.Buoy}</Text>
        </View>
      </View>

      {/* Sensor Data in vertical layout */}
      <View style={styles.sensorContainer}>
        <View style={styles.sensorItem}>
          <Text style={styles.sensorLabel}>pH</Text>
          <Text style={styles.sensorValue}>{data.pH}</Text>
        </View>
        
        <View style={styles.sensorItem}>
          <Text style={styles.sensorLabel}>Temperature</Text>
          <Text style={styles.sensorValue}>{data['Temp (°C)']}°C</Text>
        </View>
        
        <View style={styles.sensorItem}>
          <Text style={styles.sensorLabel}>TDS</Text>
          <Text style={styles.sensorValue}>{data['TDS (ppm)']} ppm</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateTimeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 16,
    color: '#64748b',
  },
  buoyContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  buoyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  buoyImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  buoyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sensorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  sensorItem: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    width: '80%',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
});

export default BuoyCard;
