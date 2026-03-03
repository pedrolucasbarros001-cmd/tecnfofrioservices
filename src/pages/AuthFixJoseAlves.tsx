import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AuthFixJoseAlves() {
    const [email, setEmail] = useState('jose.alves@tecnofrio.pt'); // Provável email
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const checkAndFix = async () => {
        setLoading(true);
        try {
            // 1. Buscar o perfil pelo email
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', email);

            if (pError) throw pError;

            if (!profiles || profiles.length === 0) {
                setResult({ error: 'Perfil não encontrado para este email.' });
                return;
            }

            const profile = profiles[0];
            const userId = profile.user_id;

            // 2. Verificar role
            const { data: roles, error: rError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', userId);

            if (rError) throw rError;

            const hasRole = roles && roles.length > 0;

            // 3. Tentar fixar se não tiver role
            let fixDone = false;
            if (!hasRole) {
                const { error: insertError } = await supabase
                    .from('user_roles')
                    .insert({
                        user_id: userId,
                        role: 'tecnico'
                    });

                if (!insertError) fixDone = true;
            }

            setResult({
                profile,
                roles,
                fixAttempted: !hasRole,
                fixSuccess: fixDone
            });

            if (fixDone) {
                toast.success('Role de técnico vinculada com sucesso para José Alves!');
            } else if (hasRole) {
                toast.info('José Alves já possui uma role vinculada.');
            }

        } catch (error: any) {
            console.error(error);
            setResult({ error: error.message });
            toast.error('Erro ao verificar/corrigir: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Fix Autenticação: José Alves</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Use esta ferramenta para verificar se o técnico José Alves tem perfil e role vinculados.
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email do técnico"
                        />
                        <Button onClick={checkAndFix} disabled={loading}>
                            {loading ? 'Verificando...' : 'Verificar e Corrigir'}
                        </Button>
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-muted rounded-md overflow-auto">
                            <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
