import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  
  // Parse header - handle quoted fields
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

export default function ImportPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setStatus('loading');
    setProgress(10);
    setError('');

    try {
      // Fetch CSV files from public/data
      const [clientesRes, visitasRes] = await Promise.all([
        fetch('/data/Clientes.csv'),
        fetch('/data/Visitas.csv'),
      ]);

      const clientesText = await clientesRes.text();
      const visitasText = await visitasRes.text();
      
      setProgress(30);

      const customers = parseCSV(clientesText);
      const services = parseCSV(visitasText);

      setProgress(50);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Send to edge function
      const { data, error: fnError } = await supabase.functions.invoke('import-csv-data', {
        body: { customers, services },
      });

      setProgress(100);

      if (fnError) {
        throw new Error(fnError.message);
      }

      setResult(data);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
      setStatus('error');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importação de Dados</h1>
        <p className="text-muted-foreground">Importar clientes e serviços dos ficheiros CSV</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ficheiros CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-1">
            <p>• <strong>Clientes.csv</strong> — ~3.369 clientes</p>
            <p>• <strong>Visitas.csv</strong> — ~6.887 serviços</p>
          </div>

          {status === 'loading' && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                A importar dados... isto pode demorar alguns minutos.
              </p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 space-y-2">
              <p className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                <CheckCircle className="h-5 w-5" />
                Importação concluída!
              </p>
              <p className="text-sm">Clientes importados: <strong>{result.customersImported}</strong></p>
              <p className="text-sm">Serviços importados: <strong>{result.servicesImported}</strong></p>
              {result.errors?.length > 0 && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium">Avisos:</p>
                  {result.errors.map((e: string, i: number) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
              <p className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5" />
                {error}
              </p>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={status === 'loading'}
            size="lg"
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {status === 'loading' ? 'A importar...' : 'Iniciar Importação'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
