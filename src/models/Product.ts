export interface Product {
  id: string;
  name: string;
  category: string;
  unit_type: string;
  bulk_name?: string;
  barcode?: string;
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export const DEFAULT_UNIT_TYPE = 'unit';
export const DEFAULT_BULK_NAME = 'carton';
