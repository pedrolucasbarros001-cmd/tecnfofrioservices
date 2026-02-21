import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditServiceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  onSuccess: () => void;
}

export function EditServiceDetailsModal({ open, onOpenChange, service, onSuccess }: EditServiceDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Contact fields
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [servicePostalCode, setServicePostalCode] = useState('');
  const [serviceCity, setServiceCity] = useState('');

  // Equipment fields
  const [applianceType, setApplianceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [pnc, setPnc] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && service) {
      setContactName(service.contact_name || service.customer?.name || '');
      setContactPhone(service.contact_phone || service.customer?.phone || '');
      setContactEmail(service.contact_email || service.customer?.email || '');
      setServiceAddress(service.service_address || service.customer?.address || '');
      setServicePostalCode(service.service_postal_code || service.customer?.postal_code || '');
      setServiceCity(service.service_city || service.customer?.city || '');

      setApplianceType(service.appliance_type || '');
      setBrand(service.brand || '');
      setModel(service.model || '');
      setSerialNumber(service.serial_number || '');
      setPnc(service.pnc || '');
      setFaultDescription(service.fault_description || '');
      setNotes(service.notes || '');
    }
  }, [open, service]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('services')
        .update({
          contact_name: contactName || null,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
          service_address: serviceAddress || null,
          service_postal_code: servicePostalCode || null,
          service_city: serviceCity || null,
          appliance_type: applianceType || null,
          brand: brand || null,
          model: model || null,
          serial_number: serialNumber || null,
          pnc: pnc || null,
          fault_description: faultDescription || null,
          notes: notes || null,
        })
        .eq('id', service.id);

      if (error) throw error;
      toast.success('Detalhes do serviço atualizados');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar detalhes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Editar Detalhes do Serviço</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-5 pb-4">
            {/* Contact Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contacto nesta ficha</h3>
              <p className="text-xs text-muted-foreground">Estes dados são específicos desta ficha e não alteram o perfil do cliente.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nome de contacto" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Telefone" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Morada</Label>
                  <Input value={serviceAddress} onChange={e => setServiceAddress(e.target.value)} placeholder="Morada" />
                </div>
                <div>
                  <Label>Código Postal</Label>
                  <Input value={servicePostalCode} onChange={e => setServicePostalCode(e.target.value)} placeholder="Código Postal" />
                </div>
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={serviceCity} onChange={e => setServiceCity(e.target.value)} placeholder="Cidade" />
              </div>
            </div>

            <Separator />

            {/* Equipment Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Equipamento</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Aparelho</Label>
                  <Input value={applianceType} onChange={e => setApplianceType(e.target.value)} placeholder="Ex: Ar Condicionado" />
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Samsung" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Modelo</Label>
                  <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: AR12" />
                </div>
                <div>
                  <Label>Nº Série</Label>
                  <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Ex: SN12345" />
                </div>
              </div>
              <div>
                <Label>PNC</Label>
                <Input value={pnc} onChange={e => setPnc(e.target.value)} placeholder="Product Number Code" />
              </div>
              <div>
                <Label>Descrição da Avaria</Label>
                <Textarea value={faultDescription} onChange={e => setFaultDescription(e.target.value)} placeholder="Descreva a avaria..." rows={3} />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais..." rows={2} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
