import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryFallbackContentProps {
  message?: string;
}

export function ErrorBoundaryFallbackContent({ message }: ErrorBoundaryFallbackContentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Ocorreu um erro
          </h1>
          {message && (
            <p className="text-muted-foreground text-sm">{message}</p>
          )}
        </div>
        <Button onClick={() => window.location.reload()} className="w-full">
          Recarregar
        </Button>
      </div>
    </div>
  );
}
