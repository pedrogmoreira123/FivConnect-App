import { useTheme as useThemeContext } from '@/contexts/theme-context';

export function useTheme() {
  return useThemeContext();
}
