# Google OAuth Setup Guide for AquaNet

This guide will help you set up Google OAuth authentication for your app.

## Prerequisites

1. Google Cloud Console account
2. Supabase project with Google provider enabled
3. Your app package names:
   - **Android Package**: `com.Scheme.app`
   - **iOS Bundle ID**: `com.aquanet.app`

---

## Step 1: Create OAuth Client IDs in Google Cloud Console

### 1.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Go to **APIs & Services** → **Credentials**

### 1.2 Configure OAuth Consent Screen (First Time Only)

1. Click **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Fill in required fields:
   - App name: `AquaNet`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. Add scopes (if needed):
   - `email`
   - `profile`
   - `openid`
6. Add test users (for testing before publishing)
7. Click **Save and Continue**

---

## Step 2: Create Android OAuth Client ID

### 2.1 Get SHA-1 Certificate Fingerprint

**For Debug Keystore (Development):**

On Windows (PowerShell):
```powershell
cd $env:USERPROFILE\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

On Mac/Linux:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**For Release Keystore (Production):**

If you have a release keystore:
```bash
keytool -list -v -keystore path-to-your-release-keystore -alias your-key-alias
```

**Copy the SHA-1 fingerprint** (looks like: `AA:BB:CC:DD:EE:FF:...`)

### 2.2 Create Android Client ID

1. In Google Cloud Console → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Select **Application type**: `Android`
3. Fill in:
   - **Name**: `AquaNet Android` (or any name)
   - **Package name**: `com.Scheme.app` ⚠️ **Must match your app.json**
   - **SHA-1 certificate fingerprint**: Paste the SHA-1 you copied
4. Click **Create**
5. **Copy the Client ID** (you'll need this for Supabase)

---

## Step 3: Create iOS OAuth Client ID (Optional but Recommended)

1. In Google Cloud Console → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Select **Application type**: `iOS`
3. Fill in:
   - **Name**: `AquaNet iOS`
   - **Bundle ID**: `com.aquanet.app` ⚠️ **Must match your app.json**
4. Click **Create**
5. **Copy the Client ID**

---

## Step 4: Create Web OAuth Client ID (For Supabase)

1. In Google Cloud Console → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Select **Application type**: `Web application`
3. Fill in:
   - **Name**: `AquaNet Web (Supabase)`
   - **Authorized redirect URIs**: 
     - `https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback`
     - ⚠️ **Do NOT add** `com.Scheme.app://auth` here - Web Application clients only accept `http://` or `https://` schemes!
4. Click **Create**
5. **Copy the Client ID and Client Secret** ⚠️ **You'll need both for Supabase**

---

## Step 5: Configure Supabase

### 5.1 Enable Google Provider

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and toggle it **ON**

### 5.2 Add Google Credentials

1. In the Google provider settings, enter:
   - **Client ID (for web)**: The Web Client ID from Step 4
   - **Client Secret (for web)**: The Web Client Secret from Step 4
2. **Optional - Add Mobile Client IDs:**
   - **iOS Client ID**: The iOS Client ID from Step 3
   - **Android Client ID**: The Android Client ID from Step 2
3. Click **Save**

### 5.3 Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   com.Scheme.app://auth
   ```
3. Add your Supabase callback URL (usually already there):
   ```
   https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback
   ```
4. Click **Save**

---

## Step 6: Test Google Sign-In

1. Run your app: `npm start` or `expo start`
2. Navigate to Register screen
3. Click **"Continue with Google"**
4. You should see Google sign-in page
5. After signing in, you should be redirected back to the app

---

## Troubleshooting

### "redirect_uri_mismatch" Error

- Check that redirect URLs in Supabase match exactly
- Make sure `com.Scheme.app://auth` is added in Supabase
- Verify the scheme in `app.json` matches

### "Invalid Client" Error

- Verify Client ID and Secret in Supabase are correct
- Make sure you're using the **Web** Client ID/Secret in Supabase
- Check that Google provider is enabled in Supabase

### SHA-1 Fingerprint Issues

- Make sure you're using the correct keystore
- For Expo Go: Use debug keystore SHA-1
- For production builds: Use your release keystore SHA-1
- You may need to add multiple SHA-1 fingerprints (debug + release)

### Android Package Name Mismatch

- Verify `app.json` has: `"package": "com.Scheme.app"`
- This must match exactly in Google Cloud Console
- Case-sensitive!

### iOS Bundle ID Mismatch

- Verify `app.json` has: `"bundleIdentifier": "com.aquanet.app"`
- This must match exactly in Google Cloud Console

---

## Important Notes

1. **For Development (Expo Go):**
   - Use debug keystore SHA-1
   - Google sign-in may not work in Expo Go (use development build)

2. **For Production:**
   - Use release keystore SHA-1
   - Add both debug and release SHA-1 to Google Console if needed

3. **Multiple Environments:**
   - You can add multiple SHA-1 fingerprints for the same Android client ID
   - Useful if you have debug, staging, and production builds

4. **Testing:**
   - Add test users in OAuth consent screen for testing
   - App must be published or verified for public use

---

## Quick Reference

**Your App Configuration:**
- Android Package: `com.Scheme.app`
- iOS Bundle ID: `com.aquanet.app`
- Deep Link Scheme: `com.Scheme.app://auth`
- Supabase URL: `https://cizcaodtissblzhsmosy.supabase.co`

**What You Need:**
- ✅ Android OAuth Client ID (with SHA-1)
- ✅ iOS OAuth Client ID (optional)
- ✅ Web OAuth Client ID + Secret (for Supabase)
- ✅ Redirect URLs configured in Supabase

---

## Need Help?

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo Auth Session](https://docs.expo.dev/guides/authentication/#google)

