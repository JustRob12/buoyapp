# Building APK with Expo (Without EAS) - Step by Step Guide

## Prerequisites

1. **Android Studio** installed
2. **Java JDK** (version 11 or higher)
3. **Android SDK** configured
4. **Node.js** and **npm** installed

---

## Method 1: Using Expo Prebuild + Android Studio (Recommended)

### Step 1: Install Android Studio
1. Download from https://developer.android.com/studio
2. Install with:
   - Android SDK
   - Android SDK Platform (API 33 or 34)
   - Android Virtual Device (optional, for emulator)
   - Android SDK Build-Tools

### Step 2: Set Environment Variables

**Windows:**
1. Open System Properties → Environment Variables
2. Add new variable:
   - `ANDROID_HOME` = `C:\Users\YourUsername\AppData\Local\Android\Sdk`
3. Add to PATH:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

**Verify installation:**
```bash
adb version
```

### Step 3: Navigate to App Directory
```bash
cd app
```

### Step 4: Generate Native Android Project
```bash
npx expo prebuild --platform android
```

This creates an `android` folder with native code.

### Step 5: Build APK with Gradle

**Option A: Debug APK (for testing)**
```bash
cd android
.\gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Release APK (for distribution)**
```bash
cd android
.\gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

**Note:** Release builds require signing. See "Signing the APK" section below.

---

## Method 2: Using Expo Run (Simpler, but requires device/emulator)

### Step 1: Install Android Studio (same as above)

### Step 2: Start Android Emulator or Connect Device
- Open Android Studio → AVD Manager → Start an emulator
- OR connect Android device via USB with USB debugging enabled

### Step 3: Build and Install
```bash
cd app
npx expo run:android
```

This will:
- Generate native code
- Build the APK
- Install it on your device/emulator

**To get the APK file:**
After build completes, the APK is located at:
`app/android/app/build/outputs/apk/debug/app-debug.apk`

---

## Method 3: Build APK Directly with Gradle (After Prebuild)

### Step 1: Prebuild (one time)
```bash
cd app
npx expo prebuild --platform android
```

### Step 2: Build APK
```bash
cd app/android
.\gradlew assembleDebug
```

### Step 3: Find Your APK
```
app/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Signing the APK (For Release Builds)

### Step 1: Generate Keystore
```bash
cd app/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Enter a password and details when prompted.

### Step 2: Create gradle.properties
Create `app/android/gradle.properties` and add:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-password
MYAPP_RELEASE_KEY_PASSWORD=your-password
```

### Step 3: Update build.gradle
Edit `app/android/app/build.gradle` and add signing config:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 4: Build Signed APK
```bash
cd app/android
.\gradlew assembleRelease
```

Signed APK: `app/android/app/build/outputs/apk/release/app-release.apk`

---

## Quick Commands Reference

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build debug APK
cd android
.\gradlew assembleDebug

# Build release APK
.\gradlew assembleRelease

# Clean build (if issues)
.\gradlew clean

# Run on device/emulator
npx expo run:android
```

---

## Troubleshooting

### "ANDROID_HOME not set"
- Set the `ANDROID_HOME` environment variable
- Restart terminal/command prompt

### "Gradle not found"
- Make sure you're in the `android` directory
- Try: `cd android && .\gradlew assembleDebug`

### "SDK not found"
- Open Android Studio → SDK Manager
- Install Android SDK Platform (API 33 or 34)
- Install Android SDK Build-Tools

### "Java version error"
- Install Java JDK 11 or higher
- Set `JAVA_HOME` environment variable

### "Build failed - dependencies"
```bash
cd android
.\gradlew clean
cd ..
npx expo prebuild --platform android --clean
```

### "Permission denied" (Linux/Mac)
```bash
chmod +x android/gradlew
```

---

## APK File Locations

**Debug APK:**
```
app/android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK:**
```
app/android/app/build/outputs/apk/release/app-release.apk
```

---

## Installing the APK

1. Transfer the `.apk` file to your Android device
2. Enable "Install from Unknown Sources" in Android settings:
   - Settings → Security → Unknown Sources (enable)
   - OR Settings → Apps → Special Access → Install Unknown Apps
3. Tap the APK file to install
4. Follow the installation prompts

---

## Notes

- **First build takes 5-10 minutes** (downloads dependencies)
- **Subsequent builds are faster** (1-2 minutes)
- **Debug APK** is larger but easier to debug
- **Release APK** is optimized and smaller
- **APK size** typically 30-50MB
- **Prebuild only needed once** unless you change native config

---

## Need Help?

- Expo Docs: https://docs.expo.dev/workflow/prebuild/
- React Native Android Setup: https://reactnative.dev/docs/environment-setup
- Android Studio: https://developer.android.com/studio
