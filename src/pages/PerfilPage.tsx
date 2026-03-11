import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Wrench, Calendar, Edit2, Award, Briefcase, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return 'hsl(var(--primary))';
  const colors = [
    'hsl(210, 70%, 50%)', // Blue
    'hsl(150, 60%, 40%)', // Green
    'hsl(280, 60%, 50%)', // Purple
    'hsl(30, 80%, 50%)',  // Orange
    'hsl(340, 70%, 50%)', // Pink
    'hsl(180, 60%, 45%)', // Teal
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default function PerfilPage() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
  });

  // Query technician data
  const { data: technicianData } = useQuery({
    queryKey: ['technician-profile', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Query service statistics
  const { data: stats } = useQuery({
    queryKey: ['technician-stats', technicianData?.id],
    queryFn: async () => {
      if (!technicianData?.id) return null;

      // Total de servicos
      const { count: total } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('technician_id', technicianData.id);

      // Concluidos este mes
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
      const { count: thisMonth } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('technician_id', technicianData.id)
        .in('status', ['concluidos', 'finalizado'])
        .gte('updated_at', startOfCurrentMonth);

      // Servicos ativos
      const { count: active } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('technician_id', technicianData.id)
        .in('status', ['por_fazer', 'em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca']);

      return { total: total || 0, thisMonth: thisMonth || 0, active: active || 0 };
    },
    enabled: !!technicianData?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      if (!profile?.id) throw new Error('Profile not found');
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-profile'] });
      toast.success('Perfil atualizado com sucesso');
      setShowEditModal(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });

  const handleOpenEditModal = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    if (!editForm.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    updateProfileMutation.mutate(editForm);
  };

  const avatarColor = getAvatarColor(profile?.full_name);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-tour="perfil-header">Perfil</h1>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20 text-2xl" style={{ backgroundColor: avatarColor }}>
              <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white font-semibold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-semibold">{profile?.full_name || 'Sem nome'}</h2>
                {technicianData?.specialization && (
                  <p className="text-muted-foreground text-sm">{technicianData.specialization}</p>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{profile?.email || user?.email || 'Sem email'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{profile?.phone || 'Sem telefone'}</span>
                </div>
                {technicianData?.specialization && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    <span>Especialização: {technicianData.specialization}</span>
                  </div>
                )}
              </div>

              <Button onClick={handleOpenEditModal} variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Editar Perfil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-primary">{stats?.total || 0}</div>
              <div className="text-sm text-muted-foreground">Serviços Total</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats?.thisMonth || 0}</div>
              <div className="text-sm text-muted-foreground">Este Mês</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-orange-500">{stats?.active || 0}</div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Informação da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Cargo</span>
            <Badge variant="secondary">Técnico</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">Membro desde</span>
            <span className="font-medium">
              {profile?.created_at
                ? format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: pt })
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Estado</span>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize as suas informações pessoais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+351 912 345 678"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProfile} 
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
