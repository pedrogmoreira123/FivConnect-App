import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useThemeCustomization, type ThemeColors } from '@/contexts/theme-customization-context';
import { Palette, RotateCcw, Eye, Save, Upload } from 'lucide-react';

const colorPresets = [
  { 
    name: 'Azul Corporativo',
    colors: { primary: '217 91% 60%', secondary: '210 40% 96%', foreground: '222 47% 11%' }
  },
  { 
    name: 'Verde Natureza',
    colors: { primary: '142 76% 36%', secondary: '142 76% 96%', foreground: '222 47% 11%' }
  },
  { 
    name: 'Roxo Moderno',
    colors: { primary: '262 83% 58%', secondary: '262 83% 96%', foreground: '222 47% 11%' }
  },
  { 
    name: 'Laranja Vibrante',
    colors: { primary: '25 95% 53%', secondary: '25 95% 96%', foreground: '222 47% 11%' }
  },
  { 
    name: 'Rosa Elegante',
    colors: { primary: '330 81% 60%', secondary: '330 81% 96%', foreground: '222 47% 11%' }
  },
  {
    name: 'Tema Escuro',
    colors: { primary: '217 91% 60%', secondary: '224 71% 4%', foreground: '213 31% 91%' }
  }
];

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorInput({ label, value, onChange, description }: ColorInputProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  // Convert HSL to hex for color picker
  const hslToHex = (hsl: string) => {
    try {
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
      const sNorm = s / 100;
      const lNorm = l / 100;
      
      const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = lNorm - c / 2;
      
      let r, g, b;
      if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
      else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
      else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
      else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
      else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      
      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return '#000000';
    }
  };

  // Convert hex to HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hexColor = e.target.value;
    const hslColor = hexToHsl(hexColor);
    handleChange(hslColor);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={label}>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            id={label}
            value={inputValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Ex: 217 91% 60%"
            className="font-mono text-sm"
          />
        </div>
        <div className="relative">
          <input
            type="color"
            value={hslToHex(value)}
            onChange={handleColorPickerChange}
            className="w-10 h-10 rounded border-2 border-border cursor-pointer bg-transparent"
            title="Clique para abrir o seletor de cores"
          />
          <div 
            className="absolute inset-0 w-10 h-10 rounded border-2 border-border pointer-events-none"
            style={{ backgroundColor: `hsl(${value})` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ColorPicker() {
  const { branding, updateColors, resetToDefault, previewMode, setPreviewMode } = useThemeCustomization();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handlePresetApply = (preset: typeof colorPresets[0]) => {
    updateColors(preset.colors);
  };

  const handleSaveChanges = () => {
    setPreviewMode(false);
    // Changes are automatically saved when not in preview mode
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // In a real implementation, you would upload this to a storage service
        // For now, we'll use the data URL
        // updateLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Color Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Temas Predefinidos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {colorPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-auto p-3 flex flex-col items-center space-y-2 hover:shadow-md transition-all duration-200 min-h-[80px] touch-manipulation"
                onClick={() => handlePresetApply(preset)}
                data-testid={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex space-x-1">
                  <div
                    className="w-5 h-5 rounded-md shadow-sm border border-border/20"
                    style={{ backgroundColor: `hsl(${preset.colors.primary})` }}
                  />
                  <div
                    className="w-5 h-5 rounded-md shadow-sm border border-border/20"
                    style={{ backgroundColor: `hsl(${preset.colors.secondary})` }}
                  />
                  <div
                    className="w-5 h-5 rounded-md shadow-sm border border-border/20"
                    style={{ backgroundColor: `hsl(${preset.colors.foreground})` }}
                  />
                </div>
                <span className="text-xs font-medium text-center leading-tight">{preset.name}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Clique em um tema para aplicar instantaneamente
          </p>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Cores Personalizadas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure apenas 3 cores que se aplicam automaticamente a toda a interface
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-6">
            <ColorInput
              label="Cor Primária"
              value={branding.colors.primary}
              onChange={(value) => updateColors({ primary: value })}
              description="Cor principal para botões, links e elementos de destaque"
            />
            
            <ColorInput
              label="Cor Secundária"
              value={branding.colors.secondary}
              onChange={(value) => updateColors({ secondary: value })}
              description="Cor de fundo da interface (fundos de cartões, modais, etc.)"
            />
            
            <ColorInput
              label="Cor da Fonte"
              value={branding.colors.foreground}
              onChange={(value) => updateColors({ foreground: value })}
              description="Cor do texto principal em toda a aplicação"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center justify-center sm:justify-start">
              {previewMode && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span className="text-xs">Modo Visualização</span>
                </Badge>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={resetToDefault} 
                data-testid="button-reset-theme"
                className="w-full sm:w-auto touch-manipulation"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Restaurar Padrão</span>
                <span className="sm:hidden">Resetar</span>
              </Button>
              
              {previewMode ? (
                <Button 
                  onClick={handleSaveChanges} 
                  data-testid="button-save-theme"
                  className="w-full sm:w-auto touch-manipulation"
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Salvar Alterações</span>
                  <span className="sm:hidden">Salvar</span>
                </Button>
              ) : (
                <Button 
                  onClick={() => setPreviewMode(true)} 
                  variant="outline" 
                  data-testid="button-preview-theme"
                  className="w-full sm:w-auto touch-manipulation"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Modo Visualização</span>
                  <span className="sm:hidden">Preview</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Logo Personalizada</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo-upload">Upload da Logo</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Formatos aceitos: PNG, JPG, SVG. Tamanho recomendado: 200x60px
            </p>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              data-testid="input-logo-upload"
            />
          </div>
          
          {branding.logoUrl && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Logo Atual:</p>
              <img 
                src={branding.logoUrl} 
                alt="Logo atual" 
                className="max-h-16 object-contain"
              />
            </div>
          )}
          
          {logoFile && (
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="text-sm font-medium mb-2">Nova Logo (Preview):</p>
              <p className="text-xs text-muted-foreground">
                Arquivo: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
              </p>
              <Button size="sm" className="mt-2" disabled>
                Salvar Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                * Funcionalidade de upload será implementada com armazenamento em nuvem
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}