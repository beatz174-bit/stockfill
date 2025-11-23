export interface PickList {
  id: string;
  area_id: string;
  created_at: number;
  completed_at?: number;
  notes?: string;
  categories: string[];
  auto_add_new_products: boolean;
}
