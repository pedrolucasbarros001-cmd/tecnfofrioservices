import { Phone, Mail, X, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

interface ContactClientModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactClientModal({ service, open, onOpenChange }: ContactClientModalProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const customer = service?.customer;
  const remainingBalance = (service?.final_price || 0) - (service?.amount_paid || 0);

  const hasPhone = customer?.phone && customer.phone.trim() !== '';
  const hasEmail = customer?.email && customer.email.trim() !== '';
  const hasContact = hasPhone || hasEmail;

  const handleSendCustomEmail = async () => {
    if (!service || !message.trim()) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-email-notification', {
        body: { 
          service_id: service.id, 
          action_type: 'custom_message',
          custom_message: message
        }
      });

      if (error) throw error;

      toast.success('Email enviado com sucesso!');
      setMessage('');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error sending custom email:', err);
      toast.error('Erro ao enviar email. Verifique a ligação.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Contactar Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {service && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium text-lg">{customer?.name || 'Cliente'}</p>
              {remainingBalance > 0 && (
                <p className="text-sm mt-2">
                  Valor em Falta: <span className="text-red-600 font-semibold">€{remainingBalance.toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          {hasContact ? (
            <div className="space-y-3">
              {hasPhone && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-4 border-2 hover:border-green-500 hover:bg-green-50"
                  asChild
                >
                  <a href={`tel:${customer!.phone}`}>
                    <Phone className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">Ligar</p>
                      <p className="text-sm text-muted-foreground">{customer!.phone}</p>
                    </div>
                  </a>
                </Button>
              )}

              {hasEmail && (
                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Textarea
                      placeholder="Escreva uma mensagem para o cliente..."
                      className="min-h-[120px] resize-none bg-background border-2 focus-visible:ring-blue-500"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSendCustomEmail}
                    disabled={isSending || !message.trim()}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar Email Profissional
                  </Button>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-muted"></div>
                    <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">ou use aplicação local</span>
                    <div className="flex-grow border-t border-muted"></div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3 border-2 hover:border-blue-500 hover:bg-blue-50 opacity-70"
                    asChild
                  >
                    <a href={`mailto:${customer!.email}`}>
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium text-xs">Abrir App de Email</p>
                        <p className="text-[10px] text-muted-foreground">{customer!.email}</p>
                      </div>
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <X className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum contacto disponível.</p>
              <p className="text-sm mt-1">Adicione um telefone ou email ao perfil do cliente.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
