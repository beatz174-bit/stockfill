import { Product } from '../models/Product';

export interface ProductFormState {
  name: string;
  category: string;
  barcode: string;
}

export const getInitialFormState = (
  product: Product,
  categoriesById: Map<string, string>,
): ProductFormState => ({
  name: product.name,
  category: categoriesById.get(product.category) ?? product.category ?? '',
  barcode: product.barcode ?? '',
});
