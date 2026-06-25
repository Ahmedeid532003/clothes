import { apiFetch } from './client';

export type MovementBranchCol = {
  branch_id: string;
  branch_name: string;
  warehouse_id?: string;
};

export type MovementRow = {
  product_id: string;
  season_id: string;
  season_name: string;
  supplier_id: string;
  supplier_name: string;
  supplier_whatsapp: string;
  product_code: string;
  product_name: string;
  product_description: string;
  brand_name: string;
  section_name: string;
  classification_name: string;
  purchase_price: string;
  sale_price: string;
  wholesale_price: string;
  purchased_qty: string;
  purchased_value: string;
  return_qty: string;
  return_value: string;
  sold_qty: string;
  sold_value: string;
  purchase_count: number;
  branch_stocks: Array<{ branch_id: string; branch_name: string; quantity: string }>;
  balance_qty: string;
  balance_value: string;
  valuation_unit_price: string;
};

export type MovementTotals = {
  purchased_qty: string;
  purchased_value: string;
  return_qty: string;
  return_value: string;
  sold_qty: string;
  sold_value: string;
  balance_qty: string;
  balance_value: string;
  branch_qty: Record<string, string>;
};

export type GeneralItemMovementReport = {
  branches: MovementBranchCol[];
  rows: MovementRow[];
  totals: MovementTotals;
  filters: Record<string, string>;
  whatsapp_url: string | null;
  supplier_whatsapp: string;
  supplier_name: string;
  period_label: string;
};

export type MovementQuery = {
  branch?: string;
  supplier?: string;
  brand?: string;
  section?: string;
  classification?: string;
  season?: string;
  product?: string;
  product_q?: string;
  date_from?: string;
  date_to?: string;
  valuation?: 'purchase' | 'sale' | 'wholesale';
};

export async function fetchGeneralItemMovementReport(
  params: MovementQuery,
): Promise<GeneralItemMovementReport> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) q.set(k, String(v));
  });
  const qs = q.toString();
  const path = qs
    ? `/inventory/reports/general-item-movement/?${qs}`
    : '/inventory/reports/general-item-movement/';
  return apiFetch<GeneralItemMovementReport>(path);
}
