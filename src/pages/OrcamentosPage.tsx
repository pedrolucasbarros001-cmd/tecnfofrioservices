import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, FileText, Check, X, ArrowRight, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateBudgetModal } from '@/components/modals/CreateBudgetModal';
import { ConvertBudgetModal } from '@/components/modals/ConvertBudgetModal';
import { EditBudgetDetailsModal } from '@/components/modals/EditBudgetDetailsModal';
import { BudgetDetailPanel } from '@/components/shared/BudgetDetailPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500 text-black' },
  aprovado: { label: 'Aprovado', color: 'bg-green-500 text-white' },
  recusado: { label: 'Recusado', color: 'bg-red-500 text-white' },
  convertido: { label: 'Convertido', color: 'bg-blue-500 text-white' },
};

export default function OrcamentosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [budgetToConvert, setBudgetToConvert] = useState<any | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<any | null>(null);

  const { data: budgets = [], isLoading, refetch } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch =
      !searchTerm ||
      budget.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || budget.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (budgetId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ status: newStatus })
        .eq('id', budgetId);

      if (error) throw error;
      
      const statusMessages: Record<string, string> = {
        aprovado: 'Orçamento aprovado com sucesso!',
        recusado: 'Orçamento recusado.',
      };
      toast.success(statusMessages[newStatus] || 'Estado atualizado');
      refetch();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Erro ao atualizar orçamento');
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetToDelete.id);

      if (error) throw error;
      
      toast.success('Orçamento excluído com sucesso!');
      refetch();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Erro ao excluir orçamento');
    } finally {
      setBudgetToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenConvertModal = (budget: any) => {
    setBudgetToConvert(budget);
    setShowConvertModal(true);
  };

  const handleViewDetails = (budget: any) => {
    setSelectedBudget(budget);
    setShowDetailPanel(true);
  };

  const handleRowClick = (budget: any) => {
    handleViewDetails(budget);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '€0.00';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getFirstArticle = (budget: any) => {
    if (!budget.pricing_description) return null;
    try {
      const parsed = JSON.parse(budget.pricing_description);
      if (parsed.items && parsed.items.length > 0) {
        return {
          name: parsed.items[0].description || '-',
          ref: parsed.items[0].ref || '-',
          count: parsed.items.length
        };
      }
    } catch { }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-tour="orcamentos-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Gerir orçamentos e propostas</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Orçamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
            <SelectItem value="convertido">Convertido</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="h-10 px-4 flex items-center">
          {filteredBudgets.length}
        </Badge>
      </div>

      {/* Budgets Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              A carregar...
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum orçamento encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Artigo</TableHead>
                  <TableHead>Ref.</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => {
                  const statusConfig = STATUS_CONFIG[budget.status as keyof typeof STATUS_CONFIG];
                  const firstArticle = getFirstArticle(budget);

                  return (
                    <TableRow
                      key={budget.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(budget)}
                    >
                      <TableCell className="font-mono font-semibold text-primary">
                        {budget.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {budget.customer?.name || 'Sem cliente'}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {firstArticle?.name || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {firstArticle?.ref || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {firstArticle ? (
                          <Badge variant="outline" className="text-xs">
                            {firstArticle.count} {firstArticle.count === 1 ? 'artigo' : 'artigos'}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        {formatCurrency(budget.estimated_total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig?.color || 'bg-gray-500'}>
                          {statusConfig?.label || budget.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              Ações
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(budget);
                            }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {budget.status === 'pendente' && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBudgetToEdit(budget);
                                    setShowEditBudgetModal(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(budget.id, 'aprovado');
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-2 text-green-500" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(budget.id, 'recusado');
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2 text-red-500" />
                                  Recusar
                                </DropdownMenuItem>
                              </>
                            )}
                            {budget.status === 'aprovado' && !budget.converted_service_id && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenConvertModal(budget);
                                }}
                              >
                                <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                                Converter em Serviço
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBudgetToDelete(budget);
                                setShowDeleteConfirm(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Budget Modal */}
      <CreateBudgetModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => refetch()}
      />

      {/* Convert Budget Modal */}
      <ConvertBudgetModal
        open={showConvertModal}
        onOpenChange={setShowConvertModal}
        budget={budgetToConvert}
        onSuccess={() => refetch()}
      />

      {/* Budget Detail Panel */}
      <BudgetDetailPanel
        open={showDetailPanel}
        onOpenChange={setShowDetailPanel}
        budget={selectedBudget}
        onUpdate={() => refetch()}
      />

      {/* Edit Budget Details Modal */}
      <EditBudgetDetailsModal
        open={showEditBudgetModal}
        onOpenChange={setShowEditBudgetModal}
        budget={budgetToEdit}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O orçamento {budgetToDelete?.code} será 
              permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteBudget}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
