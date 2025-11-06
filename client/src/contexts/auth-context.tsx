import { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { ClientLogger } from '@/utils/logger';

interface AuthContextType {
  user: UserRole | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUserData: (userData: any, token: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRole | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
      }
      return null;
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
      return null;
    }
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const data = await response.json();
      
      if (data.user && data.token) {
        const { user, token } = data;
        
        // Create user object with initials
        const userWithInitials: UserRole = {
          ...user,
          initials: user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        };
        
        setUser(userWithInitials);
        
        // Store both user and token
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userWithInitials));
          localStorage.setItem('authToken', token);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      ClientLogger.error('Login failed', error, { 
        email, 
        component: 'AuthContext' 
      });
      return false;
    }
  };

  const setUserData = (userData: any, token: string) => {
    // Create user object with initials
    const userWithInitials: UserRole = {
      ...userData,
      initials: userData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    };

    setUser(userWithInitials);

    // Store both user and token
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userWithInitials));
      localStorage.setItem('authToken', token);
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Call logout API to invalidate session
          await apiRequest('POST', '/api/auth/logout');
        }
      }
    } catch (error) {
      ClientLogger.error('Logout failed', error, {
        component: 'AuthContext',
        userId: user?.id
      });
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        // Also clear theme customization cache
        localStorage.removeItem('fiv-theme-customization');
        // Redirect to login page
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      setUserData,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
