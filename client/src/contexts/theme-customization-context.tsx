import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

export interface ThemeColors {
  primary: string;        // Cor primária (fundo dos elementos principais)
  secondary: string;      // Cor secundária (elementos sobre o fundo primário)
  foreground: string;     // Cor da fonte/texto
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
  primary: '221 83% 53%',      // Azul principal
  secondary: '210 40% 96%',    // Cinza claro para fundos secundários  
  foreground: '222 47% 11%'    // Texto escuro
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
    
    // Função para calcular cor contrastante (branco ou preto)
    const getContrastColor = (hslColor: string): string => {
      const [h, s, l] = hslColor.split(' ').map(v => parseFloat(v.replace('%', '')));
      // Se a luminosidade for alta (>50%), usar texto escuro, senão usar texto claro
      return l > 50 ? '222 47% 11%' : '210 40% 98%';
    };
    
    // Função para calcular uma variação mais clara da cor
    const getLighterVariant = (hslColor: string): string => {
      const [h, s, l] = hslColor.split(' ').map(v => parseFloat(v.replace('%', '')));
      // Aumentar a luminosidade em 35% (máximo 95%)
      const newL = Math.min(95, l + 35);
      return `${h} ${s}% ${newL}%`;
    };
    
    // Função para calcular uma variação mais escura da cor
    const getDarkerVariant = (hslColor: string): string => {
      const [h, s, l] = hslColor.split(' ').map(v => parseFloat(v.replace('%', '')));
      // Diminuir a luminosidade em 15% (mínimo 5%)
      const newL = Math.max(5, l - 15);
      return `${h} ${s}% ${newL}%`;
    };
    
    // Mapear as 3 cores para todas as variáveis do shadcn/ui
    const primaryContrast = getContrastColor(colors.primary);
    const secondaryContrast = getContrastColor(colors.secondary);
    const primaryLight = getLighterVariant(colors.primary);
    const borderColor = getDarkerVariant(colors.secondary);
    
    // Aplicar todas as variáveis CSS necessárias
    const cssVariables = {
      // Cores primárias
      '--primary': `hsl(${colors.primary})`,
      '--primary-foreground': `hsl(${primaryContrast})`,
      
      // Cores secundárias
      '--secondary': `hsl(${colors.secondary})`,
      '--secondary-foreground': `hsl(${secondaryContrast})`,
      
      // Fundo e texto
      '--background': `hsl(${colors.secondary})`,
      '--foreground': `hsl(${colors.foreground})`,
      
      // Elementos neutros
      '--muted': `hsl(${colors.secondary})`,
      '--muted-foreground': `hsl(${colors.foreground})`,
      
      // Accent usa a cor primária em versão mais clara
      '--accent': `hsl(${primaryLight})`,
      '--accent-foreground': `hsl(${colors.foreground})`,
      
      // Bordas e inputs
      '--border': `hsl(${borderColor})`,
      '--input': `hsl(${borderColor})`,
      '--ring': `hsl(${colors.primary})`,
      
      // Cores de cartão
      '--card': `hsl(${colors.secondary})`,
      '--card-foreground': `hsl(${colors.foreground})`,
      
      // Popover
      '--popover': `hsl(${colors.secondary})`,
      '--popover-foreground': `hsl(${colors.foreground})`,
      
      // Sidebar - aplicar as cores personalizadas
      '--sidebar': `hsl(${colors.secondary})`,
      '--sidebar-foreground': `hsl(${colors.foreground})`,
      '--sidebar-primary': `hsl(${colors.primary})`,
      '--sidebar-primary-foreground': `hsl(${primaryContrast})`,
      '--sidebar-accent': `hsl(${primaryLight})`,
      '--sidebar-accent-foreground': `hsl(${colors.foreground})`,
      '--sidebar-border': `hsl(${borderColor})`,
      '--sidebar-ring': `hsl(${colors.primary})`,
      
      // Cores destrutivas (mantém vermelho padrão)
      '--destructive': 'hsl(0 84% 60%)',
      '--destructive-foreground': 'hsl(210 40% 98%)'
    };
    
    // Aplicar todas as variáveis
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
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