import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { apiRequest } from '@/lib/queryClient';

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
}

export interface BrandingConfig {
  logoUrl?: string;
  companyName: string;
  colors: ThemeColors;
}

interface ThemeCustomizationContextType {
  branding: BrandingConfig;
  updateColors: (colors: Partial<ThemeColors>) => void;
  updateLogo: (logoUrl: string) => void;
  updateCompanyName: (name: string) => void;
  resetToDefault: () => void;
  previewMode: boolean;
  setPreviewMode: (enabled: boolean) => void;
  saveToDatabase: () => Promise<boolean>;
  isLoading: boolean;
}

const defaultTheme: ThemeColors = {
  primary: '221 83% 53%',
  primaryForeground: '210 40% 98%',
  secondary: '210 40% 96%',
  secondaryForeground: '222 47% 11%',
  background: '0 0% 100%',
  foreground: '222 47% 11%',
  muted: '210 40% 96%',
  mutedForeground: '215 16% 47%',
  accent: '210 40% 96%',
  accentForeground: '222 47% 11%',
  border: '214 32% 91%'
};

const defaultBranding: BrandingConfig = {
  companyName: 'Fi.V App',
  colors: defaultTheme
};

const ThemeCustomizationContext = createContext<ThemeCustomizationContextType | undefined>(undefined);

export function ThemeCustomizationProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [previewMode, setPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Apply default theme immediately on component mount
  React.useEffect(() => {
    applyThemeToDocument(defaultTheme);
  }, []);

  // Load user's theme from database or fallback to localStorage
  useEffect(() => {
    const loadUserTheme = async () => {
      if (isAuthenticated && user) {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('authToken');
          if (token) {
            const response = await fetch(`/api/settings/theme/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.customTheme) {
                const customBranding = {
                  ...defaultBranding,
                  colors: data.customTheme
                };
                setBranding(customBranding);
                applyThemeToDocument(data.customTheme);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Failed to load user theme from database:', error);
        } finally {
          setIsLoading(false);
        }
      }
      
      // Fallback to localStorage for backwards compatibility or unauthenticated users
      const saved = localStorage.getItem('fiv-theme-customization');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setBranding(parsed);
          applyThemeToDocument(parsed.colors);
        } catch (error) {
          console.error('Failed to load saved theme from localStorage:', error);
        }
      }
    };
    
    loadUserTheme();
  }, [isAuthenticated, user]);

  // Apply theme colors to CSS variables
  const applyThemeToDocument = (colors: ThemeColors) => {
    const root = document.documentElement;
    
    // Map our theme keys to the correct CSS variable names expected by shadcn/ui
    const cssVariableMap: Record<keyof ThemeColors, string> = {
      primary: '--primary',
      primaryForeground: '--primary-foreground',
      secondary: '--secondary',
      secondaryForeground: '--secondary-foreground',
      background: '--background',
      foreground: '--foreground',
      muted: '--muted',
      mutedForeground: '--muted-foreground',
      accent: '--accent',
      accentForeground: '--accent-foreground',
      border: '--border'
    };
    
    // Apply the theme colors with correct CSS variable names and HSL format
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = cssVariableMap[key as keyof ThemeColors];
      if (cssVar) {
        // Apply the value in HSL format that shadcn/ui expects
        root.style.setProperty(cssVar, `hsl(${value})`);
      }
    });
    
    // Also update ring and input colors to match primary and border
    root.style.setProperty('--ring', `hsl(${colors.primary})`);
    root.style.setProperty('--input', `hsl(${colors.border})`);
    
    console.log('Theme applied:', colors); // Debug log
  };

  const updateColors = (newColors: Partial<ThemeColors>) => {
    const updatedColors = { ...branding.colors, ...newColors };
    const updatedBranding = { ...branding, colors: updatedColors };
    
    setBranding(updatedBranding);
    applyThemeToDocument(updatedColors);
    
    if (!previewMode) {
      // Auto-save to database if user is authenticated
      if (isAuthenticated && user) {
        saveToDatabase(updatedColors);
      } else {
        // Fallback to localStorage for unauthenticated users
        localStorage.setItem('fiv-theme-customization', JSON.stringify(updatedBranding));
      }
    }
  };

  const updateLogo = (logoUrl: string) => {
    const updatedBranding = { ...branding, logoUrl };
    setBranding(updatedBranding);
    
    if (!previewMode) {
      // Auto-save to database if user is authenticated
      if (isAuthenticated && user) {
        saveToDatabase(branding.colors);
      } else {
        // Fallback to localStorage for unauthenticated users
        localStorage.setItem('fiv-theme-customization', JSON.stringify(updatedBranding));
      }
    }
  };

  const updateCompanyName = (companyName: string) => {
    const updatedBranding = { ...branding, companyName };
    setBranding(updatedBranding);
    
    if (!previewMode) {
      // Auto-save to database if user is authenticated
      if (isAuthenticated && user) {
        saveToDatabase(branding.colors);
      } else {
        // Fallback to localStorage for unauthenticated users
        localStorage.setItem('fiv-theme-customization', JSON.stringify(updatedBranding));
      }
    }
  };

  const resetToDefault = async () => {
    setBranding(defaultBranding);
    applyThemeToDocument(defaultTheme);
    
    // Clear from both database and localStorage
    if (isAuthenticated && user) {
      await saveToDatabase(null); // Save null to reset to default
    }
    localStorage.removeItem('fiv-theme-customization');
  };
  
  const saveToDatabase = async (customTheme?: ThemeColors | null): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return false;
      
      const themeToSave = customTheme !== undefined ? customTheme : branding.colors;
      
      const response = await fetch(`/api/settings/theme/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customTheme: themeToSave }),
      });
      
      if (response.ok) {
        console.log('Theme saved to database successfully');
        return true;
      } else {
        console.error('Failed to save theme to database');
        return false;
      }
    } catch (error) {
      console.error('Error saving theme to database:', error);
      return false;
    }
  };

  return (
    <ThemeCustomizationContext.Provider
      value={{
        branding,
        updateColors,
        updateLogo,
        updateCompanyName,
        resetToDefault,
        previewMode,
        setPreviewMode,
        saveToDatabase,
        isLoading
      }}
    >
      {children}
    </ThemeCustomizationContext.Provider>
  );
}

export function useThemeCustomization() {
  const context = useContext(ThemeCustomizationContext);
  if (context === undefined) {
    throw new Error('useThemeCustomization must be used within a ThemeCustomizationProvider');
  }
  return context;
}