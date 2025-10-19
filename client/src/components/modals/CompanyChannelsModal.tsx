import React, { useState, useEffect } from 'react';
import { X, Settings, Wifi, WifiOff, QrCode, Trash2, Save, AlertCircle, Calendar, DollarSign, Clock, Plus, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/lib/api-client';

interface WhatsAppChannel {
  id: string;
  connectionName: string;
  name: string;
  phone?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready' | 'destroyed';
  qrcode?: string;
  profilePictureUrl?: string;
  whapiChannelId?: string;
  providerType: string;
  webhookUrl?: string;
  isDefault: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
  whapiStatus?: string;
  whapiCreatedAt?: string;
  whapiUpdatedAt?: string;
  // Novos campos para informações de dias
  daysRemaining?: number;
  expiresAt?: string;
  mode?: 'sandbox' | 'live'; // ADICIONAR ESTE CAMPO
}

interface PartnerBalance {
  daysAvailable: number;
  balanceBRL: number;
  currency: string;
  pricePerDay: number;
}


interface CompanyChannelsData {
  success: boolean;
  company: {
    id: string;
    name: string;
    email: string;
    whatsappChannelLimit: number;
  };
  channels: WhatsAppChannel[];
  totalChannels: number;
  channelLimit: number;
}

interface CompanyChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

export function CompanyChannelsModal({ isOpen, onClose, companyId, companyName }: CompanyChannelsModalProps) {
  const [data, setData] = useState<CompanyChannelsData | null>(null);
  const [partnerBalance, setPartnerBalance] = useState<PartnerBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLimit, setNewLimit] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<WhatsAppChannel | null>(null);
  const [daysToAdd, setDaysToAdd] = useState(30);
  // ADICIONAR:
  const [showChangeModeModal, setShowChangeModeModal] = useState(false);
  const [newMode, setNewMode] = useState<'sandbox' | 'live'>('live');

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen && companyId) {
      loadChannelsData();
    }
  }, [isOpen, companyId]);

  const loadChannelsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Carregar dados dos canais e saldo do parceiro em paralelo
      const [channelsResponse, balanceResponse] = await Promise.allSettled([
        apiClient.get(`/api/admin/companies/${companyId}/whatsapp-channels`),
        apiClient.get('/api/whatsapp/partner/balance')
      ]);
      
      // Processar dados dos canais
      if (channelsResponse.status === 'fulfilled') {
        const channelsData: CompanyChannelsData = channelsResponse.value.data;
        setData(channelsData);
        // Verificar se company existe antes de acessar whatsappChannelLimit
        const channelLimit = channelsData.company?.whatsappChannelLimit || 1;
        setNewLimit(channelLimit);
      } else {
        console.error('Erro ao carregar canais da empresa:', channelsResponse.reason);
        setError('Erro ao carregar dados dos canais. Tente novamente.');
      }
      
      // Processar saldo do parceiro
      if (balanceResponse.status === 'fulfilled') {
        const balanceData = balanceResponse.value.data;
        setPartnerBalance(balanceData.data);
      } else {
        console.error('Erro ao carregar saldo do parceiro:', balanceResponse.reason);
        // Não definir erro aqui, pois o saldo é opcional
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLimit = async () => {
    if (newLimit < 0) {
      setError('O limite deve ser um número positivo');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.put(`/api/admin/companies/${companyId}/whatsapp-limit`, {
        limit: newLimit
      });

      // Recarregar dados para atualizar a interface
      await loadChannelsData();
    } catch (error: any) {
      console.error('Erro ao salvar limite:', error);
      setError('Erro ao salvar limite. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleActivateTrial = async () => {
    setSaving(true);
    setError(null);

    try {
      await apiClient.post('/api/whatsapp/channels/activate-trial');
      
      // Recarregar dados para atualizar a interface
      await loadChannelsData();
    } catch (error: any) {
      console.error('Erro ao ativar canal de teste:', error);
      setError('Erro ao ativar canal de teste. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      setError('Nome do canal é obrigatório');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.post(`/api/admin/companies/${companyId}/channels/create`, {
        channelName: newChannelName.trim()
      });
      
      // Recarregar dados para atualizar a interface
      await loadChannelsData();
      setShowCreateChannel(false);
      setNewChannelName('');
    } catch (error: any) {
      console.error('Erro ao criar canal:', error);
      setError('Erro ao criar canal. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenExtend = (channel: WhatsAppChannel) => {
    setSelectedChannel(channel);
    setShowExtendModal(true);
  };

  const handleExtendChannel = async () => {
    if (!selectedChannel || !selectedChannel.whapiChannelId || daysToAdd <= 0) {
      setError('Número de dias deve ser maior que zero');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.post(`/api/whatsapp/channels/${selectedChannel.whapiChannelId}/extend`, {
        days: daysToAdd
      });
      
      // Recarregar dados para atualizar a interface
      await loadChannelsData();
      setShowExtendModal(false);
      setSelectedChannel(null);
      setDaysToAdd(30);
    } catch (error: any) {
      console.error('Erro ao adicionar dias ao canal:', error);
      setError('Erro ao adicionar dias ao canal. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChangeMode = (channel: WhatsAppChannel) => {
    setSelectedChannel(channel);
    setNewMode(channel.mode === 'sandbox' ? 'live' : 'sandbox');
    setShowChangeModeModal(true);
  };

  const handleChangeMode = async () => {
    if (!selectedChannel || !selectedChannel.whapiChannelId) {
      setError('Canal não possui ID do Whapi.Cloud');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.post(
        `/api/admin/companies/${companyId}/channels/${selectedChannel.id}/change-mode`,
        { mode: newMode }
      );
      
      // Recarregar dados para atualizar a interface
      await loadChannelsData();
      setShowChangeModeModal(false);
      setSelectedChannel(null);
    } catch (error: any) {
      console.error('Erro ao alterar modo do canal:', error);
      setError('Erro ao alterar modo do canal. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { color: 'bg-green-100 text-green-800', icon: Wifi, label: 'Conectado' },
      disconnected: { color: 'bg-gray-100 text-gray-800', icon: WifiOff, label: 'Desconectado' },
      qr_ready: { color: 'bg-blue-100 text-blue-800', icon: QrCode, label: 'QR Code Disponível' },
      connecting: { color: 'bg-yellow-100 text-yellow-800', icon: Settings, label: 'Conectando' },
      destroyed: { color: 'bg-red-100 text-red-800', icon: Trash2, label: 'Destruído' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Gerenciar Canais WhatsApp
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {companyName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando dados...</span>
            </div>
          ) : error ? (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : data ? (
            <div className="space-y-6">
              {/* Limite de Canais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Limite de Canais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Limite de canais WhatsApp
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={newLimit}
                        onChange={(e) => setNewLimit(parseInt(e.target.value) || 0)}
                        className="w-32"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Atual: <span className="font-medium">{data?.totalChannels || 0}</span> canais</p>
                      <p>Limite: <span className="font-medium">{data?.channelLimit || 0}</span> canais</p>
                    </div>
                    <Button
                      onClick={handleSaveLimit}
                      disabled={saving || newLimit === (data?.channelLimit || 0)}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvando...' : 'Salvar Limite'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Saldo do Parceiro */}
              {partnerBalance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Saldo do Parceiro
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-900">{partnerBalance.daysAvailable}</p>
                        <p className="text-sm text-blue-700">Dias Disponíveis</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold text-green-900">R$ {partnerBalance.balanceBRL.toFixed(2)}</p>
                        <p className="text-sm text-green-700">Saldo em BRL</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <p className="text-2xl font-bold text-purple-900">R$ {partnerBalance.pricePerDay.toFixed(2)}</p>
                        <p className="text-sm text-purple-700">Por Dia</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={handleActivateTrial}
                        disabled={saving || partnerBalance.daysAvailable < 5}
                        className="flex items-center gap-2"
                        variant="outline"
                      >
                        <Calendar className="w-4 h-4" />
                        {saving ? 'Ativando...' : 'Ativar Canal com 5 Dias'}
                      </Button>
                    </div>
                    {partnerBalance.daysAvailable < 5 && (
                      <p className="text-sm text-red-600 text-center mt-2">
                        Saldo insuficiente para ativar canal de teste (mínimo 5 dias)
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Lista de Canais */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Canais WhatsApp ({data?.totalChannels || 0})</CardTitle>
                    <Button
                      onClick={() => setShowCreateChannel(true)}
                      disabled={(data?.totalChannels || 0) >= (data?.channelLimit || 0)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Canal
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!data.channels || data.channels.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <WifiOff className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum canal WhatsApp encontrado para esta empresa.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.channels.map((channel) => (
                        <div
                          key={channel.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">
                                {channel.connectionName}
                              </h3>
                              <p className="text-sm text-gray-500 mb-3">
                                {channel.phone || 'N/A'} • {channel.providerType.toUpperCase()}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {/* Status */}
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Status</p>
                                {getStatusBadge(channel.status)}
                              </div>
                              
                              {/* ADICIONAR: Modo */}
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Modo</p>
                                <Badge className={`${
                                  channel.mode === 'live' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {channel.mode === 'live' ? 'Live' : 'Sandbox'}
                                </Badge>
                              </div>
                              
                              {/* Dias Restantes */}
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Dias Restantes</p>
                                {channel.daysRemaining !== undefined ? (
                                  <Badge 
                                    className={`${
                                      channel.daysRemaining > 7 
                                        ? 'bg-green-100 text-green-800' 
                                        : channel.daysRemaining > 3 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {channel.daysRemaining} dias
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800">
                                    N/A
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Botões */}
                              <div className="flex gap-2">
                                {/* ADICIONAR: Botão Alterar Modo */}
                                {channel.whapiChannelId && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenChangeMode(channel)}
                                    className="flex items-center gap-2"
                                  >
                                    <Settings className="w-4 h-4" />
                                    Alterar Modo
                                  </Button>
                                )}
                                
                                {/* Botão Adicionar Dias (existente) */}
                                {channel.whapiChannelId && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenExtend(channel)}
                                    className="flex items-center gap-2"
                                  >
                                    <Calendar className="w-4 h-4" />
                                    Adicionar Dias
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Modal para criar canal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Criar Novo Canal</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Canal
                  </label>
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Ex: Canal Principal"
                    className="w-full"
                  />
                </div>
                {error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateChannel}
                disabled={saving || !newChannelName.trim()}
              >
                {saving ? 'Criando...' : 'Criar Canal'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para adicionar dias */}
      {showExtendModal && selectedChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Adicionar Dias ao Canal</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowExtendModal(false);
                  setSelectedChannel(null);
                  setDaysToAdd(30);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Canal: <span className="font-medium">{selectedChannel.connectionName}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Dias atuais: <span className="font-medium">{selectedChannel.daysRemaining || 0}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dias para Adicionar
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={daysToAdd}
                    onChange={(e) => setDaysToAdd(parseInt(e.target.value) || 0)}
                    placeholder="30"
                    className="w-full"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDaysToAdd(1)}
                    >
                      1 dia
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDaysToAdd(7)}
                    >
                      7 dias
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDaysToAdd(30)}
                    >
                      30 dias
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDaysToAdd(365)}
                    >
                      365 dias
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDaysToAdd(60)}
                    >
                      60 dias
                    </Button>
                  </div>
                </div>
                {error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExtendModal(false);
                  setSelectedChannel(null);
                  setDaysToAdd(30);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExtendChannel}
                disabled={saving || daysToAdd <= 0}
              >
                {saving ? 'Adicionando...' : 'Adicionar Dias'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para alterar modo do canal */}
      {showChangeModeModal && selectedChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Alterar Modo do Canal</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowChangeModeModal(false);
                  setSelectedChannel(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Canal: <span className="font-medium">{selectedChannel.connectionName}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Modo atual: <span className="font-medium">{selectedChannel.mode === 'sandbox' ? 'Sandbox (Teste)' : 'Live (Produção)'}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Novo Modo
                  </label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as 'sandbox' | 'live')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="sandbox">Sandbox (Teste - Grátis)</option>
                    <option value="live">Live (Produção - Pago)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {newMode === 'live' 
                      ? 'Modo Live: canal em produção, consome dias do pool do parceiro.' 
                      : 'Modo Sandbox: canal de teste, 5 dias grátis após ativação.'
                    }
                  </p>
                </div>
                {error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangeModeModal(false);
                  setSelectedChannel(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleChangeMode}
                disabled={saving}
              >
                {saving ? 'Alterando...' : 'Alterar Modo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
