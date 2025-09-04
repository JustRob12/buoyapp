# iOS Build Guide for AquaNet

## Prerequisites

### 1. macOS Requirements
- **macOS 10.15 (Catalina) or later**
- **Xcode 12.0 or later** (download from Mac App Store)
- **iOS Simulator** (included with Xcode)
- **Command Line Tools** (install via Xcode → Preferences → Locations)

### 2. Apple Developer Account
- **Free Account**: For testing on simulator and limited device testing
- **Paid Account ($99/year)**: For App Store distribution and unlimited device testing

## Build Methods

### Method 1: EAS Build (Recommended - Cloud Build)

#### Step 1: Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
```

#### Step 3: Configure Build
```bash
cd app
eas build:configure
```

#### Step 4: Build for iOS
```bash
# Development build (for testing)
eas build --platform ios --profile development

# Preview build (for internal testing)
eas build --platform ios --profile preview

# Production build (for App Store)
eas build --platform ios --profile production
```

#### Step 5: Download and Install
- EAS will provide a download link when build completes
- Download the .ipa file
- Install on device using Xcode or TestFlight

### Method 2: Expo Go (Quick Testing)

#### Step 1: Install Expo Go
- Download "Expo Go" from the iOS App Store

#### Step 2: Start Development Server
```bash
cd app
npx expo start
```

#### Step 3: Connect Device
- Scan QR code with iOS camera or Expo Go app
- App will load on your device

### Method 3: Local Build (Advanced)

#### Step 1: Install Dependencies
```bash
cd app
npx expo install expo-dev-client
```

#### Step 2: Build Locally
```bash
npx expo run:ios
```

## iOS-Specific Configuration

### Permissions
The app requires these iOS permissions:
- **Location**: For map functionality
- **Notifications**: For data alerts
- **Background App Refresh**: For auto-refresh functionality

### Device Testing

#### Simulator Testing
1. Open Xcode
2. Go to Xcode → Open Developer Tool → Simulator
3. Choose iOS device (iPhone 14, iPad, etc.)
4. Run the app

#### Physical Device Testing
1. Connect iPhone/iPad via USB
2. Trust the computer on your device
3. In Xcode, select your device as target
4. Run the app

## Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Clear cache and rebuild
npx expo start --clear
```

#### 2. Permission Issues
- Check Info.plist permissions
- Ensure proper usage descriptions

#### 3. Network Issues
- Verify API endpoints work on iOS
- Check CORS settings if applicable

#### 4. Device Compatibility
- Test on different iOS versions
- Check for iOS-specific bugs

### Debug Commands
```bash
# Check Expo status
npx expo doctor

# View logs
npx expo logs

# Clear all caches
npx expo start --clear
```

## App Store Submission

### 1. Create Production Build
```bash
eas build --platform ios --profile production
```

### 2. Submit to App Store
```bash
eas submit --platform ios
```

### 3. App Store Connect
- Upload screenshots
- Write app description
- Set pricing
- Submit for review

## Performance Tips

### iOS Optimization
1. **Memory Management**: App uses memoization for charts
2. **Network**: Retry mechanism and timeout handling
3. **Offline Mode**: Cached data for offline use
4. **Background Processing**: Limited to essential tasks

### Testing Checklist
- [ ] App launches without crashes
- [ ] All screens load properly
- [ ] Maps functionality works
- [ ] Notifications work
- [ ] Offline mode functions
- [ ] Data export works
- [ ] Settings save correctly
- [ ] Auto-refresh works
- [ ] Error handling displays properly

## Support

For issues specific to iOS builds:
1. Check Expo documentation
2. Review iOS-specific error logs
3. Test on multiple iOS versions
4. Verify all dependencies are iOS-compatible

