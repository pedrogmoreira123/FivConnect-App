import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (currentPassword && newPassword) {
        await apiRequest('POST', '/api/auth/change-password', { currentPassword, newPassword });
        toast({ title: 'Senha atualizada', description: 'Sua senha foi alterada com sucesso.' });
      }
      // Profile name/email update would be implemented here if supported by backend
      onClose();
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message || 'Falha ao atualizar perfil/senha', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setName(user?.name || '');
    setEmail(user?.email || '');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-profile">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais e altere sua senha.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-foreground text-2xl font-medium">
                {user?.initials}
              </span>
            </div>
            <Button variant="link" className="text-primary hover:text-primary/80 text-sm font-medium">
              Alterar Avatar
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="profileName">Nome</Label>
            <Input
              id="profileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-profile-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="profileEmail">E-mail</Label>
            <Input
              id="profileEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-profile-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Digite a senha atual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="input-current-password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-new-password"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-profile">
            Cancelar
          </Button>
          <Button onClick={handleSave} data-testid="button-save-profile" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Atualizar Perfil'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
