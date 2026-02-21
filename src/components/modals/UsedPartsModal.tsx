import { useState } from 'react';
import { Package, Plus, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface PartEntry {
  name: string;
  reference: string;
  quantity: number;
}

interface UsedPartsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (parts: PartEntry[]) => void;
  title?: string;
  subtitle?: string;
  initialParts?: PartEntry[];
}

export function UsedPartsModal({
  open,
  onOpenChange,
  onConfirm,
  title = 'Registar Peças/Materiais Utilizados',
  subtitle = 'Adicione as peças ou materiais utilizados neste serviço.',
  initialParts = [{ name: '', reference: '', quantity: 1 }],
}: UsedPartsModalProps) {
  const [parts, setParts] = useState<PartEntry[]>(initialParts);

  const addPart = () => {
    setParts(prev => [...prev, { name: '', reference: '', quantity: 1 }]);
  };

  const removePart = (index: number) => {
    if (parts.length > 1) {
      setParts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updatePart = (index: number, field: keyof PartEntry, value: string | number) => {
    setParts(prev => prev.map((part, i) => 
      i === index ? { ...part, [field]: value } : part
    ));
  };

  const handleConfirm = () => {
    // Filter out empty parts
    const validParts = parts.filter(p => p.name.trim().length > 0);
    onConfirm(validParts);
    handleClose();
  };

  const handleClose = () => {
    setParts([{ name: '', reference: '', quantity: 1 }]);
    onOpenChange(false);
  };

  // Check if at least one part is valid
  const hasValidPart = parts.some(p => p.name.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
         <div className="space-y-4 py-4">
          <div className="space-y-3">
            {parts.map((part, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-3 rounded-lg border space-y-2",
                  part.name.trim() ? "bg-muted/30" : "bg-background"
                )}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Item {idx + 1}
                  </Label>
                  {parts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removePart(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Input
                  placeholder="Nome da peça/material *"
                  value={part.name}
                  onChange={(e) => updatePart(idx, 'name', e.target.value)}
                  className="text-sm"
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    className="col-span-2 text-sm"
                    placeholder="Referência (opcional)"
                    value={part.reference}
                    onChange={(e) => updatePart(idx, 'reference', e.target.value)}
                  />
                  <Input
                    className="text-sm"
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={part.quantity}
                    onChange={(e) => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addPart}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar outro item
          </Button>
         </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasValidPart}
            className="bg-primary hover:bg-primary/90"
          >
            <Check className="h-4 w-4 mr-1" />
            Concluir Registo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
