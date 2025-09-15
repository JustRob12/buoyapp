import * as ImagePicker from 'expo-image-picker';

// Cloudinary configuration from environment variables
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dubxh5xt9';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'pictures';

export interface CloudinaryResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  original_filename: string;
}

class CloudinaryService {
  // Request camera/gallery permissions
  async requestPermissions() {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      throw new Error('Camera and gallery permissions are required to upload profile pictures');
    }
  }

  // Pick image from gallery
  async pickImageFromGallery(): Promise<string | null> {
    try {
      await this.requestPermissions();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      throw error;
    }
  }

  // Take photo with camera
  async takePhotoWithCamera(): Promise<string | null> {
    try {
      await this.requestPermissions();

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error taking photo with camera:', error);
      throw error;
    }
  }

  // Upload image to Cloudinary using unsigned upload
  async uploadImage(imageUri: string, userId: string): Promise<CloudinaryResponse> {
    try {
      const formData = new FormData();
      
      // Create file object for upload
      const fileInfo = {
        uri: imageUri,
        type: 'image/jpeg',
        name: `profile_${userId}_${Date.now()}.jpg`,
      } as any;

      formData.append('file', fileInfo);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'profile_pictures'); // Organize uploads in folder
      formData.append('public_id', `profile_${userId}`); // Unique ID for user profile

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary upload error:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data: CloudinaryResponse = await response.json();
      console.log('Cloudinary upload successful:', data.secure_url);
      return data;
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      throw error;
    }
  }

  // Note: Delete functionality would require backend API for security

  // Get optimized image URL
  getOptimizedImageUrl(publicId: string, width: number = 200, height: number = 200): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_fill,f_auto,q_auto/${publicId}`;
  }
}

export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
