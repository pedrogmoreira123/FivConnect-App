import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/settings-context';
import { AppSettings } from '@/types';
import { QrCode } from 'lucide-react';

type SettingsTab = 'appearance' | 'whatsapp';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const handleSave = () => {
    updateSettings(localSettings);
    console.log('Settings saved:', localSettings);
  };

  const updateLocalSettings = (updates: Partial<AppSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
  };

  const handleDisconnectWhatsApp = () => {
    if (window.confirm('Are you sure you want to disconnect WhatsApp?')) {
      updateLocalSettings({ whatsappConnected: false });
      updateSettings({ whatsappConnected: false });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">Settings</h2>

      <div className="max-w-4xl">
        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors settings-tab ${
                activeTab === 'appearance'
                  ? 'active border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-appearance"
            >
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors settings-tab ${
                activeTab === 'whatsapp'
                  ? 'active border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-whatsapp"
            >
              WhatsApp Connection
            </button>
          </nav>
        </div>

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <Card data-testid="tab-content-appearance">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={localSettings.companyName}
                    onChange={(e) => updateLocalSettings({ companyName: e.target.value })}
                    data-testid="input-company-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={localSettings.cnpj}
                    onChange={(e) => updateLocalSettings({ cnpj: e.target.value })}
                    data-testid="input-cnpj"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      className="w-12 h-10 border border-input rounded-md cursor-pointer"
                      value={localSettings.primaryColor}
                      onChange={(e) => updateLocalSettings({ primaryColor: e.target.value })}
                      data-testid="input-primary-color-picker"
                    />
                    <Input
                      className="flex-1"
                      value={localSettings.primaryColor}
                      onChange={(e) => updateLocalSettings({ primaryColor: e.target.value })}
                      data-testid="input-primary-color-text"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      className="w-12 h-10 border border-input rounded-md cursor-pointer"
                      value={localSettings.secondaryColor}
                      onChange={(e) => updateLocalSettings({ secondaryColor: e.target.value })}
                      data-testid="input-secondary-color-picker"
                    />
                    <Input
                      className="flex-1"
                      value={localSettings.secondaryColor}
                      onChange={(e) => updateLocalSettings({ secondaryColor: e.target.value })}
                      data-testid="input-secondary-color-text"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} data-testid="button-save-appearance">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <Card data-testid="tab-content-whatsapp">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Connection Status</h3>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className={`w-3 h-3 rounded-full ${
                      localSettings.whatsappConnected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <Badge
                      variant={localSettings.whatsappConnected ? "default" : "destructive"}
                      data-testid="badge-whatsapp-status"
                    >
                      {localSettings.whatsappConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {localSettings.whatsappConnected 
                      ? 'Your WhatsApp account is successfully connected and ready to receive messages.'
                      : 'Your WhatsApp account is not connected. Scan the QR code to connect.'
                    }
                  </p>
                  
                  {localSettings.whatsappConnected && (
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectWhatsApp}
                      data-testid="button-disconnect-whatsapp"
                    >
                      Disconnect
                    </Button>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">QR Code</h3>
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-border text-center">
                    <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-3" data-testid="qr-code-placeholder">
                      <QrCode className="text-4xl text-gray-400" size={64} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code with WhatsApp to connect your account
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
