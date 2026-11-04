// Read-only API calls made on the server for page titles and the sitemap. Pages still load their
// data in the browser; a failed call here only means a generic title, never a broken page.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// The free API host can take about a minute to wake, so give up early rather than hold the page
const TIMEOUT_MS = 4000;

export type ProductMeta = { _id: string; name: string; description?: string; updatedAt?: string; categoryId?: { name?: string } };

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export function fetchProductMeta(id: string): Promise<ProductMeta | null> {
  return getJson<ProductMeta>(`/products/${encodeURIComponent(id)}`);
}

export async function fetchProductIds(): Promise<ProductMeta[]> {
  const page = await getJson<{ products?: ProductMeta[] }>('/products?limit=100');
  return page?.products ?? [];
}
