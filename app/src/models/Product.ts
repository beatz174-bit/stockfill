export interface Product {
  id: string;
  name: string;
  category: string;
  unit_type: string;
  bulk_name?: string;
  units_per_bulk?: number;
  barcode?: string;
  archived: boolean;
  created_at: number;
  updated_at: number;
}
