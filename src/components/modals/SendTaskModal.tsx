import { useState } from 'react';
import { Send, Users, User, Monitor } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logTaskSent } from '@/utils/activityLogUtils';
import { toast } from 'sonner';

interface SendTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendTaskModal({ open, onOpenChange }: SendTaskModalProps) {
  const { user, profile } = useAuth();
  const { data: technicians = [] } = useTechnicians();
  
  const [recipientType, setRecipientType] = useState<'tecnico' | 'secretaria' | 'todos'>('todos');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [showOnMonitor, setShowOnMonitor] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Escreva uma mensagem');
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine recipients
      let recipientUserIds: string[] = [];
      let recipientName: string | undefined;

      if (recipientType === 'todos') {
        // Get all technician user IDs
        const techProfileIds = technicians.map(t => t.profile_id);
        if (techProfileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id')
            .in('id', techProfileIds);
          
          recipientUserIds = profiles?.map(p => p.user_id) || [];
        }
      } else if (recipientType === 'tecnico' && selectedTechnicianId) {
        const selectedTech = technicians.find(t => t.id === selectedTechnicianId);
        if (selectedTech) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .eq('id', selectedTech.profile_id)
            .single();
          
          if (profile) {
            recipientUserIds = [profile.user_id];
            recipientName = profile.full_name || undefined;
          }
        }
      } else if (recipientType === 'secretaria') {
        // Get all secretaria users
        const { data: secretariaRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'secretaria');
        
        recipientUserIds = secretariaRoles?.map(r => r.user_id) || [];
      }

      // Create notifications for each recipient
      const notifications = recipientUserIds.map(userId => ({
        user_id: userId,
        notification_type: 'tarefa_tecnico',
        title: 'Nova Tarefa',
        message: message.trim(),
        is_read: false,
      }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      }

      // Log the activity
      await logTaskSent(
        message.trim(),
        recipientType,
        recipientName,
        user?.id,
        profile?.full_name || undefined
      );

      toast.success('Tarefa enviada com sucesso!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error sending task:', error);
      toast.error('Erro ao enviar tarefa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRecipientType('todos');
    setSelectedTechnicianId('');
    setMessage('');
    setShowOnMonitor(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Tarefa / Notificação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recipient Type */}
          <div className="space-y-3">
            <Label>Destinatário</Label>
            <RadioGroup
              value={recipientType}
              onValueChange={(value) => setRecipientType(value as typeof recipientType)}
              className="grid grid-cols-3 gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="todos" id="todos" />
                <Label htmlFor="todos" className="cursor-pointer flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Todos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tecnico" id="tecnico" />
                <Label htmlFor="tecnico" className="cursor-pointer flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Técnico
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="secretaria" id="secretaria" />
                <Label htmlFor="secretaria" className="cursor-pointer">
                  Secretaria
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Technician Select (if specific technician) */}
          {recipientType === 'tecnico' && (
            <div className="space-y-2">
              <Label>Selecionar Técnico</Label>
              <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tech.color || '#3B82F6' }}
                        />
                        {tech.profile?.full_name || 'Técnico'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a tarefa ou notificação..."
              rows={4}
            />
          </div>

          {/* Show on Monitor Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Mostrar no Monitor</p>
                <p className="text-xs text-muted-foreground">
                  A mensagem aparecerá no feed público da TV
                </p>
              </div>
            </div>
            <Switch
              checked={showOnMonitor}
              onCheckedChange={setShowOnMonitor}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isSubmitting ? 'A enviar...' : 'Enviar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
