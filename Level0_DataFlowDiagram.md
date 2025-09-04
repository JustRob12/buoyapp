# Level 0 Data Flow Diagram - Buoy App

## Overview
This diagram shows the high-level data flows between the Buoy App, External API, and User entities.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   External API  │───Water Quality Data────►│   Buoy App      │───Water Quality Data────►│     User        │
│                 │───Location Data─────────►│                 │───Location Data─────────►│                 │
│                 │         │                 │         │                 │
│  (dorsu.edu.ph) │         │                 │         │                 │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                           │                           │
         │                           │                           │
         ▼                           ▼                           ▼
    Buoy Data                   Processed Data              Displayed Data
    (HTML Response)             (Filtered & Formatted)       (Charts, Tables, Maps)
```

## Data Flows

### 1. External API → Buoy App
- **Data**: Raw HTML response containing buoy sensor data
- **Content**: 
  - Buoy ID, Name, Date, Time
  - Location (Latitude, Longitude)
  - Sensor readings (pH, Temperature, TDS)
  - Pagination information
- **Method**: HTTP GET requests to `https://dorsu.edu.ph/buoy/dashboard.php`
- **Frequency**: On-demand based on app requests

### 2. Buoy App → User
- **Data**: Processed and formatted buoy information
- **Content**:
  - Dashboard with latest readings
  - Data tables with filtering and sorting
  - Interactive graphs and charts
  - Map visualization with buoy locations
  - Export files (CSV data)
  - Error messages and status updates
- **Method**: UI components, charts, maps, file downloads
- **Frequency**: Real-time updates and on-demand responses

## Key Processes in Buoy App

1. **Data Fetching**: Retrieves buoy data from external API with retry mechanisms
2. **Data Processing**: Parses HTML, cleans data, applies filters
3. **Data Storage**: Manages local data caching and state
4. **Data Visualization**: Creates charts, graphs, and map displays
5. **User Interface**: Handles user interactions and displays information
6. **Export Functionality**: Generates CSV files for data export

## Data Types

### Buoy Data Structure
```typescript
interface BuoyData {
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
```

### User Input Types
- Filter parameters (buoy number, date range)
- View preferences
- Settings configurations
- Export requests

### Output Types
- Formatted data displays
- Interactive visualizations
- Export files
- Status messages and notifications
