import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Pencil, Power } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'dono' | 'secretaria' | 'tecnico' | null;
  is_active: boolean;
}

const ROLE_LABELS = {
  dono: { label: 'Administrador', color: 'bg-purple-500 text-white' },
  secretaria: { label: 'Secretária', color: 'bg-green-500 text-white' },
  tecnico: { label: 'Técnico', color: 'bg-blue-500 text-white' },
};

export default function ColaboradoresPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleToggleActive = async (user: UserWithRole) => {
    try {
      if (user.role === 'tecnico') {
        // Toggle technician active status
        const { error } = await supabase
          .from('technicians')
          .update({ active: !user.is_active })
          .eq('profile_id', user.id);

        if (error) throw error;
        toast.success(user.is_active ? 'Utilizador desativado' : 'Utilizador ativado');
        refetch();
      } else {
        toast.info('Apenas técnicos podem ser desativados');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao alterar estado do utilizador');
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
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Colaboradores</CardTitle>
            <Badge variant="secondary">Total: {users.length}</Badge>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Convidar Utilizador
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              A carregar...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum colaborador encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const roleConfig = user.role ? ROLE_LABELS[user.role] : null;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Sem nome'}
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        {roleConfig ? (
                          <Badge className={roleConfig.color}>
                            {roleConfig.label}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sem acesso</Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {user.role || '-'}
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
                          <Button size="icon" variant="ghost">
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
    </div>
  );
}
