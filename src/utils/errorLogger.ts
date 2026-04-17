import { supabase } from '@/integrations/supabase/client';

interface ErrorLogPayload {
  error: Error;
  componentStack?: string;
}

/**
 * Envia erro para a tabela error_logs do Supabase.
 * Não bloqueia. Não rebenta — falhas silenciosas (já estamos em estado de erro).
 */
export async function logErrorRemote({ error, componentStack }: ErrorLogPayload): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    let userRole: string | null = null;
    if (user?.id) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      userRole = (roleData as { role?: string } | null)?.role ?? null;
    }

    // A tabela error_logs só existe na DB, os tipos do supabase gerados ainda não a conhecem. Exige cast any.
    await supabase.from('error_logs' as any).insert({
      error_message: error.message?.slice(0, 1000) || 'unknown',
      error_stack: error.stack?.slice(0, 5000) || null,
      component_stack: componentStack?.slice(0, 5000) || null,
      user_id: user?.id || null,
      user_role: userRole,
      user_agent: navigator.userAgent.slice(0, 500),
      url: window.location.href.slice(0, 500),
    } as never);
  } catch (e) {
    // Falha silenciosa — não queremos crashar dentro do error handler
    console.warn('[errorLogger] failed to log error remotely:', e);
  }
}
