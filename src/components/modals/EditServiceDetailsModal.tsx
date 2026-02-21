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
import { Package, Plus, Trash2, Wrench, FileText, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Part {
  id?: string;
  part_name: string;
  part_code: string;
  quantity: number;
  is_requested: boolean;
  arrived?: boolean;
}

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
  const [pnc, setPnc] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [detectedFault, setDetectedFault] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [notes, setNotes] = useState('');

  const [parts, setParts] = useState<Part[]>([]);
  const [deletedPartIds, setDeletedPartIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && service) {
      setApplianceType(service.appliance_type || '');
      setBrand(service.brand || '');
      setModel(service.model || '');
      setSerialNumber(service.serial_number || '');
      setPnc(service.pnc || '');
      setFaultDescription(service.fault_description || '');
      setDetectedFault(service.detected_fault || '');
      setWorkPerformed(service.work_performed || '');
      setNotes(service.notes || '');

      fetchParts();
    }
  }, [open, service]);

  const fetchParts = async () => {
    if (!service?.id) return;
    const { data, error } = await supabase
      .from('service_parts')
      .select('*')
      .eq('service_id', service.id);

    if (error) {
      console.error('Error fetching parts:', error);
      return;
    }

    setParts(data || []);
    setDeletedPartIds([]);
  };

  const addPart = (isRequested: boolean) => {
    setParts(prev => [...prev, {
      part_name: '',
      part_code: '',
      quantity: 1,
      is_requested: isRequested,
      arrived: false
    }]);
  };

  const updatePart = (index: number, field: keyof Part, value: any) => {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePart = (index: number) => {
    const partToRemove = parts[index];
    if (partToRemove.id) {
      setDeletedPartIds(prev => [...prev, partToRemove.id!]);
    }
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // 1. Update Service details
      const { error: serviceError } = await supabase
        .from('services')
        .update({
          appliance_type: applianceType || null,
          brand: brand || null,
          model: model || null,
          serial_number: serialNumber || null,
          pnc: pnc || null,
          fault_description: faultDescription || null,
          detected_fault: detectedFault || null,
          work_performed: workPerformed || null,
          notes: notes || null,
        })
        .eq('id', service.id);

      if (serviceError) throw serviceError;

      // 2. Handle Part deletions
      if (deletedPartIds.length > 0) {
        const { error: delError } = await supabase
          .from('service_parts')
          .delete()
          .in('id', deletedPartIds);
        if (delError) throw delError;
      }

      // 3. Handle Part updates and insertions
      for (const part of parts) {
        if (!part.part_name.trim()) continue;

        if (part.id) {
          // Update existing
          const { error: upError } = await supabase
            .from('service_parts')
            .update({
              part_name: part.part_name,
              part_code: part.part_code,
              quantity: part.quantity,
              is_requested: part.is_requested
            })
            .eq('id', part.id);
          if (upError) throw upError;
        } else {
          // Insert new
          const { error: inError } = await supabase
            .from('service_parts')
            .insert({
              service_id: service.id,
              part_name: part.part_name,
              part_code: part.part_code,
              quantity: part.quantity,
              is_requested: part.is_requested,
              arrived: false,
              cost: 0
            });
          if (inError) throw inError;
        }
      }

      toast.success('Serviço atualizado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar serviço');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            Editar Serviço {service.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section: Equipamento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-1 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Equipamento</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Aparelho</Label>
                <Input value={applianceType} onChange={e => setApplianceType(e.target.value)} placeholder="Ex: Frigorífico" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Marca</Label>
                <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Samsung" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modelo</Label>
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: RB34" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nº Série</Label>
                <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Número de série" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PNC</Label>
                <Input value={pnc} onChange={e => setPnc(e.target.value)} placeholder="Product Number Code" />
              </div>
            </div>
          </div>

          {/* Section: Peças */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1 mb-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Peças</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addPart(false)} className="h-7 text-[10px]">
                  <Plus className="h-3 w-3 mr-1" /> Usada
                </Button>
                <Button variant="outline" size="sm" onClick={() => addPart(true)} className="h-7 text-[10px]">
                  <Plus className="h-3 w-3 mr-1" /> Pedida
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {parts.length === 0 ? (
                <p className="text-xs text-center py-4 text-muted-foreground italic">Nenhuma peça registada.</p>
              ) : (
                parts.map((part, idx) => (
                  <div key={idx} className={cn(
                    "grid grid-cols-12 gap-2 p-2 rounded-lg border items-center",
                    part.is_requested ? "bg-amber-50/30 border-amber-100" : "bg-green-50/30 border-green-100"
                  )}>
                    <div className="col-span-12 md:col-span-4">
                      <Input
                        placeholder="Peça"
                        value={part.part_name}
                        onChange={e => updatePart(idx, 'part_name', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-7 md:col-span-3">
                      <Input
                        placeholder="Referência"
                        value={part.part_code}
                        onChange={e => updatePart(idx, 'part_code', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Input
                        type="number"
                        value={part.quantity}
                        onChange={e => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-8 text-xs px-1 text-center"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2 flex justify-center">
                      <Badge variant={part.is_requested ? "warning" : "success"} className="text-[9px] h-5 px-1 uppercase tracking-tighter">
                        {part.is_requested ? "Pedida" : "Usada"}
                      </Badge>
                    </div>
                    <div className="col-span-1 md:col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removePart(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Diagnóstico e Trabalho */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Avaria Detectada
              </Label>
              <Textarea
                value={detectedFault}
                onChange={e => setDetectedFault(e.target.value)}
                placeholder="Descreva o que foi detectado no diagnóstico..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3" /> Trabalho Realizado
              </Label>
              <Textarea
                value={workPerformed}
                onChange={e => setWorkPerformed(e.target.value)}
                placeholder="Descreva as ações tomadas para resolver o problema..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Original</Label>
                <Textarea
                  value={faultDescription}
                  onChange={e => setFaultDescription(e.target.value)}
                  rows={2}
                  className="text-xs bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notas Internas</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs bg-muted/30"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isLoading ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
