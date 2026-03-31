import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wrench, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logActivity } from '@/utils/activityLogUtils';
import { invalidateServiceQueries } from '@/lib/queryInvalidation';
import { technicianUpdateService } from '@/utils/technicianRpc';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Service, ServicePart } from '@/types/database';

interface TechnicianEditServiceModalProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NewPart extends Partial<ServicePart> {
  part_name: string;
  part_code: string;
  quantity: number;
  cost: number;
  is_requested: boolean;
  notes?: string;
}

const emptyPart = (isRequested = false): NewPart => ({
  part_name: '',
  part_code: '',
  quantity: 1,
  cost: 0,
  is_requested: isRequested,
  notes: ''
});

export function TechnicianEditServiceModal({ service, open, onOpenChange }: TechnicianEditServiceModalProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Equipment fields
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [applianceType, setApplianceType] = useState('');
  const [detectedFault, setDetectedFault] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');

  // Parts
  const [partsToDelete, setPartsToDelete] = useState<string[]>([]);
  const [newParts, setNewParts] = useState<NewPart[]>([]);

  const { data: existingParts = [], refetch: refetchParts } = useQuery({
    queryKey: ['service-parts-edit', service.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_parts')
        .select('*')
        .eq('service_id', service.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ServicePart[];
    },
    enabled: open,
  });

  const [parsedPricing, setParsedPricing] = useState<{ items: any[], discount?: any, adjustment?: number }>({ items: [] });

  useEffect(() => {
    if (open) {
      setBrand(service.brand || '');
      setModel(service.model || '');
      setSerialNumber(service.serial_number || '');
      setApplianceType(service.appliance_type || '');
      setDetectedFault(service.detected_fault || '');
      setWorkPerformed(service.work_performed || '');
      setPartsToDelete([]);
      setNewParts([]);

      if (service.pricing_description) {
        try {
          setParsedPricing(JSON.parse(service.pricing_description));
        } catch {
          setParsedPricing({ items: [] });
        }
      } else {
        setParsedPricing({ items: [] });
      }
    }
  }, [open, service]);

  const handleAddNewPart = (isRequested = false) => {
    setNewParts(prev => [...prev, emptyPart(isRequested)]);
  };

  const handleRemoveNewPart = (index: number) => {
    setNewParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateNewPart = (index: number, field: keyof NewPart, value: string | number) => {
    setNewParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleToggleDeletePart = (partId: string) => {
    setPartsToDelete(prev =>
      prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId]
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const changes: string[] = [];

      // Update service fields
      const updates: Record<string, any> = {};
      if (brand !== (service.brand || '')) { updates.brand = brand; changes.push(`Marca: "${service.brand || '(vazio)'}" → "${brand}"`); }
      if (model !== (service.model || '')) { updates.model = model; changes.push(`Modelo: "${service.model || '(vazio)'}" → "${model}"`); }
      if (serialNumber !== (service.serial_number || '')) { updates.serial_number = serialNumber; changes.push(`Nº Série: "${service.serial_number || '(vazio)'}" → "${serialNumber}"`); }
      if (applianceType !== (service.appliance_type || '')) { updates.appliance_type = applianceType; changes.push(`Tipo: "${service.appliance_type || '(vazio)'}" → "${applianceType}"`); }

      // Always send diagnosis/work via RPC — let the DB decide if there's a real change
      const { error: rpcError } = await technicianUpdateService({
        serviceId: service.id,
        detectedFault: detectedFault,
        workPerformed: workPerformed,
      });
      if (rpcError) throw rpcError;
      if (detectedFault !== (service.detected_fault || '')) changes.push(`Diagnóstico: "${service.detected_fault || '(vazio)'}" → "${detectedFault}"`);
      if (workPerformed !== (service.work_performed || '')) changes.push(`Trabalho realizado: "${service.work_performed || '(vazio)'}" → "${workPerformed}"`);


      // Update equipment fields directly
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('services')
          .update(updates)
          .eq('id', service.id);
        if (updateError) throw updateError;
      }

      // Delete parts (marking) - actual deletion via admin or if owner
      const removedPartNames: string[] = [];
      if (partsToDelete.length > 0) {
        // Collect names before deleting
        for (const partId of partsToDelete) {
          const found = existingParts.find(p => p.id === partId);
          if (found) removedPartNames.push(found.part_name);
        }

        const { error: delError } = await supabase
          .from('service_parts')
          .delete()
          .in('id', partsToDelete);

        if (delError) {
          console.warn('Failed to delete parts (RLS restriction):', delError);
          toast.error('Sem permissão para remover alguns artigos. Apenas o criador ou administrador pode removê-los.');
        } else {
          changes.push(`Removido: ${removedPartNames.join(', ')}`);
        }
      }

      // Insert new parts
      const addedPartNames: string[] = [];
      if (newParts.length > 0) {
        const validParts = newParts.filter(p => p.part_name.trim());
        if (validParts.length > 0) {
          addedPartNames.push(...validParts.map(p => p.part_name.trim()));
          const { error: insertError } = await supabase.from('service_parts').insert(
            validParts.map(p => ({
              service_id: service.id,
              part_name: p.part_name.trim(),
              part_code: p.part_code.trim() || null,
              quantity: p.quantity || 1,
              cost: p.cost || 0,
              is_requested: p.is_requested || false,
              notes: p.notes?.trim() || null,
            }))
          );
          if (insertError) throw insertError;
          changes.push(`Adicionado: ${addedPartNames.join(', ')}`);
        }
      }

      // Log activity with full audit trail
      if (changes.length > 0) {
        const actorName = profile?.full_name || 'Desconhecido';
        await logActivity({
          serviceId: service.id,
          actorId: user?.id,
          actionType: 'servico_editado',
          description: `Técnico ${actorName} editou ${service.code}: ${changes.join('; ')}`,
          isPublic: true,
          metadata: {
            previous: {
              brand: service.brand,
              model: service.model,
              serial_number: service.serial_number,
              appliance_type: service.appliance_type,
              detected_fault: service.detected_fault,
              work_performed: service.work_performed,
            },
            partsRemoved: removedPartNames,
            partsAdded: addedPartNames,
          },
        });
      }

      toast.success('Serviço atualizado!');
      invalidateServiceQueries(queryClient, service.id);
      onOpenChange(false);
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error('Erro ao atualizar serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0 bg-card"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Editar Serviço {service.code}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 space-y-6">
          {/* Equipment */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Equipamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Marca</Label>
                <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Marca" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modelo</Label>
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Modelo" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nº de Série</Label>
                <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Nº de Série" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Aparelho</Label>
                <Input value={applianceType} onChange={e => setApplianceType(e.target.value)} placeholder="Ex: Frigorífico" />
              </div>
            </div>
          </section>

          <Separator />

          {/* Diagnosis & Work */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Diagnóstico e Trabalho</h3>
            <div className="space-y-1">
              <Label className="text-xs">Avaria Detectada</Label>
              <Textarea value={detectedFault} onChange={e => setDetectedFault(e.target.value)} placeholder="Descreva a avaria detectada..." className="min-h-[60px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Trabalho Realizado</Label>
              <Textarea value={workPerformed} onChange={e => setWorkPerformed(e.target.value)} placeholder="Descreva o trabalho realizado..." className="min-h-[60px]" />
            </div>
          </section>

          <Separator />

          {/* Read-Only Admin Pricing/Articles Section */}
          {(parsedPricing.items.length > 0 || (service.final_price && service.final_price > 0)) && (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">
                    Artigos Registados (Administração)
                  </h3>
                </div>

                {parsedPricing.items.length > 0 ? (
                  <div className="bg-white border rounded-lg overflow-hidden text-sm">
                    <table className="w-full text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="p-2 font-medium">Ref</th>
                          <th className="p-2 font-medium">Descrição</th>
                          <th className="p-2 font-medium text-center">Qtd</th>
                          <th className="p-2 font-medium text-right">Preço</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedPricing.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-2 text-xs font-mono">{item.ref || '-'}</td>
                            <td className="p-2 font-medium">{item.desc}</td>
                            <td className="p-2 text-center text-xs">{item.qty || 1}</td>
                            <td className="p-2 text-right text-xs">{item.price.toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg text-sm text-indigo-800">
                    Consta valor a ser cobrado ou já orçamentado neste serviço.
                  </div>
                )}
              </section>
              <Separator />
            </>
          )}

          {/* Parts Sections */}
          <section className="space-y-6 pb-4">
            {/* 1. Used Parts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Artigos Utilizados
                </h3>
                <Button variant="outline" size="sm" onClick={() => handleAddNewPart(false)} className="gap-1 text-[10px] h-7 border-green-200 text-green-700 hover:bg-green-50">
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>

              {existingParts.filter(p => !p.is_requested).map(part => {
                const canDelete = part.registered_by === user?.id;
                return (
                  <div
                    key={part.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border text-sm transition-opacity",
                      partsToDelete.includes(part.id) ? 'opacity-40 line-through bg-destructive/5' : 'bg-green-50/20 border-green-100'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-green-900">{part.part_name}</span>
                      {part.part_code && <span className="text-muted-foreground ml-1 text-xs">({part.part_code})</span>}
                      <span className="text-muted-foreground ml-2 font-mono text-xs">x{part.quantity || 1}</span>
                      {part.cost ? <span className="text-muted-foreground ml-2 text-xs">{Number(part.cost).toFixed(2)} €</span> : null}
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleToggleDeletePart(part.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {newParts.filter(p => !p.is_requested).map((part, i) => (
                <PartFormRow
                  key={`new-used-${i}`}
                  part={part}
                  onUpdate={(f, v) => handleUpdateNewPart(newParts.indexOf(part), f, v)}
                  onRemove={() => handleRemoveNewPart(newParts.indexOf(part))}
                />
              ))}
            </div>

            <Separator />

            {/* 2. Requested Parts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Solicitar Artigo
                </h3>
                <Button variant="outline" size="sm" onClick={() => handleAddNewPart(true)} className="gap-1 text-[10px] h-7 border-amber-200 text-amber-700 hover:bg-amber-50">
                  <Plus className="h-3 w-3" /> Pedir Artigo
                </Button>
              </div>

              <div className="bg-amber-50/30 border border-amber-100/50 rounded-lg p-3 mb-2">
                <p className="text-[10px] text-amber-700 leading-tight italic">
                  Pedidos de peças aparecem automaticamente no painel administrativo.
                </p>
              </div>

              {existingParts.filter(p => p.is_requested).map(part => {
                const canDelete = part.registered_by === user?.id;
                return (
                  <div
                    key={part.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border text-sm transition-opacity",
                      partsToDelete.includes(part.id) ? 'opacity-40 line-through bg-destructive/5' : 'bg-amber-50/20 border-amber-100'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-amber-900">{part.part_name}</span>
                      {part.part_code && <span className="text-muted-foreground ml-1 text-xs">({part.part_code})</span>}
                      <span className="text-muted-foreground ml-2 font-mono text-xs">x{part.quantity || 1}</span>
                      {part.arrived && <Badge className="ml-2 bg-green-500 text-[9px] h-4">Chegou</Badge>}
                      {part.cost ? <span className="text-muted-foreground ml-2 text-xs">{Number(part.cost).toFixed(2)} €</span> : null}
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleToggleDeletePart(part.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {newParts.filter(p => p.is_requested).map((part, i) => (
                <PartFormRow
                  key={`new-req-${i}`}
                  part={part}
                  isRequested
                  onUpdate={(f, v) => handleUpdateNewPart(newParts.indexOf(part), f, v)}
                  onRemove={() => handleRemoveNewPart(newParts.indexOf(part))}
                />
              ))}
            </div>

            {existingParts.length === 0 && newParts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum artigo ou encomenda registada</p>
            )}
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PartFormRow({ part, onUpdate, onRemove, isRequested = false }: {
  part: NewPart;
  onUpdate: (field: keyof NewPart, value: any) => void;
  onRemove: () => void;
  isRequested?: boolean;
}) {
  return (
    <div className={cn(
      "space-y-2 p-3 rounded-md border border-dashed",
      isRequested ? "border-amber-300 bg-amber-50/20" : "border-green-300 bg-green-50/20"
    )}>
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-bold uppercase", isRequested ? "text-amber-700" : "text-green-700")}>
          {isRequested ? "Novo Pedido de Artigo" : "Novo Artigo Utilizado"}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Descrição do artigo *"
          value={part.part_name}
          onChange={e => onUpdate('part_name', e.target.value)}
          className="text-xs h-8"
        />
        <Input
          placeholder="Código/Ref"
          value={part.part_code}
          onChange={e => onUpdate('part_code', e.target.value)}
          className="text-xs h-8"
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-1">
          <Input
            type="number"
            min={1}
            value={part.quantity}
            onChange={e => onUpdate('quantity', parseInt(e.target.value) || 1)}
            className="text-xs h-8 px-1 text-center"
            placeholder="Qtd"
          />
        </div>
        <div className="col-span-1">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={part.cost || ''}
            onChange={e => onUpdate('cost', parseFloat(e.target.value) || 0)}
            className="text-xs h-8 px-1"
            placeholder="Preço €"
          />
        </div>
        <div className="col-span-2">
          <Input
            placeholder="Observações..."
            value={part.notes}
            onChange={e => onUpdate('notes', e.target.value)}
            className="text-xs h-8"
          />
        </div>
      </div>
    </div>
  );
}
