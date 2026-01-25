import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Pencil, Power, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { EditUserModal } from '@/components/modals/EditUserModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppRole } from '@/types/database';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole | null;
  is_active: boolean;
}

const ROLE_LABELS = {
  dono: { label: 'Administrador', color: 'bg-purple-500 text-white' },
  secretaria: { label: 'Secretária', color: 'bg-green-500 text-white' },
  tecnico: { label: 'Técnico', color: 'bg-blue-500 text-white' },
};

const ROLE_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ROLE_COLORS[hash % ROLE_COLORS.length];
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ColaboradoresPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserWithRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['collaborators'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Get technicians to check active status
      const { data: technicians, error: techError } = await supabase
        .from('technicians')
        .select('profile_id, active');

      if (techError) throw techError;

      // Combine data
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        const technician = technicians.find((t) => t.profile_id === profile.id);
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          role: userRole?.role || null,
          is_active: technician ? technician.active !== false : true,
        };
      });

      return usersWithRoles;
    },
  });

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleToggleActive = (user: UserWithRole) => {
    if (user.role === 'tecnico') {
      setUserToDeactivate(user);
      setShowDeactivateDialog(true);
    } else {
      toast.info('Apenas técnicos podem ser desativados');
    }
  };

  const confirmToggleActive = async () => {
    if (!userToDeactivate) return;

    try {
      const { error } = await supabase
        .from('technicians')
        .update({ active: !userToDeactivate.is_active })
        .eq('profile_id', userToDeactivate.id);

      if (error) throw error;
      toast.success(
        userToDeactivate.is_active ? 'Utilizador desativado' : 'Utilizador ativado'
      );
      refetch();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao alterar estado do utilizador');
    } finally {
      setShowDeactivateDialog(false);
      setUserToDeactivate(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Utilizadores</h1>
          <p className="text-muted-foreground">Gerir acessos e colaboradores</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Convidar Utilizador
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="dono">Administrador</SelectItem>
            <SelectItem value="secretaria">Secretária</SelectItem>
            <SelectItem value="tecnico">Técnico</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="h-10 px-4 flex items-center">
          {filteredUsers.length}
        </Badge>
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              A carregar...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum colaborador encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const roleConfig = user.role ? ROLE_LABELS[user.role] : null;
                  const avatarColor = getAvatarColor(user.full_name || user.email || '');

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`${avatarColor} text-white text-sm`}>
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {user.full_name || 'Sem nome'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.phone || '-'}
                      </TableCell>
                      <TableCell>
                        {roleConfig ? (
                          <Badge className={roleConfig.color}>
                            {roleConfig.label}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sem acesso</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active ? 'default' : 'secondary'}
                          className={user.is_active ? 'bg-green-500' : 'bg-gray-400'}
                        >
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {user.role === 'tecnico' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleToggleActive(user)}
                            >
                              <Power
                                className={`h-4 w-4 ${
                                  user.is_active ? 'text-destructive' : 'text-green-500'
                                }`}
                              />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <CreateUserModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => refetch()}
      />

      {/* Edit User Modal */}
      <EditUserModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        user={selectedUser}
        onSuccess={() => refetch()}
      />

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToDeactivate?.is_active ? 'Desativar Utilizador' : 'Ativar Utilizador'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToDeactivate?.is_active
                ? `Tem certeza que deseja desativar ${userToDeactivate?.full_name || 'este utilizador'}? Ele não poderá receber novos serviços.`
                : `Tem certeza que deseja ativar ${userToDeactivate?.full_name || 'este utilizador'}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
