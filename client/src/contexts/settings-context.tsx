import { createContext, useContext, useState, ReactNode } from 'react';
import { AppSettings } from '@/types';
import { mockAppSettings } from '@/lib/mock-data';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('appSettings');
    return savedSettings ? JSON.parse(savedSettings) : mockAppSettings;
  });

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    
    // Update CSS custom properties for primary/secondary colors
    if (newSettings.primaryColor) {
      document.documentElement.style.setProperty('--primary', newSettings.primaryColor);
    }
    if (newSettings.secondaryColor) {
      document.documentElement.style.setProperty('--secondary', newSettings.secondaryColor);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
