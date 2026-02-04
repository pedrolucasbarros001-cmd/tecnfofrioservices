/**
 * Opens a pathname in a new tab while preserving the current query string.
 * This is important for the Lovable preview which uses __lovable_token in the URL.
 * 
 * @param pathname - The path to open (e.g., '/print/service/123')
 */
export function openInNewTabPreservingQuery(pathname: string): void {
  const url = new URL(pathname, window.location.origin);
  
  // Preserve existing query params (especially __lovable_token for preview)
  const currentParams = new URLSearchParams(window.location.search);
  currentParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  
  window.open(url.toString(), '_blank');
}
