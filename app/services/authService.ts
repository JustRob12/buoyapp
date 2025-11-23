import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const SUPABASE_URL = 'https://cizcaodtissblzhsmosy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpemNhb2R0aXNzYmx6aHNtb3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTM1MDMsImV4cCI6MjA3NzgyOTUwM30.Xmx2y6u3pZ3u0Wiu0obkIOu53-rWNqlpUcHGZj6DZOs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export interface UserProfile {
  id: string;
  fullname: string;
  username: string;
  role: number; // 0 = admin, 1 = researcher, 2 = pending, 3 = approved user
  profile_picture?: string;
  rejection_status?: boolean; // TRUE if account was rejected
  rejection_reason?: string; // Reason for rejection
  rejection_date?: string; // When the account was rejected
  created_at: string;
  updated_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullname: string;
  username: string;
  role?: number; // Optional, defaults to 2 (pending)
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  // Register new user
  async register(data: RegisterData) {
    try {
      const { email, password, fullname, username, role = 2 } = data;

      // Check if email is already taken (since email = username)
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', email)
        .single();

      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Sign up the user (with email confirmation)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullname,
            username,
            role,
          },
          emailRedirectTo: 'https://cizcaodtissblzhsmosy.supabase.co/auth/v1/callback',
        },
      });

      if (authError) {
        throw authError;
      }

      return {
        user: authData.user,
        session: authData.session,
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(data: LoginData) {
    try {
      const { email, password } = data;

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return {
        user: authData.user,
        session: authData.session,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  // Get current session
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }

      return session;
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile?.role === 0;
    } catch (error) {
      console.error('Check admin error:', error);
      return false;
    }
  }

  // Admin methods
  // Get all pending users (role = 2 and not rejected)
  async getPendingUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 2)
        .or('rejection_status.is.null,rejection_status.eq.false')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Get pending users error:', error);
      return [];
    }
  }

  // Approve user (change role from 2 to 3)
  async approveUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 3 })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Approve user error:', error);
      return false;
    }
  }

  // Reject pending user (mark as rejected instead of deleting)
  async rejectUser(userId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          rejection_status: true,
          rejection_reason: reason,
          rejection_date: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Reject user error:', error);
      return false;
    }
  }

  // Delete user account permanently (for "Delete My Account" option)
  async deleteUserAccount(userId: string): Promise<boolean> {
    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      return true;
    } catch (error) {
      console.error('Delete user account error:', error);
      return false;
    }
  }

  // Reset rejection status (for "Try Again" option)
  async resetRejectionStatus(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          rejection_status: false,
          rejection_reason: null,
          rejection_date: null
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Reset rejection status error:', error);
      return false;
    }
  }

  // Google OAuth sign-in
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.Scheme.app://',
        },
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  // Create or update user profile after OAuth (called after successful Google auth)
  async createOrUpdateUserProfileFromOAuth(userId: string, email: string, fullname?: string) {
    try {
      // Wait a bit for the trigger to create the profile (if it hasn't already)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if profile already exists (might be created by trigger)
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile with OAuth data
        const updates: any = {};
        
        // Always update fullname if it's empty, or if we have a better name from Google
        const currentFullname = existingProfile.fullname || '';
        const isEmptyOrDefault = !currentFullname || currentFullname.trim() === '' || currentFullname === email.split('@')[0];
        
        if (fullname && (isEmptyOrDefault || fullname !== currentFullname)) {
          updates.fullname = fullname;
        }
        
        // Always update username if it's empty or doesn't match email
        const currentUsername = existingProfile.username || '';
        if (email && (!currentUsername || currentUsername.trim() === '' || currentUsername !== email)) {
          updates.username = email;
        }

        if (Object.keys(updates).length > 0) {
          console.log('Updating user profile with:', updates);
          console.log('Current profile:', { fullname: currentFullname, username: currentUsername });
          
          const { data: updatedProfile, error: updateError } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

          if (updateError) {
            console.error('Failed to update OAuth profile:', updateError);
            console.error('Update error details:', JSON.stringify(updateError, null, 2));
            // Try to return existing profile even if update failed
            return existingProfile;
          }

          console.log('Successfully updated user profile:', updatedProfile);
          return updatedProfile;
        }

        console.log('No updates needed for user profile');
        return existingProfile;
      }

      // If profile doesn't exist, create it manually
      // (This shouldn't happen if trigger is working, but just in case)
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          username: email,
          fullname: fullname || email.split('@')[0],
          role: 2, // Default to pending
        })
        .select()
        .single();

      if (insertError) {
        // If insert fails, it might be a race condition with the trigger
        // Try fetching again
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          return profile;
        }
        throw insertError;
      }

      return newProfile;
    } catch (error) {
      console.error('Create/update user profile from OAuth error:', error);
      throw error;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
export default authService;
