import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchProductFromOFF } from './openFoodFacts';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchProductFromOFF', () => {
  const endpoint = 'https://world.openfoodfacts.org/api/v2/product/123456.json';

  it('returns parsed product data when available', async () => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json({
          status: 1,
          product: {
            product_name: 'Sparkling Water',
            brands: 'Acme',
            quantity: '500ml',
            image_url: 'https://example.com/water.png',
          },
        }),
      ),
    );

    const result = await fetchProductFromOFF('123456');

    expect(result).toEqual({
      name: 'Sparkling Water',
      brand: 'Acme',
      quantity: '500ml',
      image: 'https://example.com/water.png',
      source: 'openfoodfacts',
    });
  });

  it('coerces missing optional fields to null', async () => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json({
          status: 1,
          product: {
            product_name: 'Chocolate Bar',
          },
        }),
      ),
    );

    const result = await fetchProductFromOFF('123456');

    expect(result).toEqual({
      name: 'Chocolate Bar',
      brand: null,
      quantity: null,
      image: null,
      source: 'openfoodfacts',
    });
  });

  it('returns null when the product is not found', async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ status: 0 })));

    const result = await fetchProductFromOFF('123456');

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    server.use(http.get(endpoint, () => HttpResponse.error()));

    const result = await fetchProductFromOFF('123456');

    expect(result).toBeNull();
  });

  it('returns null immediately when the barcode is empty', async () => {
    const result = await fetchProductFromOFF('');

    expect(result).toBeNull();
  });

  it('returns null when the browser is offline', async () => {
    const originalNavigator = navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });

    const result = await fetchProductFromOFF('123456');

    expect(result).toBeNull();

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });
});

