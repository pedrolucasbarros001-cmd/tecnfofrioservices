/**
 * Compresses a photo (data URL) before upload:
 *  - resizes so the longest edge is at most `maxDimension`
 *  - re-encodes as JPEG at `quality`
 *
 * Reduces typical phone photos (3-5MB) by ~80-90% with no visible
 * loss for diagnostic purposes. Falls back to the original data URL
 * if anything fails (never blocks the upload).
 */
export async function compressImage(
  dataUrl: string,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  const { maxDimension = 1600, quality = 0.75 } = options;

  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });

    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return dataUrl;

    const scale = Math.min(1, maxDimension / Math.max(w, h));
    // Skip re-encode when already small and already JPEG
    if (scale >= 1 && dataUrl.startsWith('data:image/jpeg')) return dataUrl;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.fillStyle = '#ffffff'; // JPEG has no alpha — white background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.warn('compressImage falhou, a usar original', err);
    return dataUrl;
  }
}

export function compressImages(
  dataUrls: string[],
  options?: { maxDimension?: number; quality?: number }
): Promise<string[]> {
  return Promise.all(dataUrls.map((d) => compressImage(d, options)));
}
