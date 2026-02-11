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
  const [applianceType, setApplianceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && service) {
      setApplianceType(service.appliance_type || '');
      setBrand(service.brand || '');
      setModel(service.model || '');
      setSerialNumber(service.serial_number || '');
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
          appliance_type: applianceType || null,
          brand: brand || null,
          model: model || null,
          serial_number: serialNumber || null,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Detalhes do Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <Label>Descrição da Avaria</Label>
            <Textarea value={faultDescription} onChange={e => setFaultDescription(e.target.value)} placeholder="Descreva a avaria..." rows={3} />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
