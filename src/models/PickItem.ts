export type PickItemStatus = 'pending' | 'picked' | 'skipped';

export interface PickItem {
  id: string;
  pick_list_id: string;
  product_id: string;
  quantity: number;
  is_carton: boolean;
  status: PickItemStatus;
  created_at: number;
  updated_at: number;
}
