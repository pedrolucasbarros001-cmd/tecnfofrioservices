import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Bell, Lock, Globe, Info, BellRing, AlertTriangle, Package, BookOpen, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useDemo } from '@/contexts/DemoContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';

export default function PreferenciasPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { openOnboarding } = useOnboarding();
  const { startDemo } = useDemo();
  const { role } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences (local state for now - could be persisted to DB)
  const [notifications, setNotifications] = useState({
    newServices: true,
    partsArrived: true,
    urgentAlerts: true,
  });

  // Password validation matching server-side requirements
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'A palavra-passe deve ter pelo menos 8 caracteres';
    }
    if (!/[A-Z]/.test(password)) {
      return 'A palavra-passe deve conter pelo menos uma letra maiúscula';
    }
    if (!/[a-z]/.test(password)) {
      return 'A palavra-passe deve conter pelo menos uma letra minúscula';
    }
    if (!/[0-9]/.test(password)) {
      return 'A palavra-passe deve conter pelo menos um número';
    }
    return null;
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As palavras-passe não coincidem');
      return;
    }

    // Client-side validation (matches server-side)
    const validationError = validatePassword(passwordForm.newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsChangingPassword(true);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        setIsChangingPassword(false);
        return;
      }

      // Call edge function for server-side password validation
      const response = await fetch(
        'https://flialeqlwrtfnonxtsnx.supabase.co/functions/v1/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Erro ao alterar palavra-passe');
        return;
      }

      toast.success('Palavra-passe alterada com sucesso');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar palavra-passe');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-tour="preferencias-header">Preferências</h1>

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Aparência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tema</Label>
              <p className="text-sm text-muted-foreground">
                Escolha o tema da aplicação
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Claro
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Escuro
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  Sistema
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Idioma
              </Label>
              <p className="text-sm text-muted-foreground">
                Idioma da aplicação
              </p>
            </div>
            <span className="text-sm font-medium">Português (Portugal)</span>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                Novos serviços
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificação quando um novo serviço for atribuído
              </p>
            </div>
            <Switch
              checked={notifications.newServices}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, newServices: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Peças chegaram
              </Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando peças solicitadas chegarem
              </p>
            </div>
            <Switch
              checked={notifications.partsArrived}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, partsArrived: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas urgentes
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber alertas para serviços urgentes
              </p>
            </div>
            <Switch
              checked={notifications.urgentAlerts}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, urgentAlerts: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Palavra-passe</Label>
              <p className="text-sm text-muted-foreground">
                Altere a sua palavra-passe de acesso
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
              Alterar Palavra-passe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guide Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Guia do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tutorial em Diapositivos</Label>
              <p className="text-sm text-muted-foreground">
                Rever o guia de utilização do sistema
              </p>
            </div>
            <Button variant="outline" onClick={openOnboarding}>
              Ver Guia
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Demo Interativa
              </Label>
              <p className="text-sm text-muted-foreground">
                Percorrer o sistema passo a passo com explicações
              </p>
            </div>
            <Button
              onClick={() => role && startDemo(role as any)}
              className="bg-[#2B4F84] hover:bg-[#2B4F84]/90 text-white"
              disabled={!role}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Iniciar Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Sobre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <img
              src={tecnofrioLogoIcon}
              alt="TECNOFRIO"
              className="h-12 w-12 object-contain"
            />
            <div>
              <h3 className="font-semibold">
                <span className="text-[#2B4F84]">TECNO</span>
                <span className="text-slate-700 dark:text-slate-300">FRIO</span>
              </h3>
              <p className="text-sm text-muted-foreground">Sistema de Gestão</p>
              <p className="text-xs text-muted-foreground mt-1">Versão 1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Palavra-passe</DialogTitle>
            <DialogDescription>
              Introduza a sua palavra-passe atual e a nova palavra-passe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Palavra-passe Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Palavra-passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, com letra maiúscula, minúscula e número
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Palavra-passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
              {isChangingPassword ? 'A alterar...' : 'Alterar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
