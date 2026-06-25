import { apiFetch } from './client';

export type SellerPerformanceRow = {
  seller_id: string;
  employee_code: string;
  full_name: string;
  invoice_count: number;
  line_count: number;
  qty_total: string;
  sales_total: string;
  commission_total: string;
};

export async function fetchSellerPerformance(params?: {
  from?: string;
  to?: string;
  branchOnly?: boolean;
}): Promise<SellerPerformanceRow[]> {
  const sp = new URLSearchParams();
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.branchOnly) sp.set('branch_only', '1');
  const q = sp.toString();
  return apiFetch<SellerPerformanceRow[]>(`/sales/seller-performance/${q ? `?${q}` : ''}`);
}
