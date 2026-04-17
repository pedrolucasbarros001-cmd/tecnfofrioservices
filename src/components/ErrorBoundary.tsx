import React from 'react';
import { logErrorRemote } from '@/utils/errorLogger';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Renderiza a UI de fallback na próxima renderização.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    logErrorRemote({ error, componentStack: errorInfo.componentStack || undefined });
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 z-[9999] relative">
          <div className="max-w-3xl w-full text-center space-y-4 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-red-200 dark:border-red-900 shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Ocorreu um erro ao abrir a tela
              </h1>
              <p className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-800/30">
                🚨 POR FAVOR, TIRE UMA FOTO DESTA TELA COMPLETA E ENVIE AO SUPORTE. 🚨<br />
                Isso nos dirá exatamente em qual linha de código o sistema falhou.
              </p>
            </div>

            {this.state.error && (
              <details open className="text-left text-xs bg-muted/50 p-4 rounded-lg mt-4 border border-border shadow-inner overflow-auto max-h-[50vh]">
                <summary className="cursor-pointer text-destructive font-bold mb-3 text-sm">
                  Detalhes Técnicos do Erro
                </summary>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Mensagem do Erro (Causa):</p>
                    <pre className="whitespace-pre-wrap text-destructive font-mono text-[11px] p-2 bg-destructive/5 rounded">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <p className="font-semibold text-foreground mt-2 mb-1">Rastreamento (Árvore de Componentes):</p>
                      <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-[10px] leading-relaxed p-2 bg-background/50 rounded border border-border">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border mt-4">
              <Button onClick={this.handleRetry} className="flex-1" variant="default">
                <RefreshCcw className="h-4 w-4 mr-2" />
                <span>Tentar Recarregar</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                <span>Forçar Voltar ao Início</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
