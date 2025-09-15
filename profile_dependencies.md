# Profile & Image Upload Dependencies

Install these dependencies for the profile system and image upload functionality:

## Required Dependencies

```bash
# Navigation dependencies (if not already installed)
npm install @react-navigation/stack

# Image picker for profile pictures
npm install expo-image-picker

# Crypto for Cloudinary signatures (optional - for advanced features)
npm install crypto-js

# If using React Native CLI instead of Expo:
npm install react-native-image-picker
```

## Expo Installation

If you're using Expo, run:

```bash
npx expo install expo-image-picker
```

## Environment Variables

Add these to your `.env` file:

```env
# Existing Supabase variables
EXPO_PUBLIC_SUPABASE_URL=https://myneeqvnnhpvtnigxzwb.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-existing-key

# New Cloudinary variables
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your-cloudinary-api-key
EXPO_PUBLIC_CLOUDINARY_API_SECRET=your-cloudinary-api-secret
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

## Cloudinary Setup

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. Get your credentials from the dashboard
3. Create an upload preset:
   - Go to Settings > Upload
   - Click "Add upload preset"
   - Set it as "Unsigned" for client-side uploads
   - Name it something like "profile_pictures"
4. Add your credentials to the `.env` file

## Features Included

- ✅ Profile dropdown in header
- ✅ Profile screen with user information
- ✅ Profile picture upload (camera/gallery)
- ✅ Cloudinary integration for image storage
- ✅ User profile editing
- ✅ Role-based badges (Admin/Researcher)
- ✅ Logout functionality
