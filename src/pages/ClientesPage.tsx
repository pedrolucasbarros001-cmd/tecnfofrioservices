import { useState } from 'react';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { CreateCustomerModal } from '@/components/modals/CreateCustomerModal';
import { CustomerDetailSheet } from '@/components/shared/CustomerDetailSheet';
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers';
import type { Customer } from '@/types/database';

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  
  const { data: customers = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.phone?.includes(search) ||
      customer.nif?.includes(search)
    );
  });

  const handleEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja eliminar este cliente?')) {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
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
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {searchTerm
                    ? 'Nenhum cliente encontrado com a pesquisa.'
                    : 'Ainda não existem clientes. Crie o primeiro!'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
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
                  <TableCell className="max-w-[200px] truncate">
                    {customer.address || '-'}
                  </TableCell>
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
  );
}
