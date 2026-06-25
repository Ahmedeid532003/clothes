import { apiFetch } from './client';

export type ScanOrderLineDto = {
  id: string;
  variant_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  barcode: string;
  quantity: string;
  unit_sale_price: string;
  line_total: string;
  supplier_id: string;
  supplier_name: string;
};

export type ScanOrderDto = {
  id: string;
  code: string;
  order_type: 'sale' | 'transfer' | 'stock_count' | 'purchase_return';
  order_type_label: string;
  status: string;
  status_label: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  branch_id: string;
  branch_name: string;
  warehouse_id: string;
  warehouse_name: string;
  supplier_id: string;
  supplier_name: string;
  line_count: number;
  total_quantity: string;
  total_sale_amount: string;
  notes: string;
  printed_at: string;
  loaded_into: string;
  created_at: string;
  lines?: ScanOrderLineDto[];
};

export type EmployeeLookupDto = {
  id: string;
  employee_code: string;
  full_name: string;
};

export const scanOrdersApi = {
  list: (params?: { order_type?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.order_type) sp.set('order_type', params.order_type);
    if (params?.status) sp.set('status', params.status);
    const q = sp.toString();
    return apiFetch<ScanOrderDto[]>(`/inventory/scan-orders/${q ? `?${q}` : ''}`);
  },
  get: (id: string) => apiFetch<ScanOrderDto>(`/inventory/scan-orders/${id}/`),
  lookup: (code: string) =>
    apiFetch<ScanOrderDto>(`/inventory/scan-orders/lookup/?code=${encodeURIComponent(code)}`),
  lookupEmployee: (code: string) =>
    apiFetch<EmployeeLookupDto>(
      `/inventory/scan-orders/employee/?code=${encodeURIComponent(code)}`,
    ),
  create: (payload: {
    order_type: string;
    employee_code: string;
    supplier?: string;
    warehouse?: string;
    notes?: string;
  }) =>
    apiFetch<ScanOrderDto>('/inventory/scan-orders/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  scan: (id: string, barcode: string, quantity?: string) =>
    apiFetch<ScanOrderDto>(`/inventory/scan-orders/${id}/scan/`, {
      method: 'POST',
      body: JSON.stringify({ barcode, quantity }),
    }),
  updateLine: (id: string, lineId: string, quantity: string) =>
    apiFetch<ScanOrderDto>(`/inventory/scan-orders/${id}/line/`, {
      method: 'POST',
      body: JSON.stringify({ line_id: lineId, quantity }),
    }),
  save: (id: string) =>
    apiFetch<ScanOrderDto>(`/inventory/scan-orders/${id}/save/`, { method: 'POST', body: '{}' }),
  markPrinted: (id: string) =>
    apiFetch<ScanOrderDto>(`/inventory/scan-orders/${id}/print/`, { method: 'POST', body: '{}' }),
  markLoaded: (id: string, target: string) =>
    apiFetch<ScanOrderDto>(`/inventory/scan-orders/${id}/load/`, {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),
};
