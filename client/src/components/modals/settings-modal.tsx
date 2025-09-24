import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [notifications, setNotifications] = useState(true);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-settings">
        <DialogHeader>
          <DialogTitle>Configurações Rápidas</DialogTitle>
          <DialogDescription>
            Ajuste suas preferências e configurações de notificação.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Notificações</p>
              <p className="text-sm text-muted-foreground">Receber notificações do sistema</p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
              data-testid="switch-notifications"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleClose} data-testid="button-close-settings">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
