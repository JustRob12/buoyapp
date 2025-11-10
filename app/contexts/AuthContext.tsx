import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { UserProfile } from '../services/authService';

interface User {
  id: string;
  email?: string;
  profile?: UserProfile;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't check for existing session - users must login every time
    setLoading(false);

    // Listen for auth state changes (only for active login sessions)
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session?.user) {
          await loadUserWithProfile(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserWithProfile = async (authUser: any) => {
    try {
      const profile = await authService.getUserProfile(authUser.id);
      setUser({
        id: authUser.id,
        email: authUser.email,
        profile: profile,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser({
        id: authUser.id,
        email: authUser.email,
        profile: undefined,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: authUser } = await authService.login({ email, password });
      if (authUser) {
        await loadUserWithProfile(authUser);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    try {
      setLoading(true);
      const { user: authUser } = await authService.register(data);
      if (authUser) {
        await loadUserWithProfile(authUser);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (user?.id) {
      try {
        const profile = await authService.getUserProfile(user.id);
        setUser(prev => prev ? { ...prev, profile } : null);
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
