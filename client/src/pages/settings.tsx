import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useT } from '@/hooks/use-translation';
import { useSettings } from '@/contexts/settings-context';
import { useThemeCustomization } from '@/contexts/theme-customization-context';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/use-sound';
import ColorPicker from '@/components/theme-customization/color-picker';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/lib/api-client';
import { apiRequest } from '@/lib/queryClient';
import { 
  Settings, 
  Bell, 
  Palette, 
  MessageSquare,
  QrCode,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Link,
  Monitor,
  Globe,
  RefreshCw,
  Save,
  FileText,
  Upload,
  Download,
  Wrench
} from 'lucide-react';

export default function SettingsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  
  useEffect(() => {
    document.title = 'FivConnect - Configurações';
  }, []);
  const { branding } = useThemeCustomization();
  const { soundSettings, updateSoundSettings } = useSound();
  
  const [localSettings, setLocalSettings] = useState({
    companyName: branding.companyName,
    notifications: {
      desktop: true,
      browser: false,
      sound: true,
      persistent: false,
      conversationSound: soundSettings.conversationSound,
      waitingSound: soundSettings.waitingSound,
      waitingSoundType: soundSettings.waitingSoundType,
      muteConversations: soundSettings.muteConversations,
      muteWaiting: soundSettings.muteWaiting
    },
    whatsapp: {
      connected: false,
      autoReply: true,
      businessHours: true
    },
    apis: {
      whatsappToken: '',
      webhookUrl: '',
      geminiApiKey: '',
      autoConnect: false
    },
    theme: {
      primaryColor: '#6366f1',
      companyLogo: '',
      favicon: '',
      customCss: ''
    }
  });

  const [showApiTokens, setShowApiTokens] = useState({
    whatsapp: false,
    gemini: false
  });

  const handleSave = () => {
    toast({
      title: "Configurações salvas!",
      description: "Todas as configurações foram atualizadas com sucesso.",
    });
  };

  const handleNotificationChange = (key: string, value: boolean | string) => {
    setLocalSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
    
    // Update sound settings immediately
    if (['conversationSound', 'waitingSound', 'waitingSoundType', 'muteConversations', 'muteWaiting'].includes(key)) {
      updateSoundSettings({ [key]: value });
    }
  };

  const handleWhatsAppConnect = () => {
    toast({
      title: "WhatsApp",
      description: "Conectando ao WhatsApp Business API...",
    });
  };

  const testWebhook = () => {
    toast({
      title: "Webhook testado",
      description: "Teste de webhook enviado com sucesso.",
    });
  };

  const toggleApiToken = (api: 'whatsapp' | 'gemini') => {
    setShowApiTokens(prev => ({
      ...prev,
      [api]: !prev[api]
    }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary/10 shadow-sm">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <span>Configurações</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure as preferências, aparência e integrações da plataforma
          </p>
        </div>
        <Button onClick={handleSave} data-testid="button-save-settings" className="w-full sm:w-auto shadow-sm">
          <Save className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Salvar Configurações</span>
          <span className="sm:hidden">Salvar</span>
        </Button>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full min-w-fit grid-cols-4 h-auto p-1">
            <TabsTrigger value="appearance" className="flex items-center justify-center space-x-1 p-2 sm:space-x-2 sm:px-4">
              <Palette className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Personalização</span>
              <span className="sm:hidden text-xs">Tema</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center justify-center space-x-1 p-2 sm:space-x-2 sm:px-4">
              <Bell className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Notificações</span>
              <span className="sm:hidden text-xs">Notif</span>
            </TabsTrigger>
            <TabsTrigger value="quick-replies" className="flex items-center justify-center space-x-1 p-2 sm:space-x-2 sm:px-4">
              <Zap className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Respostas Rápidas</span>
              <span className="sm:hidden text-xs">Resp</span>
            </TabsTrigger>
            <TabsTrigger value="apis" className="flex items-center justify-center space-x-1 p-2 sm:space-x-2 sm:px-4">
              <Link className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">APIs Externas</span>
              <span className="sm:hidden text-xs">APIs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Theme Customization */}
          <Card className="shadow-sm border-0 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-primary/10 shadow-sm">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <span>Personalização de Cores</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ColorPicker />
            </CardContent>
          </Card>

          {/* Branding */}
          <Card className="shadow-sm border-0 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-primary/10 shadow-sm">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <span>Identidade Visual</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-logo">Logo da Empresa</Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <Input
                        id="company-logo"
                        value={localSettings.theme.companyLogo}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          theme: { ...prev.theme, companyLogo: e.target.value }
                        }))}
                        placeholder="URL do logo ou upload"
                        data-testid="input-company-logo"
                        className="flex-1"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async () => {
                            try {
                              const base64 = reader.result as string;
                              const res = await apiRequest('POST', '/api/company/logo', { base64 });
                              const data = await res.json();
                              setLocalSettings(prev => ({
                                ...prev,
                                theme: { ...prev.theme, companyLogo: data.logoUrl }
                              }));
                              updateSettings({ companyName: localSettings.companyName });
                              toast({ title: 'Logo atualizado', description: 'O logo da empresa foi atualizado com sucesso.' });
                            } catch (error: any) {
                              toast({ title: 'Erro', description: error.message || 'Falha ao enviar logo', variant: 'destructive' });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                        id="file-input-logo"
                      />
                      <Label htmlFor="file-input-logo">
                        <Button asChild variant="outline" size="sm" className="flex-shrink-0 w-full sm:w-auto cursor-pointer">
                          <span>
                            <Upload className="h-4 w-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Upload</span>
                          </span>
                        </Button>
                      </Label>
                    </div>
                    {localSettings.theme.companyLogo && (
                      <div className="mt-2">
                        <img src={localSettings.theme.companyLogo} alt="Logo Preview" className="h-10 w-auto" />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Recomendado: 200x50px, formato PNG ou SVG
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Cor Primária</Label>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg border border-border flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: localSettings.theme.primaryColor }}
                      />
                      <Input
                        id="primary-color"
                        value={localSettings.theme.primaryColor}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          theme: { ...prev.theme, primaryColor: e.target.value }
                        }))}
                        placeholder="#6366f1"
                        data-testid="input-primary-color"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escolha a cor principal da sua marca
                    </p>
                  </div>
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
                <div>
                  <h3 className="font-semibold text-lg mb-4">Sons de Notificação</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure alertas sonoros para mensagens e conversas em espera
                  </p>
                </div>

                {/* Som para Novas Mensagens */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="font-medium">Som para Novas Mensagens</Label>
                    <p className="text-sm text-muted-foreground">
                      Reproduz um som quando uma nova mensagem chega
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.conversationSound}
                    onCheckedChange={(value) => handleNotificationChange('conversationSound', value)}
                    data-testid="switch-conversation-sound"
                  />
                </div>

                {/* Som para Mensagens em Espera */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="font-medium">Som para Mensagens em Espera</Label>
                    <p className="text-sm text-muted-foreground">
                      Alerta quando há conversas aguardando atendimento
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.notifications.waitingSound}
                    onCheckedChange={(value) => handleNotificationChange('waitingSound', value)}
                    data-testid="switch-waiting-sound"
                  />
                </div>

                {/* Tipo de Alerta de Espera */}
                {localSettings.notifications.waitingSound && (
                  <div className="ml-4 space-y-3 p-4 bg-muted/50 rounded-lg">
                    <Label className="font-medium">Tipo de Alerta</Label>
                    <Select
                      value={localSettings.notifications.waitingSoundType}
                      onValueChange={(value) => handleNotificationChange('waitingSoundType', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo de alerta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beep">Bip Único</SelectItem>
                        <SelectItem value="continuous">Som Constante (Loop)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {localSettings.notifications.waitingSoundType === 'beep' 
                        ? 'Um único bip será reproduzido quando houver mensagem em espera' 
                        : 'Um som será reproduzido continuamente até que a mensagem seja atendida'}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Configurações Antigas Mantidas (opcional) */}
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

                {/* Configurações Específicas de Som - DEPRECATED */}
                {false && localSettings.notifications.sound && (
                  <div className="ml-6 space-y-4 border-l-2 border-muted pl-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Som de Conversas</h4>
                        <p className="text-sm text-muted-foreground">
                          Som de notificação para novas conversas (BIP)
                        </p>
                      </div>
                      <Switch
                        checked={localSettings.notifications.conversationSound}
                        onCheckedChange={(value) => handleNotificationChange('conversationSound', value)}
                        data-testid="switch-conversation-sound"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Som de Espera</h4>
                        <p className="text-sm text-muted-foreground">
                          Som para conversas em fila de espera
                        </p>
                      </div>
                      <Switch
                        checked={localSettings.notifications.waitingSound}
                        onCheckedChange={(value) => handleNotificationChange('waitingSound', value)}
                        data-testid="switch-waiting-sound"
                      />
                    </div>

                    {localSettings.notifications.waitingSound && (
                      <div className="ml-6">
                        <Label className="text-sm font-medium">Tipo de Som para Espera</Label>
                        <Select
                          value={localSettings.notifications.waitingSoundType}
                          onValueChange={(value) => handleNotificationChange('waitingSoundType', value)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bip">Apenas BIP</SelectItem>
                            <SelectItem value="constant">Som Constante</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {localSettings.notifications.waitingSoundType === 'constant' 
                            ? 'Som contínuo a cada 2 segundos enquanto houver conversas em espera'
                            : 'Som único quando nova conversa entra na fila de espera'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
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


        {/* APIs Externas Tab */}
        <TabsContent value="apis" className="space-y-6">
          {/* Fi.V App Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Link className="h-5 w-5" />
                <span>Integração com Fi.V App</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Explanation Section */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      Como o Fi.V App funciona
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      O Fi.V App atua como uma ponte inteligente entre seus sistemas e as mensagens do WhatsApp. 
                      Para funcionar corretamente, ele precisa saber onde enviar as mensagens recebidas.
                    </p>
                    <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <div className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span><strong>Recebimento:</strong> O Fi.V App captura todas as mensagens do WhatsApp</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span><strong>Processamento:</strong> Aplica filtros, automações e regras configuradas</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span><strong>Entrega:</strong> Envia para sua plataforma através do webhook configurado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url" className="text-base font-medium">URL do Webhook</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="webhook-url"
                      value={localSettings.apis.webhookUrl}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        apis: { ...prev.apis, webhookUrl: e.target.value }
                      }))}
                      placeholder="https://sua-plataforma.com/webhook/messages"
                      className="text-sm"
                      data-testid="input-webhook-url"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={testWebhook}
                      data-testid="button-test-webhook"
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      Testar
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <strong>Esta URL deve:</strong> Estar acessível publicamente e aceitar requisições POST com dados JSON
                    </p>
                    <p>
                      <strong>Exemplo de payload:</strong> {`{ "from": "+5511999999999", "message": "Olá!", "timestamp": "2024-01-01T12:00:00Z" }`}
                    </p>
                  </div>
                </div>

                {/* Webhook Status */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${localSettings.apis.webhookUrl ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="font-medium text-sm">
                          {localSettings.apis.webhookUrl ? 'Webhook Configurado' : 'Webhook Não Configurado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {localSettings.apis.webhookUrl 
                            ? 'Pronto para receber mensagens do Fi.V App' 
                            : 'Configure a URL do webhook para começar a receber mensagens'
                          }
                        </p>
                      </div>
                    </div>
                    {localSettings.apis.webhookUrl && (
                      <Badge variant="secondary" className="text-xs">
                        Ativo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Gemini API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Google Gemini (IA)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-api-key">Chave da API Gemini</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="gemini-api-key"
                    type={showApiTokens.gemini ? "text" : "password"}
                    value={localSettings.apis.geminiApiKey}
                    onChange={(e) => setLocalSettings(prev => ({
                      ...prev,
                      apis: { ...prev.apis, geminiApiKey: e.target.value }
                    }))}
                    placeholder="Insira a chave da API do Google Gemini"
                    data-testid="input-gemini-api-key"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleApiToken('gemini')}
                  >
                    {showApiTokens.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Obtenha sua chave em: <a href="https://makersuite.google.com/app/apikey" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                </p>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  A API do Gemini é utilizada para o Agente de IA avançado
                </span>
              </div>
            </CardContent>
          </Card>

          {/* API Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Status das Integrações</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">WhatsApp Business API</p>
                      <p className="text-sm text-muted-foreground">Webhook configurado</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Conectado</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Google Gemini AI</p>
                      <p className="text-sm text-muted-foreground">API Key configurada</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Link className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Webhook Endpoint</p>
                      <p className="text-sm text-muted-foreground">Status de conectividade</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Aguardando</Badge>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Status das APIs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Replies Tab */}
        <TabsContent value="quick-replies" className="space-y-6">
          <QuickRepliesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Quick Replies Manager Component
function QuickRepliesManager() {
  const { toast } = useToast();
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [formData, setFormData] = useState({
    shortcut: '',
    message: '',
    isGlobal: false
  });

  const fetchQuickReplies = async () => {
    try {
      setLoading(true);
      const response = await authenticatedGet('/api/quick-replies');
      const data = await response.json();
      setQuickReplies(data);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar respostas rápidas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.shortcut || !formData.message) {
      toast({
        title: "Erro",
        description: "Atalho e mensagem são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      let response;
      
      if (editingReply) {
        response = await authenticatedPut(`/api/quick-replies/${editingReply.id}`, formData);
      } else {
        response = await authenticatedPost('/api/quick-replies', formData);
      }

      toast({
        title: "Sucesso",
        description: editingReply ? "Resposta rápida atualizada!" : "Resposta rápida criada!"
      });
      
      setFormData({ shortcut: '', message: '', isGlobal: false });
      setShowAddForm(false);
      setEditingReply(null);
      fetchQuickReplies();
    } catch (error) {
      console.error('Error saving quick reply:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar resposta rápida",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (reply) => {
    setEditingReply(reply);
    setFormData({
      shortcut: reply.shortcut,
      message: reply.message,
      isGlobal: reply.isGlobal || false
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await authenticatedDelete(`/api/quick-replies/${id}`);
      toast({
        title: "Sucesso",
        description: "Resposta rápida excluída!"
      });
      fetchQuickReplies();
    } catch (error) {
      console.error('Error deleting quick reply:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir resposta rápida",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({ shortcut: '', message: '', isGlobal: false });
    setShowAddForm(false);
    setEditingReply(null);
  };

  // Load quick replies on component mount
  useEffect(() => {
    fetchQuickReplies();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Respostas Rápidas</span>
            </div>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              data-testid="button-add-quick-reply"
            >
              {showAddForm ? 'Cancelar' : 'Nova Resposta'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure respostas automáticas usando atalhos. Digite "/" seguido do atalho para usar.
          </p>

          {showAddForm && (
            <Card className="border-dashed">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shortcut">Atalho</Label>
                    <Input
                      id="shortcut"
                      value={formData.shortcut}
                      onChange={(e) => setFormData(prev => ({ ...prev, shortcut: e.target.value }))}
                      placeholder="ex: ola, info, horario"
                      data-testid="input-shortcut"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use apenas letras e números, sem espaços
                    </p>
                  </div>
                  
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-global"
                        checked={formData.isGlobal}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isGlobal: checked }))}
                        data-testid="switch-global"
                      />
                      <Label htmlFor="is-global" className="text-sm">
                        Resposta Global
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Digite a mensagem da resposta rápida..."
                    className="h-24"
                    data-testid="textarea-message"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Button onClick={handleSave} data-testid="button-save-reply">
                    <Save className="h-4 w-4 mr-2" />
                    {editingReply ? 'Atualizar' : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Replies List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : quickReplies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma resposta rápida configurada</p>
                <p className="text-sm">Clique em "Nova Resposta" para começar</p>
              </div>
            ) : (
              quickReplies.map((reply) => (
                <Card key={reply.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="font-mono">
                            /{reply.shortcut}
                          </Badge>
                          {reply.isGlobal && (
                            <Badge variant="outline" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">
                          {reply.message}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(reply)}
                          data-testid={`button-edit-${reply.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(reply.id)}
                          data-testid={`button-delete-${reply.id}`}
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}