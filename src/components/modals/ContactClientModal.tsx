import { Phone, Mail, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Service } from '@/types/database';

interface ContactClientModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactClientModal({ service, open, onOpenChange }: ContactClientModalProps) {
  const customer = service?.customer;
  const remainingBalance = (service?.final_price || 0) - (service?.amount_paid || 0);

  const hasPhone = customer?.phone && customer.phone.trim() !== '';
  const hasEmail = customer?.email && customer.email.trim() !== '';
  const hasContact = hasPhone || hasEmail;

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
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-4 border-2 hover:border-blue-500 hover:bg-blue-50"
                  asChild
                >
                  <a href={`mailto:${customer!.email}`}>
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{customer!.email}</p>
                    </div>
                  </a>
                </Button>
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
