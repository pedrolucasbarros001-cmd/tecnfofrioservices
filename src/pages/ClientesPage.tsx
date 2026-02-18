import { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBoundaryFallbackContent } from '@/components/ErrorBoundaryFallbackContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateCustomerModal } from '@/components/modals/CreateCustomerModal';
import { CustomerDetailSheet } from '@/components/shared/CustomerDetailSheet';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePaginatedCustomers, useDeleteCustomer } from '@/hooks/useCustomers';
import type { Customer } from '@/types/database';

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const PAGE_SIZE = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: result, isLoading } = usePaginatedCustomers({
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchTerm: debouncedSearch || undefined,
  });

  const customers = result?.data || [];
  const totalCount = result?.totalCount || 0;
  const totalPages = result?.totalPages || 0;

  const deleteCustomer = useDeleteCustomer();

  const handleEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem a certeza que deseja eliminar este cliente?')) {
      await deleteCustomer.mutateAsync(id);
    }
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailSheet(true);
  };

  const handleModalClose = (open: boolean) => {
    setShowModal(open);
    if (!open) setEditingCustomer(null);
  };

  return (
    <ErrorBoundary
      fallback={
        <ErrorBoundaryFallbackContent />
      }
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-tour="clientes-header">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gerir clientes do sistema</p>
          </div>
          <Button className="shrink-0" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Cliente
          </Button>
        </div>

        {/* Search + Counter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">
            {totalCount} cliente{totalCount !== 1 ? 's' : ''}
          </Badge>
        </div>


        {/* Table */}
        <div className="border rounded-lg">

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Morada</TableHead>
                <TableHead>Código Postal</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    A carregar clientes...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchTerm
                      ? 'Nenhum cliente encontrado com a pesquisa.'
                      : 'Ainda não existem clientes. Crie o primeiro!'}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(customer)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={customer.customer_type === 'empresa' ? 'outline' : 'secondary'}>
                        {customer.customer_type === 'empresa' ? 'Empresa' : 'Final'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{customer.address || '-'}</TableCell>
                    <TableCell>{customer.postal_code || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(customer); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleEdit(customer, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleDelete(customer.id, e)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="cliente"
          />
        </div>

        <CreateCustomerModal
          open={showModal}
          onOpenChange={handleModalClose}
          customer={editingCustomer}
        />

        <CustomerDetailSheet
          open={showDetailSheet}
          onOpenChange={setShowDetailSheet}
          customer={selectedCustomer}
          onUpdate={() => deleteCustomer.reset()}
        />
      </div>
    </ErrorBoundary>
  );
}
