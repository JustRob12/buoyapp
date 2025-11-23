# Fixing White Screen Issue with Google OAuth

## Problem

When clicking "Continue with Google", you see a white screen at:
```
https://cizcaodtissblzhsmosy.supabase.co/auth/v1/authorize?provider=google&redirect_to=com.Scheme.app%3A%2F%2Fauth
```

## Root Cause

The white screen occurs because:
1. Supabase is trying to redirect directly to the deep link `com.Scheme.app://auth`
2. The browser cannot handle custom URL schemes, resulting in a blank/white screen
3. The OAuth flow gets stuck at this point

## Solution

The code has been updated to:
1. Use Supabase's callback URL (`https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback`) as the redirect target
2. Let Supabase handle the redirect to the app deep link after authentication
3. Add better error handling and session checking

## Important: Supabase Configuration

### Step 1: Verify Redirect URLs in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Make sure these redirect URLs are added:
   ```
   com.Scheme.app://auth
   https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback
   ```
4. Click **Save**

### Step 2: Verify Google Provider Settings

1. Go to **Authentication** → **Providers** → **Google**
2. Make sure Google is **enabled**
3. Verify Client ID and Secret are correct:
   - Client ID: `850054715524-mva01kasvhqph1ahrohg093mfap3dbtp.apps.googleusercontent.com`
   - Client Secret: `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`
4. Click **Save**

## How It Works Now

1. User clicks "Continue with Google"
2. App opens Supabase OAuth URL → redirects to Google
3. User signs in with Google
4. Google redirects to Supabase callback URL
5. Supabase processes authentication and redirects to app deep link
6. App receives tokens and creates session

## Testing

1. Clear app cache/data (if needed)
2. Restart the app
3. Try Google sign-in again
4. Check console logs for debugging:
   - `Opening OAuth URL: ...`
   - `OAuth result type: ...`
   - `OAuth result URL: ...`

## If Still Seeing White Screen

### Option 1: Check Supabase Redirect Configuration
- Make sure `com.Scheme.app://auth` is in Supabase redirect URLs
- The callback URL should be: `https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback`

### Option 2: Check Deep Link Configuration
- Verify `app.json` has: `"scheme": "com.Scheme.app"`
- For Android: Check `intentFilters` in `app.json`
- For iOS: Check `CFBundleURLSchemes` in `app.json`

### Option 3: Test in Development Build
- Google OAuth may not work in Expo Go
- Build a development build: `npx expo run:android` or `npx expo run:ios`

### Option 4: Check Browser Console
- If testing on web, check browser console for errors
- Look for CORS errors or redirect issues

## Debugging

The updated code now includes:
- Console logging for OAuth flow
- Better URL parsing for deep links
- Session checking as fallback
- Error handling for cancelled/dismissed flows

Check your console/logs for:
```
Opening OAuth URL: https://...
OAuth result type: success
OAuth result URL: com.Scheme.app://auth#access_token=...
```

## Additional Notes

- The white screen might appear briefly during redirect - this is normal
- The app should automatically handle the redirect and extract tokens
- If authentication succeeds but you don't see success message, check session after 1.5 seconds (handled automatically)

