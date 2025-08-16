# Mobile App with GCash-Style Navigation

A React Native mobile app with a custom bottom navigation bar inspired by GCash design, featuring a sky blue and white theme.

## Project Structure

```
app/
├── components/          # Reusable UI components
│   ├── CustomTabBar.tsx # Custom bottom navigation bar
│   └── index.ts        # Component exports
├── screens/            # Screen components
│   ├── DashboardScreen.tsx
│   ├── GraphScreen.tsx
│   ├── MapScreen.tsx   # Center tab (larger and more prominent)
│   ├── DataScreen.tsx
│   ├── SettingsScreen.tsx
│   └── index.ts        # Screen exports
├── navigation/         # Navigation configuration
│   └── TabNavigator.tsx
├── assets/            # Images and static assets
├── App.tsx           # Main app component
└── package.json      # Dependencies
```

## Features

- **Custom Tab Bar**: GCash-inspired design with sky blue and white theme
- **5 Main Tabs**: Dashboard, Graph, Map (center), Data, Settings
- **Map Tab**: Special styling as the center tab (larger and more prominent)
- **Clean Architecture**: Well-organized folder structure
- **TypeScript**: Full TypeScript support

## Navigation Tabs

1. **Dashboard** - Main dashboard view
2. **Graph** - Data visualization
3. **Map** - Center tab with special styling
4. **Data** - Data management
5. **Settings** - App configuration

## Color Scheme

- **Primary Blue**: #0ea5e9 (Sky Blue)
- **Light Blue**: #e0f2fe
- **Dark Blue**: #1e3a8a
- **Background**: #f8fbff (Light Sky Blue)
- **Text**: #64748b (Gray)
- **White**: #ffffff

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on device/simulator:
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS
   ```

## Dependencies

- React Navigation
- React Native Safe Area Context
- React Native Screens
- Expo
