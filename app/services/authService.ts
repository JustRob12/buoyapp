import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const SUPABASE_URL = 'https://myneeqvnnhpvtnigxzwb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bmVlcXZubmhwdnRuaWd4endiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDMwMTIsImV4cCI6MjA3MzQxOTAxMn0.OFLagS7U7vXZuwEGgyEPU1IZUK03hDrPXNHfWHV3qlA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface UserProfile {
  id: string;
  fullname: string;
  username: string;
  role: number; // 0 = admin, 1 = researcher, 2 = pending
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

      // Sign up the user (without email confirmation)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullname,
            username,
            role,
          },
          emailRedirectTo: undefined, // Disable email confirmation
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

  // Approve user (change role from 2 to 1)
  async approveUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 1 })
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

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
export default authService;
