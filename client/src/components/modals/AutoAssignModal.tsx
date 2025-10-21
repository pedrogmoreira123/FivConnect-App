import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Settings, Users, Clock, MessageSquare } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

interface AutoAssignRule {
  id: string;
  name: string;
  priority: number;
  conditions: any;
  actions: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AutoAssignModalProps {
  children: React.ReactNode;
}

export function AutoAssignModal({ children }: AutoAssignModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoAssignRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    priority: 1,
    conditions: {
      status: 'waiting',
      timeInQueue: 0,
      tags: []
    },
    actions: {
      assignTo: 'available_agent',
      assignToSpecific: '',
      sendTemplate: false,
      templateId: ''
    },
    isActive: true
  });

  const queryClient = useQueryClient();

  // Buscar regras existentes
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['/api/whatsapp/auto-assign/rules'],
    queryFn: async () => {
      const res = await apiClient.get('/api/whatsapp/auto-assign/rules');
      return res.data.rules || [];
    },
    enabled: isOpen
  });

  // Criar/atualizar regra
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/api/whatsapp/auto-assign/rules', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/auto-assign/rules'] });
      setFormData({
        name: '',
        priority: 1,
        conditions: {
          status: 'waiting',
          timeInQueue: 0,
          tags: []
        },
        actions: {
          assignTo: 'available_agent',
          assignToSpecific: '',
          sendTemplate: false,
          templateId: ''
        },
        isActive: true
      });
      setEditingRule(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.put(`/api/whatsapp/auto-assign/rules/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/auto-assign/rules'] });
      setEditingRule(null);
      setFormData({
        name: '',
        priority: 1,
        conditions: {
          status: 'waiting',
          timeInQueue: 0,
          tags: []
        },
        actions: {
          assignTo: 'available_agent',
          assignToSpecific: '',
          sendTemplate: false,
          templateId: ''
        },
        isActive: true
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/api/whatsapp/auto-assign/rules/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/auto-assign/rules'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRule) {
      updateMutation.mutate({
        id: editingRule.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (rule: AutoAssignRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      priority: rule.priority,
      conditions: rule.conditions,
      actions: rule.actions,
      isActive: rule.isActive
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta regra?')) {
      deleteMutation.mutate(id);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-100 text-red-800';
    if (priority <= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 2) return 'Alta';
    if (priority <= 5) return 'Média';
    return 'Baixa';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto-assign Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Regras */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Regras Configuradas</h3>
              <Button
                onClick={() => {
                  setEditingRule(null);
                  setFormData({
                    name: '',
                    priority: 1,
                    conditions: {
                      status: 'waiting',
                      timeInQueue: 0,
                      tags: []
                    },
                    actions: {
                      assignTo: 'available_agent',
                      assignToSpecific: '',
                      sendTemplate: false,
                      templateId: ''
                    },
                    isActive: true
                  });
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">Carregando regras...</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma regra configurada
                </div>
              ) : (
                rules.map((rule: AutoAssignRule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge className={getPriorityColor(rule.priority)}>
                            {getPriorityLabel(rule.priority)}
                          </Badge>
                          {rule.isActive ? (
                            <Badge variant="default">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Condições: {JSON.stringify(rule.conditions)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ações: {JSON.stringify(rule.actions)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Formulário de Edição */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {editingRule ? 'Editar Regra' : 'Nova Regra'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Regra</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Atribuir VIPs automaticamente"
                  required
                />
              </div>

              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Mais Alta</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 - Média</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="10">10 - Mais Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Condições</Label>
                <div className="space-y-3 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="status">Status da Conversa</Label>
                    <Select
                      value={formData.conditions.status}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, status: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="waiting">Em Espera</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="finished">Finalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timeInQueue">Tempo na Fila (minutos)</Label>
                    <Input
                      id="timeInQueue"
                      type="number"
                      value={formData.conditions.timeInQueue}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, timeInQueue: parseInt(e.target.value) || 0 }
                      })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Ações</Label>
                <div className="space-y-3 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="assignTo">Atribuir Para</Label>
                    <Select
                      value={formData.actions.assignTo}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        actions: { ...formData.actions, assignTo: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available_agent">Agente Disponível</SelectItem>
                        <SelectItem value="specific_agent">Agente Específico</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="least_busy">Menos Ocupado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.actions.assignTo === 'specific_agent' && (
                    <div>
                      <Label htmlFor="assignToSpecific">ID do Agente</Label>
                      <Input
                        id="assignToSpecific"
                        value={formData.actions.assignToSpecific}
                        onChange={(e) => setFormData({
                          ...formData,
                          actions: { ...formData.actions, assignToSpecific: e.target.value }
                        })}
                        placeholder="agent-id-123"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sendTemplate"
                      checked={formData.actions.sendTemplate}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        actions: { ...formData.actions, sendTemplate: checked }
                      })}
                    />
                    <Label htmlFor="sendTemplate">Enviar Template de Boas-vindas</Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Regra Ativa</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1"
                >
                  {editingRule ? 'Atualizar Regra' : 'Criar Regra'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingRule(null);
                    setFormData({
                      name: '',
                      priority: 1,
                      conditions: {
                        status: 'waiting',
                        timeInQueue: 0,
                        tags: []
                      },
                      actions: {
                        assignTo: 'available_agent',
                        assignToSpecific: '',
                        sendTemplate: false,
                        templateId: ''
                      },
                      isActive: true
                    });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
