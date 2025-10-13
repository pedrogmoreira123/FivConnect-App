import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { mapContextualError } from '@/lib/error-mapper';
import { Plus, Edit, Trash2, Bell, Calendar, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author?: {
    name: string;
  };
}

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  useEffect(() => {
    document.title = 'FivConnect - Avisos';
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/announcements');
      return response.json();
    }
  });

  // Create/Update announcement mutation
  const announcementMutation = useMutation({
    mutationFn: async (data: Partial<Announcement>) => {
      if (selectedAnnouncement) {
        return await apiRequest('PUT', `/api/admin/announcements/${selectedAnnouncement.id}`, data);
      } else {
        return await apiRequest('POST', '/api/admin/announcements', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setIsModalOpen(false);
      setSelectedAnnouncement(null);
      toast({
        title: "Sucesso",
        description: selectedAnnouncement ? "Aviso atualizado com sucesso!" : "Aviso criado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: mapContextualError(error, 'announcement-edit'),
        variant: "destructive"
      });
    }
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      return await apiRequest('DELETE', `/api/admin/announcements/${announcementId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({
        title: "Sucesso",
        description: "Aviso excluído com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: mapContextualError(error, 'announcement-deletion'),
        variant: "destructive"
      });
    }
  });

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const handleDelete = (announcementId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este aviso?')) {
      deleteMutation.mutate(announcementId);
    }
  };

  const handleAdd = () => {
    setSelectedAnnouncement(null);
    setIsModalOpen(true);
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">
              Apenas superadministradores podem gerenciar avisos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Avisos</h1>
            <p className="text-muted-foreground">
              Crie e gerencie avisos para todos os usuários da plataforma
            </p>
          </div>
          <Button onClick={handleAdd} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Aviso
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Avisos</span>
              </CardTitle>
              <div className="w-64">
                <Input
                  placeholder="Buscar avisos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum aviso encontrado</p>
                <p className="text-sm">Clique em "Novo Aviso" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <Card key={announcement.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                            <Badge variant={announcement.isActive ? "default" : "secondary"}>
                              {announcement.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{announcement.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{announcement.author?.name || 'Sistema'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(announcement.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(announcement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAnnouncement(null);
        }}
        announcement={selectedAnnouncement}
        onSave={(data) => announcementMutation.mutate(data)}
      />
    </>
  );
}

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  onSave: (data: Partial<Announcement>) => void;
}

function AnnouncementModal({ isOpen, onClose, announcement, onSave }: AnnouncementModalProps) {
  const [title, setTitle] = useState(announcement?.title || '');
  const [content, setContent] = useState(announcement?.content || '');
  const [isActive, setIsActive] = useState(announcement?.isActive ?? true);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    onSave({
      title: title.trim(),
      content: content.trim(),
      isActive
    });
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setIsActive(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {announcement ? 'Editar Aviso' : 'Novo Aviso'}
          </DialogTitle>
          <DialogDescription>
            {announcement ? 'Atualize as informações do aviso' : 'Crie um novo aviso para todos os usuários'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do aviso"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite o conteúdo do aviso"
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Aviso ativo</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
            {announcement ? 'Atualizar' : 'Criar'} Aviso
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
