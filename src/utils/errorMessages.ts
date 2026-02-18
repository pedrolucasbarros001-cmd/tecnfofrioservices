import { isSessionOrRlsError } from '@/integrations/supabase/client';

/**
 * Converts technical errors into human-friendly Portuguese messages.
 */
export function humanizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  // Session / auth errors
  if (isSessionOrRlsError(error)) {
    if (msg.includes('row-level security') || msg.includes('permission denied')) {
      return 'Não tem permissão para realizar esta ação. Verifique o seu cargo (dono/secretária).';
    }
    return 'Sessão expirada. Por favor, faça login novamente.';
  }

  // Duplicate key (email)
  if (msg.includes('duplicate key') || msg.includes('already exists') || msg.includes('already registered')) {
    return 'Já existe uma conta com este email. Cada perfil precisa de um email único.';
  }

  // Not-null constraint
  if (msg.includes('violates not-null constraint') || msg.includes('not-null')) {
    return 'Alguns campos obrigatórios não foram preenchidos.';
  }

  // Foreign key
  if (msg.includes('violates foreign key')) {
    return 'Um dos registos selecionados já não existe. Atualize a página e tente novamente.';
  }

  // Invalid date/constraint
  if (msg.includes('Invalid date') || msg.includes('invalid input syntax for type date')) {
    return 'A data selecionada é inválida. Verifique se escolheu uma data válida.';
  }

  if (msg.includes('check constraint') || msg.includes('violates check constraint')) {
    return 'O formato de algum campo (turno/horário) não é aceite pelo sistema.';
  }

  // Network errors
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('net::ERR_')) {
    return 'Problema de ligação à rede. Verifique a sua ligação e tente novamente.';
  }

  // Timeout
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return 'O pedido demorou demasiado. Por favor, tente novamente.';
  }

  // Generic fallback
  return 'Ocorreu um problema. Por favor, tente novamente ou contacte o suporte.';
}

/**
 * Re-export for convenience.
 */
export { isSessionOrRlsError as isSessionError } from '@/integrations/supabase/client';
