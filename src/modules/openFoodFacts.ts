export interface ExternalProductInfo {
  name: string | null;
  brand?: string | null;
  quantity?: string | null;
  image?: string | null;
  source: 'openfoodfacts';
}

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const REQUEST_TIMEOUT_MS = 5000;

const isOffline = () => typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine;

export const fetchProductFromOFF = async (barcode: string): Promise<ExternalProductInfo | null> => {
  if (!barcode || isOffline()) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/${barcode}.json`, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string | null;
        brands?: string | null;
        quantity?: string | null;
        image_url?: string | null;
      };
    };

    if (data?.status !== 1 || !data.product || !data.product.product_name) {
      return null;
    }

    return {
      name: data.product.product_name ?? null,
      brand: data.product.brands ?? null,
      quantity: data.product.quantity ?? null,
      image: data.product.image_url ?? null,
      source: 'openfoodfacts',
    } satisfies ExternalProductInfo;
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

