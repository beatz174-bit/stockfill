import { randomUUID } from 'crypto';
import { describe, expect, it } from 'vitest';
import { seedAreas, seedCategories, seedDatabase, seedProducts } from './seed';
import { Area } from '../models/Area';
import { Category } from '../models/Category';
import { DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE, Product } from '../models/Product';
import { StockFillDB } from './index';

const normalizeName = (name: string) => name.trim().toLowerCase();

class MockTable<T extends { id: string; name: string }> {
  constructor(public items: T[] = []) {}

  async count() {
    return this.items.length;
  }

  async bulkAdd(records: T[]) {
    this.items.push(...records);
  }

  async bulkDelete(ids: string[]) {
    this.items = this.items.filter((item) => !ids.includes(item.id));
  }

  async toArray() {
    return [...this.items];
  }
}

const buildArea = (overrides: Partial<Area> = {}): Area => ({
  id: overrides.id ?? randomUUID(),
  name: overrides.name ?? 'Area',
  created_at: overrides.created_at ?? Date.now(),
  updated_at: overrides.updated_at ?? Date.now(),
});

const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: overrides.id ?? randomUUID(),
  name: overrides.name ?? 'Product',
  category: overrides.category ?? 'Category',
  unit_type: overrides.unit_type ?? DEFAULT_UNIT_TYPE,
  bulk_name: overrides.bulk_name ?? DEFAULT_BULK_NAME,
  barcode: overrides.barcode,
  archived: overrides.archived ?? false,
  created_at: overrides.created_at ?? Date.now(),
  updated_at: overrides.updated_at ?? Date.now(),
});

const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: overrides.id ?? randomUUID(),
  name: overrides.name ?? 'Category',
  created_at: overrides.created_at ?? Date.now(),
  updated_at: overrides.updated_at ?? Date.now(),
});

const createMockDb = (options: {
  areas?: Area[];
  products?: Product[];
  categories?: Category[];
} = {}) => {
  const db = {
    areas: new MockTable<Area>(options.areas ?? []),
    products: new MockTable<Product>(options.products ?? []),
    categories: new MockTable<Category>(options.categories ?? []),
    pickLists: new MockTable<any>(),
    pickItems: new MockTable<any>(),
  } as unknown as StockFillDB;

  return db;
};

describe('seedDatabase', () => {
  it('deduplicates seeded areas, categories, and products', async () => {
    const duplicateSeedArea = buildArea({ name: seedAreas[0] });
    const trailingSpaceArea = buildArea({ name: `${seedAreas[0]} ` });
    const customArea = buildArea({ name: 'Produce' });

    const duplicateProduct = buildProduct({ name: seedProducts[0].name, category: seedProducts[0].category });
    const duplicateProductWithWhitespace = buildProduct({ name: `${seedProducts[0].name} `, category: seedProducts[0].category });
    const customProduct = buildProduct({ name: 'Custom Item', category: 'Specials' });

    const duplicateCategory = buildCategory({ name: seedCategories[0] });
    const trailingSpaceCategory = buildCategory({ name: `${seedCategories[0]} ` });

    const db = createMockDb({
      areas: [duplicateSeedArea, trailingSpaceArea, customArea],
      products: [duplicateProduct, duplicateProductWithWhitespace, customProduct],
      categories: [duplicateCategory, trailingSpaceCategory],
    });

    await seedDatabase(db);

    const areas = await db.areas.toArray();
    const areaNames = areas.map((area) => normalizeName(area.name));
    const seededAreaNames = new Set(seedAreas.map(normalizeName));

    expect(areaNames.filter((name) => name === normalizeName(seedAreas[0]))).toHaveLength(1);
    expect(new Set(areaNames.filter((name) => seededAreaNames.has(name)))).toEqual(seededAreaNames);
    expect(areaNames).toContain(normalizeName(customArea.name));

    const products = await db.products.toArray();
    const seededProductNames = new Set(seedProducts.map((product) => normalizeName(product.name)));
    const productNamesInDb = products.map((product) => normalizeName(product.name));

    expect(productNamesInDb.filter((name) => name === normalizeName(seedProducts[0].name))).toHaveLength(1);
    expect(new Set(productNamesInDb.filter((name) => seededProductNames.has(name)))).toEqual(
      seededProductNames,
    );
    expect(productNamesInDb).toContain(normalizeName(customProduct.name));

    const categories = await db.categories.toArray();
    const seededCategoryNames = new Set(seedCategories.map(normalizeName));
    const categoryNamesInDb = categories.map((category) => normalizeName(category.name));

    expect(categoryNamesInDb.filter((name) => name === normalizeName(seedCategories[0]))).toHaveLength(1);
    expect(new Set(categoryNamesInDb.filter((name) => seededCategoryNames.has(name)))).toEqual(
      seededCategoryNames,
    );
  });
});
