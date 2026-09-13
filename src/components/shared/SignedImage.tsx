import { ImgHTMLAttributes } from 'react';
import { useSignedUrl } from '@/utils/storageUrl';
import { cn } from '@/lib/utils';

interface SignedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  /** Bucket a usar quando o valor guardado é apenas um caminho */
  bucket?: string;
}

/**
 * Imagem que resolve automaticamente ficheiros privados do Storage
 * para um link temporário assinado. Valores em base64 passam inalterados.
 */
export function SignedImage({ src, bucket, className, alt = '', ...props }: SignedImageProps) {
  const resolved = useSignedUrl(src, bucket);

  if (!resolved) {
    return <div className={cn('bg-muted animate-pulse', className)} aria-hidden="true" />;
  }

  return <img src={resolved} alt={alt} className={className} {...props} />;
}

export default SignedImage;
