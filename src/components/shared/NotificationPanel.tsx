import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Bell,
  Package,
  PackageCheck,
  UserPlus,
  DollarSign,
  Truck,
  AlertCircle,
  ClipboardList,
  CheckCheck,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NOTIFICATION_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  peca_pedida: { icon: Package, color: 'text-orange-500' },
  peca_chegou: { icon: PackageCheck, color: 'text-green-500' },
  servico_atribuido: { icon: UserPlus, color: 'text-blue-500' },
  precificacao: { icon: DollarSign, color: 'text-yellow-500' },
  entrega_agendada: { icon: Truck, color: 'text-purple-500' },
  servico_atrasado: { icon: AlertCircle, color: 'text-red-500' },
  tarefa_tecnico: { icon: ClipboardList, color: 'text-cyan-500' },
  transferencia_solicitada: { icon: ArrowRightLeft, color: 'text-blue-500' },
  transferencia_aceite: { icon: CheckCheck, color: 'text-green-500' },
  transferencia_recusada: { icon: X, color: 'text-red-500' },
  transferencia_aviso: { icon: ArrowRightLeft, color: 'text-orange-500' },
};

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type: string | null) => {
    const config = NOTIFICATION_ICONS[type || ''] || { icon: Bell, color: 'text-muted-foreground' };
    return config;
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Future: Navigate to service if service_id exists
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle>Notificações</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 px-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              A carregar...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Sem notificações</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {notifications.map((notification) => {
                const iconConfig = getIcon(notification.notification_type);
                const IconComponent = iconConfig.icon;

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'p-4 rounded-lg cursor-pointer transition-colors',
                      notification.is_read
                        ? 'bg-muted/50 hover:bg-muted'
                        : 'bg-primary/5 hover:bg-primary/10 border-l-4 border-primary'
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                          notification.is_read ? 'bg-muted' : 'bg-primary/10'
                        )}
                      >
                        <IconComponent className={cn('h-5 w-5', iconConfig.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              !notification.is_read && 'text-primary'
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: pt,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
