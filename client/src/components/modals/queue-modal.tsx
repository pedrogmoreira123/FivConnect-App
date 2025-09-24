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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QueueData } from '@/types';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue?: QueueData;
  onSave?: (data: QueueData) => void;
}

export default function QueueModal({ isOpen, onClose, queue, onSave }: QueueModalProps) {
  const [queueName, setQueueName] = useState('');
  const [workingDays, setWorkingDays] = useState('monday');
  const [workingHours, setWorkingHours] = useState('09:00-18:00');
  const [messageInsideHours, setMessageInsideHours] = useState('');
  const [messageOutsideHours, setMessageOutsideHours] = useState('');

  useEffect(() => {
    if (queue) {
      setQueueName(queue.name);
      setWorkingDays('monday');
      setWorkingHours('09:00-18:00');
      setMessageInsideHours('');
      setMessageOutsideHours('');
    } else {
      setQueueName('');
      setWorkingDays('monday');
      setWorkingHours('09:00-18:00');
      setMessageInsideHours('');
      setMessageOutsideHours('');
    }
  }, [queue, isOpen]);

  const handleSave = () => {
    const queueData = {
      id: queue?.id,
      name: queueName,
      workingDays,
      workingHours,
      messageInsideHours,
      messageOutsideHours
    };
    
    if (onSave) {
      onSave(queueData);
    } else {
      console.log(queue ? 'Atualizando fila:' : 'Criando fila:', queueData);
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]" data-testid="modal-queue">
        <DialogHeader>
          <DialogTitle>{queue ? 'Editar Fila' : 'Adicionar Fila'}</DialogTitle>
          <DialogDescription>
            Configure as configurações da fila incluindo horários de funcionamento e mensagens.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="queueName">Nome da Fila</Label>
            <Input
              id="queueName"
              placeholder="Digite o nome da fila"
              value={queueName}
              onChange={(e) => setQueueName(e.target.value)}
              data-testid="input-queue-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Horário de Funcionamento</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={workingDays} onValueChange={setWorkingDays}>
                <SelectTrigger data-testid="select-working-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Segunda-feira</SelectItem>
                  <SelectItem value="tuesday">Terça-feira</SelectItem>
                  <SelectItem value="wednesday">Quarta-feira</SelectItem>
                  <SelectItem value="thursday">Quinta-feira</SelectItem>
                  <SelectItem value="friday">Sexta-feira</SelectItem>
                  <SelectItem value="saturday">Sábado</SelectItem>
                  <SelectItem value="sunday">Domingo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={workingHours} onValueChange={setWorkingHours}>
                <SelectTrigger data-testid="select-working-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00-18:00">09:00 - 18:00</SelectItem>
                  <SelectItem value="08:00-17:00">08:00 - 17:00</SelectItem>
                  <SelectItem value="24-hours">24 Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="messageInsideHours">Mensagem (Dentro do Horário)</Label>
            <Textarea
              id="messageInsideHours"
              className="h-20 resize-none"
              placeholder="Mensagem para dentro do horário de funcionamento"
              value={messageInsideHours}
              onChange={(e) => setMessageInsideHours(e.target.value)}
              data-testid="textarea-message-inside-hours"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="messageOutsideHours">Mensagem (Fora do Horário)</Label>
            <Textarea
              id="messageOutsideHours"
              className="h-20 resize-none"
              placeholder="Mensagem para fora do horário de funcionamento"
              value={messageOutsideHours}
              onChange={(e) => setMessageOutsideHours(e.target.value)}
              data-testid="textarea-message-outside-hours"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-queue">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!queueName}
            data-testid="button-save-queue"
          >
            Salvar Fila
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
