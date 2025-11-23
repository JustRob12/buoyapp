# Google OAuth Quick Setup - Your Configuration

## Your Google OAuth Credentials

### Web Application (for Supabase)
- **Client ID**: `850054715524-mva01kasvhqph1ahrohg093mfap3dbtp.apps.googleusercontent.com`
- **Client Secret**: `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`

### Android Application (if you created one)
- **Client ID**: `850054715524-hlmjde2sk8gemo7hdl867v7spj7buhat.apps.googleusercontent.com`

## Your Android SHA-1 Fingerprint
```
ED:C3:25:DE:B7:0B:38:F6:10:DC:F6:7F:5E:A3:83:5D:09:94:7B:CE
```

## Your App Configuration
- **Android Package**: `com.Scheme.app`
- **iOS Bundle ID**: `com.aquanet.app`
- **Deep Link Scheme**: `com.Scheme.app://auth`
- **Supabase URL**: `https://cizcaodtissblzhsmosy.supabase.co`

---

## Step 1: Determine Your Client ID Type

**Is this a Web Client ID or Android Client ID?**

- **If it's a Web Client ID**: You need the **Client Secret** too (found in Google Cloud Console)
- **If it's an Android Client ID**: You can add it to Supabase as optional mobile client ID

---

## Step 2: Configure in Supabase

### 2.1 Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Providers**

### 2.2 Enable and Configure Google Provider

1. Find **Google** in the list
2. Toggle it **ON**
3. Enter your credentials:

   **Web Client ID + Secret (Required for Supabase):**
   - **Client ID (for web)**: `850054715524-mva01kasvhqph1ahrohg093mfap3dbtp.apps.googleusercontent.com`
   - **Client Secret (for web)**: `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`
   
   **Optional - Mobile Client IDs:**
   - **Android Client ID**: `850054715524-hlmjde2sk8gemo7hdl867v7spj7buhat.apps.googleusercontent.com` (optional, for better mobile experience)
   - **iOS Client ID**: `[Your iOS Client ID if you created one]` (optional)

4. Click **Save**

### 2.3 Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. In **Redirect URLs**, make sure these are added:
   ```
   com.Scheme.app://auth
   https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback
   ```
3. Click **Save**

---

## Step 3: Verify Google Cloud Console Settings

### 3.1 Check Your OAuth Client Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth client ID: `850054715524-hlmjde2sk8gemo7hdl867v7spj7buhat.apps.googleusercontent.com`
4. Click on it to view details

### 3.2 Verify Redirect URIs (if Web Client)

⚠️ **Important**: For Web Application OAuth clients, only add HTTPS URLs!

Make sure this is added in **Authorized redirect URIs**:
- `https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback`

❌ **Do NOT add** `com.Scheme.app://auth` here - that's only for mobile clients and will cause an error!
The mobile deep linking is handled by Supabase, not Google's Web Application client.

### 3.3 Get Client Secret (if Web Client)

1. In the OAuth client details page
2. You'll see **Client ID** and **Client Secret**
3. Copy the **Client Secret** (it's hidden, click "Show" if needed)
4. Use it in Supabase settings

---

## Step 4: Test Google Sign-In

1. Start your app:
   ```bash
   cd app
   npm start
   ```

2. Navigate to the **Register** screen

3. Click **"Continue with Google"**

4. You should see:
   - Google sign-in page opens
   - After signing in, redirects back to app
   - Success message appears

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- ✅ Check redirect URLs in Supabase match exactly
- ✅ Verify `com.Scheme.app://auth` is in Supabase redirect URLs
- ✅ Check Google Cloud Console has the same redirect URIs

### "Invalid Client" Error
- ✅ Verify Client ID in Supabase: `850054715524-mva01kasvhqph1ahrohg093mfap3dbtp.apps.googleusercontent.com`
- ✅ Verify Client Secret in Supabase: `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`
- ✅ Make sure you're using **Web Client ID + Secret** in Supabase (not Android)
- ✅ Check that Google provider is **enabled** in Supabase

### "Client ID not found" Error
- ✅ Verify the Web Client ID is correct: `850054715524-mva01kasvhqph1ahrohg093mfap3dbtp.apps.googleusercontent.com`
- ✅ Check that OAuth consent screen is configured
- ✅ Make sure the project in Google Cloud Console is correct

### App Doesn't Redirect Back
- ✅ Verify deep linking scheme in `app.json`: `"scheme": "com.Scheme.app"`
- ✅ Check that redirect URL `com.Scheme.app://auth` is in Supabase
- ✅ For Expo Go: Google sign-in may not work (use development build)

---

## Quick Checklist

- [ ] Google OAuth Client ID created in Google Cloud Console
- [ ] Client Secret obtained (if Web Client)
- [ ] OAuth consent screen configured
- [ ] Redirect URIs added in Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret added to Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] App tested with Google sign-in

---

## Need Help?

If you're stuck:
1. Check the full guide: `GOOGLE_OAUTH_SETUP.md`
2. Verify all URLs match exactly (case-sensitive)
3. Make sure OAuth consent screen is published or has test users added

