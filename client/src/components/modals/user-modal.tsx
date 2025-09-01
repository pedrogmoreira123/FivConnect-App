import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRole } from '@/types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserRole;
}

export default function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'agent'>('agent');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername((user as any).username || '');
      setEmail(user.email);
      setRole(user.role);
      setPassword('');
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setRole('agent');
      setPassword('');
    }
  }, [user, isOpen]);

  const handleSave = () => {
    const userData = {
      name,
      username,
      email,
      role,
      ...(password && { password })
    };
    
    console.log(user ? 'Atualizando usuário:' : 'Criando usuário:', userData);
    // Em uma aplicação real, isso chamaria a API para salvar o usuário
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-user">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Adicionar Usuário'}</DialogTitle>
          <DialogDescription>
            {user ? 'Atualizar informações e permissões do usuário.' : 'Criar uma nova conta de usuário com atribuição de função.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Digite o nome do usuário"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-user-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Nome de Usuário</Label>
            <Input
              id="username"
              type="text"
              placeholder="Digite o nome de usuário (ex: pedro.moreira)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-user-username"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="Digite o endereço de e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-user-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="agent">Agente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha'}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={user ? "Digite a nova senha" : "Digite a senha"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-user-password"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-user">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || !username || !email || (!user && !password)}
            data-testid="button-save-user"
          >
            Salvar Usuário
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
