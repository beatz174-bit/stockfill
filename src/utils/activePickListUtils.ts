import { Product } from '../models/Product';

export const normalizeName = (name: string): string => name.trim().toLowerCase();

export const dedupeByIdThenNameAndSort = (products: Product[]): Product[] => {
  const dedupedById = new Map<string, Product>();

  products.forEach((product) => {
    const existing = dedupedById.get(product.id);
    if (!existing || product.updated_at > existing.updated_at) {
      dedupedById.set(product.id, product);
    }
  });

  const dedupedByName = new Map<string, Product>();

  dedupedById.forEach((product) => {
    const normalizedName = normalizeName(product.name);
    const existing = dedupedByName.get(normalizedName);

    if (!existing || product.updated_at > existing.updated_at) {
      dedupedByName.set(normalizedName, product);
    }
  });

  return Array.from(dedupedByName.values()).sort((a, b) => {
    const normalizedNameA = normalizeName(a.name);
    const normalizedNameB = normalizeName(b.name);

    const nameComparison = normalizedNameA.localeCompare(normalizedNameB, undefined, {
      sensitivity: 'base',
    });

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
};
