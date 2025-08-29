import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/hooks/use-translation';
import { useSettings } from '@/contexts/settings-context';
import { useThemeCustomization } from '@/contexts/theme-customization-context';
import { useToast } from '@/hooks/use-toast';
import ColorPicker from '@/components/theme-customization/color-picker';
import { 
  Settings, 
  Bell, 
  User, 
  Shield, 
  Globe, 
  Palette, 
  MessageSquare,
  Smartphone,
  Monitor,
  QrCode,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { branding } = useThemeCustomization();
  
  const [localSettings, setLocalSettings] = useState({
    companyName: branding.companyName,
    notifications: {
      desktop: true,
      browser: false,
      sound: true,
      persistent: false
    },
    whatsapp: {
      connected: false,
      autoReply: true,
      businessHours: true
    }
  });

  const handleSave = () => {
    // Save settings logic here
    toast({
      title: t('settings.saved'),
      description: "Configurações salvas com sucesso!",
    });
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handleWhatsAppConnect = () => {
    // WhatsApp connection logic
    toast({
      title: "WhatsApp",
      description: "Funcionalidade de conexão será implementada",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <Settings className="h-6 w-6" />
            <span>{t('settings.title')}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure as preferências e aparência da plataforma
          </p>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appearance" className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Segurança</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Personalização Visual</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ColorPicker />
            </CardContent>
          </Card>

          {/* Responsiveness Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Layout Responsivo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Smartphone className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-medium">Mobile</p>
                  <p className="text-sm text-muted-foreground">Otimizado para smartphones</p>
                  <Badge variant="secondary" className="mt-2">Ativo</Badge>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 text-green-500 mx-auto mb-2 flex items-center justify-center">
                    <div className="w-6 h-4 border-2 border-current rounded"></div>
                  </div>
                  <p className="font-medium">Tablet</p>
                  <p className="text-sm text-muted-foreground">Otimizado para tablets</p>
                  <Badge variant="secondary" className="mt-2">Ativo</Badge>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Monitor className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="font-medium">Desktop</p>
                  <p className="text-sm text-muted-foreground">Otimizado para desktops</p>
                  <Badge variant="secondary" className="mt-2">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Central de Notificações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações Persistentes</h4>
                    <p className="text-sm text-muted-foreground">
                      Alertas contínuos para tickets pendentes
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.persistent}
                    onCheckedChange={(value) => handleNotificationChange('persistent', value)}
                    data-testid="switch-persistent-notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações Pop-up</h4>
                    <p className="text-sm text-muted-foreground">
                      Suporte para notificações push no Android
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.desktop}
                    onCheckedChange={(value) => handleNotificationChange('desktop', value)}
                    data-testid="switch-popup-notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações do Navegador</h4>
                    <p className="text-sm text-muted-foreground">
                      Ativação através do navegador
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.browser}
                    onCheckedChange={(value) => handleNotificationChange('browser', value)}
                    data-testid="switch-browser-notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Sons de Notificação</h4>
                    <p className="text-sm text-muted-foreground">
                      Alertas sonoros para novas mensagens
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.sound}
                    onCheckedChange={(value) => handleNotificationChange('sound', value)}
                    data-testid="switch-sound-notifications"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações de Alerta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alert-frequency">Frequência de Alertas</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Imediato</SelectItem>
                      <SelectItem value="1min">A cada minuto</SelectItem>
                      <SelectItem value="5min">A cada 5 minutos</SelectItem>
                      <SelectItem value="15min">A cada 15 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-hours">Horário Silencioso</Label>
                  <Input
                    id="quiet-hours"
                    placeholder="22:00 - 08:00"
                    data-testid="input-quiet-hours"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Conexão WhatsApp Business</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!localSettings.whatsapp.connected ? (
                <div className="text-center py-8 space-y-4">
                  <QrCode className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">WhatsApp não conectado</h3>
                    <p className="text-muted-foreground">
                      Conecte sua conta do WhatsApp Business para começar
                    </p>
                  </div>
                  <Button onClick={handleWhatsAppConnect} data-testid="button-connect-whatsapp">
                    Conectar WhatsApp
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      WhatsApp conectado com sucesso
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Resposta Automática</h4>
                      <p className="text-sm text-muted-foreground">
                        Enviar mensagens automáticas para novos contatos
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.whatsapp.autoReply}
                      onCheckedChange={(value) => 
                        setLocalSettings(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, autoReply: value }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Horário Comercial</h4>
                      <p className="text-sm text-muted-foreground">
                        Aplicar regras de horário de funcionamento
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.whatsapp.businessHours}
                      onCheckedChange={(value) => 
                        setLocalSettings(prev => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, businessHours: value }
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Informações do Perfil</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Nome Completo</Label>
                  <Input id="full-name" placeholder="Seu nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da Empresa</Label>
                <Input 
                  id="company-name" 
                  value={localSettings.companyName}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Nome da sua empresa"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Configurações de Segurança</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sessões Ativas</h4>
                  <p className="text-sm text-muted-foreground">
                    Gerencie dispositivos conectados
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Gerenciar
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input id="password" type="password" placeholder="Digite sua nova senha" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} data-testid="button-save-settings">
          <Settings className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}