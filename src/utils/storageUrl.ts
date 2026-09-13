import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_TTL = 60 * 60; // 1 hora

const KNOWN_BUCKETS = ['service-photos', 'service_documents'];

export interface StorageRef {
  bucket: string;
  path: string;
}

/**
 * Converte um valor guardado em `file_url` numa referência de Storage.
 * Aceita URLs públicas antigas (…/object/public/<bucket>/<path>) e caminhos simples.
 * Devolve null para data URLs (assinaturas base64) ou URLs externas.
 */
export function parseStorageRef(value: string | null | undefined, fallbackBucket?: string): StorageRef | null {
  if (!value) return null;
  if (value.startsWith('data:')) return null;

  const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  }

  if (value.startsWith('http')) return null;

  const bucketPrefix = KNOWN_BUCKETS.find((b) => value.startsWith(`${b}/`));
  if (bucketPrefix) {
    return { bucket: bucketPrefix, path: value.slice(bucketPrefix.length + 1) };
  }

  if (fallbackBucket) {
    return { bucket: fallbackBucket, path: value };
  }

  return null;
}

/**
 * Devolve um URL assinado temporário para ficheiros privados.
 * Se o valor não for um ficheiro de Storage (ex.: assinatura em base64), devolve-o inalterado.
 */
export async function getSignedFileUrl(
  value: string | null | undefined,
  fallbackBucket?: string
): Promise<string> {
  if (!value) return '';
  const ref = parseStorageRef(value, fallbackBucket);
  if (!ref) return value;

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    console.error('Erro ao gerar link seguro do ficheiro:', error);
    return '';
  }

  return data.signedUrl;
}

/**
 * Abre um ficheiro privado do Storage num separador novo, através de um link temporário.
 */
export async function openStorageFile(
  value: string | null | undefined,
  fallbackBucket?: string
): Promise<void> {
  const url = await getSignedFileUrl(value, fallbackBucket);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Hook para obter o URL assinado de um ficheiro privado.
 */
export function useSignedUrl(value: string | null | undefined, fallbackBucket?: string): string {
  const [url, setUrl] = useState<string>(() => (value && value.startsWith('data:') ? value : ''));

  useEffect(() => {
    let active = true;

    if (!value) {
      setUrl('');
      return;
    }

    if (value.startsWith('data:')) {
      setUrl(value);
      return;
    }

    getSignedFileUrl(value, fallbackBucket).then((signed) => {
      if (active) setUrl(signed);
    });

    return () => {
      active = false;
    };
  }, [value, fallbackBucket]);

  return url;
}
