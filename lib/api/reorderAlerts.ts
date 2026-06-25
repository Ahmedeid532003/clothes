import { apiFetch } from './client';

export type ReorderBranchStock = {
  branch_id: string;
  branch_name: string;
  quantity: string;
};

export type ReorderAlertItem = {
  product_id: string;
  supplier_id: string;
  supplier_name: string;
  product_code: string;
  product_name: string;
  product_description: string;
  brand_name: string;
  season_id: string;
  season_name: string;
  purchased_qty: string;
  sold_qty: string;
  remaining_qty: string;
  reorder_percent: string;
  threshold_qty: string;
  purchase_count: number;
  branch_stocks: ReorderBranchStock[];
  suggested_order_qty: string;
};

export type ReorderAlertsResponse = {
  season_id: string;
  season_name: string;
  branches: Array<{ branch_id: string; branch_name: string }>;
  items: ReorderAlertItem[];
  total: number;
  warning?: string;
};

export async function fetchReorderAlerts(): Promise<ReorderAlertsResponse> {
  return apiFetch<ReorderAlertsResponse>('/inventory/reorder-alerts/');
}
