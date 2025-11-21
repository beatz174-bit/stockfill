export type PickItemStatus = 'pending' | 'picked' | 'skipped';

export interface PickItem {
  id: string;
  pick_list_id: string;
  product_id: string;
  quantity_units: number;
  quantity_bulk: number;
  status: PickItemStatus;
  created_at: number;
  updated_at: number;
}
