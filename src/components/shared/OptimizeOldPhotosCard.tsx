import { useRef, useState } from 'react';
import { ImageDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/utils/imageCompression';
import { toast } from 'sonner';

const MIN_SIZE = 600_000; // only photos bigger than this are re-compressed
const BUCKET = 'service-photos';

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('compress-photos-admin', { body });
  if (error) throw error;
  return data;
}

function blobToDataUrl(b: Blob) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}

/** Owner-only: re-compresses old photos in place (same file, same link). */
export function OptimizeOldPhotosCard() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [saved, setSaved] = useState(0);
  const stop = useRef(false);

  const run = async () => {
    setRunning(true); stop.current = false; setDone(0); setSaved(0);
    try {
      const { folders } = await call({ action: 'folders' });
      const big: { name: string; size: number }[] = [];
      for (const folder of folders as string[]) {
        const { items } = await call({ action: 'files', folder });
        big.push(...(items as any[]).filter((i) => i.size > MIN_SIZE));
      }
      setTotal(big.length);
      let savedBytes = 0;
      for (let i = 0; i < big.length && !stop.current; i++) {
        const f = big[i];
        try {
          const { download, uploadToken } = await call({ action: 'sign', path: f.name });
          const blob = await (await fetch(download)).blob();
          const out = await compressImage(await blobToDataUrl(blob));
          const newBlob = await (await fetch(out)).blob();
          if (newBlob.size > 0 && newBlob.size < blob.size * 0.9) {
            const { error } = await supabase.storage.from(BUCKET)
              .uploadToSignedUrl(f.name, uploadToken, newBlob, { contentType: 'image/jpeg' });
            if (!error) savedBytes += blob.size - newBlob.size;
          }
        } catch (e) { console.warn('skip', f.name, e); }
        setDone(i + 1); setSaved(savedBytes);
      }
      toast.success(`Fotos otimizadas. Libertados ${(savedBytes / 1e9).toFixed(2)} GB.`);
    } catch (e) {
      console.error(e); toast.error('Não foi possível otimizar as fotos.');
    } finally { setRunning(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageDown className="h-5 w-5" /> Otimizar fotos antigas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Reduz o tamanho das fotos antigas como as novas. Nenhuma foto é apagada. Mantenha esta página aberta até terminar.
        </p>
        {total > 0 && (
          <div className="space-y-1">
            <Progress value={(done / total) * 100} />
            <p className="text-xs text-muted-foreground">
              {done} de {total} · {(saved / 1e9).toFixed(2)} GB libertados
            </p>
          </div>
        )}
        {running ? (
          <Button variant="outline" onClick={() => (stop.current = true)}>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parar
          </Button>
        ) : (
          <Button onClick={run}>Otimizar agora</Button>
        )}
      </CardContent>
    </Card>
  );
}
