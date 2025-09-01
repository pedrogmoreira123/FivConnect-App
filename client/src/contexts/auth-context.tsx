import { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { ClientLogger } from '@/utils/logger';

interface AuthContextType {
  user: UserRole | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRole | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
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
        localStorage.setItem('user', JSON.stringify(userWithInitials));
        localStorage.setItem('authToken', token);
        
        return true;
      }
      return false;
    } catch (error) {
      ClientLogger.error('Login failed', error, { 
        username, 
        component: 'AuthContext' 
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Call logout API to invalidate session
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      ClientLogger.error('Logout failed', error, { 
        component: 'AuthContext',
        userId: user?.id 
      });
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      // Also clear theme customization cache
      localStorage.removeItem('fiv-theme-customization');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
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
