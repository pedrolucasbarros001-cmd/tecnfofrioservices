export function buildFullAddress(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): string | null {
  const { address, postalCode, city } = parts;
  if (!address) return null;
  const segments = [address];
  if (postalCode) segments.push(postalCode);
  if (city) segments.push(city);
  segments.push('Portugal');
  return segments.join(', ');
}
