// Open Food Facts photos are fetched with CORS so the service worker can keep them for offline use
export function imageCrossOrigin(url: string | null | undefined): "anonymous" | undefined {
  return url?.startsWith("https://images.openfoodfacts.org/") ? "anonymous" : undefined;
}
