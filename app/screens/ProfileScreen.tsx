import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import cloudinaryService from '../services/cloudinaryService';
import Header from '../components/Header';

const ProfileScreen: React.FC = () => {
  const { user, refreshUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imageVersion, setImageVersion] = useState(0); // Track image updates
  const [formData, setFormData] = useState({
    fullname: user?.profile?.fullname || '',
    username: user?.profile?.username || '',
  });

  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        fullname: user.profile.fullname,
        username: user.profile.username,
      });
      // Increment image version when profile picture changes
      if (user.profile.profile_picture) {
        setImageVersion(prev => prev + 1);
      }
    }
  }, [user?.profile?.profile_picture]);

  const handleImagePicker = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to select your profile picture',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: handleCamera },
        { text: 'Gallery', onPress: handleGallery },
      ]
    );
  };

  const handleCamera = async () => {
    try {
      setUploading(true);
      const imageUri = await cloudinaryService.takePhotoWithCamera();
      if (imageUri && user?.id) {
        await uploadProfilePicture(imageUri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  const handleGallery = async () => {
    try {
      setUploading(true);
      const imageUri = await cloudinaryService.pickImageFromGallery();
      if (imageUri && user?.id) {
        await uploadProfilePicture(imageUri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select image');
    } finally {
      setUploading(false);
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    try {
      if (!user?.id) return;

      const response = await cloudinaryService.uploadImage(imageUri, user.id);
      
      // Update user profile with new image URL
      await authService.updateUserProfile(user.id, {
        profile_picture: response.secure_url,
      });

      // Refresh user profile and wait for it to complete
      await refreshUserProfile();
      
      // Force image version update to trigger re-render
      setImageVersion(prev => prev + 1);
      
      // Force a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 300));

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    }
  };

  // Helper function to add cache-busting to image URL
  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    // Add version number and timestamp to bypass cache
    // Also add Cloudinary transformation to force new URL
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = Date.now();
    return `${url}${separator}v=${imageVersion}&t=${timestamp}&_=${timestamp}`;
  };

  const handleSaveProfile = async () => {
    try {
      if (!user?.id) return;

      setLoading(true);

      // Validation
      if (!formData.fullname.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }

      // Update profile
      await authService.updateUserProfile(user.id, {
        fullname: formData.fullname.trim(),
      });

      // Refresh user profile
      await refreshUserProfile();

      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (role: number) => {
    return role === 0 ? 'Administrator' : 'Researcher';
  };

  const getRoleBadgeStyle = (role: number) => {
    return role === 0 ? styles.adminBadge : styles.researcherBadge;
  };

  const getRoleTextStyle = (role: number) => {
    return role === 0 ? styles.adminBadgeText : styles.researcherBadgeText;
  };

  return (
    <View style={styles.container}>
      <Header title="Profile" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePictureContainer}>
            {user?.profile?.profile_picture ? (
              <Image
                key={`${user.profile.profile_picture}-${imageVersion}`} // Force re-render when URL or version changes
                source={{ 
                  uri: getImageUrl(user.profile.profile_picture),
                  cache: 'reload' // Force reload from network
                }}
                style={styles.profilePicture}
                onError={(error) => {
                  console.error('Image load error:', error);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                }}
              />
            ) : (
              <View style={styles.defaultProfilePicture}>
                <Ionicons name="person" size={60} color="#94a3b8" />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleImagePicker}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="camera" size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            {/* Full Name */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.fullname}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fullname: text }))}
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.infoValue}>{user?.profile?.fullname || 'Not set'}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
            </View>

            {/* Role */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <View style={[styles.roleBadge, getRoleBadgeStyle(user?.profile?.role || 1)]}>
                <Text style={[styles.roleBadgeText, getRoleTextStyle(user?.profile?.role || 1)]}>
                  {getRoleText(user?.profile?.role || 1)}
                </Text>
              </View>
            </View>

            {/* Member Since */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {user?.profile?.created_at 
                  ? new Date(user.profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not available'
                }
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {editing ? (
              <View style={styles.editButtonsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    setEditing(false);
                    setFormData({
                      fullname: user?.profile?.fullname || '',
                      username: user?.profile?.username || '',
                    });
                  }}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#ffffff" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color="#0ea5e9" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  profilePictureContainer: {
    position: 'relative',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
  },
  defaultProfilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  adminBadge: {
    backgroundColor: '#fef3c7',
  },
  researcherBadge: {
    backgroundColor: '#dbeafe',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminBadgeText: {
    color: '#92400e',
  },
  researcherBadgeText: {
    color: '#1e40af',
  },
  actionButtons: {
    marginTop: 10,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  editButtonText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
    flex: 1,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
