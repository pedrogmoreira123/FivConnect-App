import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

const defaultTheme: ThemeColors = {
  primary: '262.1 83.3% 57.8%',
  primaryForeground: '210 40% 98%',
  secondary: '220 14.3% 95.9%',
  secondaryForeground: '220.9 39.3% 11%',
  background: '0 0% 100%',
  foreground: '220.9 39.3% 11%',
  muted: '220 14.3% 95.9%',
  mutedForeground: '220 8.9% 46.1%',
  accent: '220 14.3% 95.9%',
  accentForeground: '220.9 39.3% 11%',
  border: '220 13% 91%'
};

const defaultBranding: BrandingConfig = {
  companyName: 'Fi.V App',
  colors: defaultTheme
};

const ThemeCustomizationContext = createContext<ThemeCustomizationContextType | undefined>(undefined);

export function ThemeCustomizationProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [previewMode, setPreviewMode] = useState(false);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fiv-theme-customization');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBranding(parsed);
        applyThemeToDocument(parsed.colors);
      } catch (error) {
        console.error('Failed to load saved theme:', error);
      }
    }
  }, []);

  // Apply theme colors to CSS variables
  const applyThemeToDocument = (colors: ThemeColors) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });
  };

  const updateColors = (newColors: Partial<ThemeColors>) => {
    const updatedColors = { ...branding.colors, ...newColors };
    const updatedBranding = { ...branding, colors: updatedColors };
    
    setBranding(updatedBranding);
    applyThemeToDocument(updatedColors);
    
    if (!previewMode) {
      localStorage.setItem('fiv-theme-customization', JSON.stringify(updatedBranding));
    }
  };

  const updateLogo = (logoUrl: string) => {
    const updatedBranding = { ...branding, logoUrl };
    setBranding(updatedBranding);
    
    if (!previewMode) {
      localStorage.setItem('fiv-theme-customization', JSON.stringify(updatedBranding));
    }
  };

  const updateCompanyName = (companyName: string) => {
    const updatedBranding = { ...branding, companyName };
    setBranding(updatedBranding);
    
    if (!previewMode) {
      localStorage.setItem('fiv-theme-customization', JSON.stringify(updatedBranding));
    }
  };

  const resetToDefault = () => {
    setBranding(defaultBranding);
    applyThemeToDocument(defaultTheme);
    localStorage.removeItem('fiv-theme-customization');
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
        setPreviewMode
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