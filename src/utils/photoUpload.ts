import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a base64 image to the 'service-photos' Storage bucket
 * and inserts a record in service_photos with the public URL.
 *
 * Returns the public URL (~100 bytes) instead of the raw base64 (~4-5MB).
 */
export async function uploadServicePhoto(
  serviceId: string,
  imageData: string,
  photoType: string,
  description: string
): Promise<string> {
  // 1. Convert base64 to Blob
  const response = await fetch(imageData);
  const blob = await response.blob();

  // 2. Upload to Storage
  const fileName = `${serviceId}/${photoType}_${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('service-photos')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // 3. Get public URL
  const { data: urlData } = supabase.storage
    .from('service-photos')
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  // 4. Insert record in service_photos with URL (not base64)
  const { error: dbError } = await supabase.from('service_photos').insert({
    service_id: serviceId,
    photo_type: photoType,
    file_url: publicUrl,
    description,
  });

  if (dbError) throw dbError;

  return publicUrl;
}
