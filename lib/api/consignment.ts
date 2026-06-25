import { apiFetch } from './client';

export type ConsignmentMovementType = 'send' | 'return' | 'transfer' | 'count' | 'settlement';

export type ConsignmentMovement = {
  id: string;
  code: string;
  movement_type: ConsignmentMovementType;
  movement_date: string;
  customer: string;
  customer_code: string;
  customer_name: string;
  counterparty_customer: string | null;
  counterparty_name: string | null;
  warehouse: string;
  warehouse_name: string;
  status: string;
  total_qty: string;
  total_value: string;
  lines?: ConsignmentLine[];
};

export type ConsignmentLine = {
  id: string;
  variant: string;
  product_code: string;
  product_name: string;
  size: string;
  color: string;
  quantity: string;
  unit_price: string;
  batch_lot: string;
  barcode: string;
};

export type ConsignmentDashboard = {
  kpis: {
    total_consignment_value: string;
    total_sold_qty: string;
    total_sent_qty: string;
    turnover_percent: string;
    surplus_deficit_qty: string;
    active_shops: number;
  };
  top_sales_shops: { customer_name: string; qty_sold: string; qty_on_hand_value: string }[];
  top_debt_customers: { customer_name: string; balance_due: string }[];
  stagnant_items: { customer_name: string; product: string; qty_on_hand: string; days_idle: number }[];
  size_breakdown: { size: string; qty: string }[];
  color_breakdown: { color: string; qty: string }[];
  alerts: { level: string; message_ar: string }[];
};

export const consignmentApi = {
  dashboard: () => apiFetch<ConsignmentDashboard>('/inventory/consignment/dashboard/'),
  movements: (params?: { type?: string; customer?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set('type', params.type);
    if (params?.customer) sp.set('customer', params.customer);
    if (params?.status) sp.set('status', params.status);
    const q = sp.toString();
    return apiFetch<ConsignmentMovement[]>(
      `/inventory/consignment/movements/${q ? `?${q}` : ''}`,
    );
  },
  getMovement: (id: string) =>
    apiFetch<ConsignmentMovement>(`/inventory/consignment/movements/${id}/`),
  createMovement: (payload: Record<string, unknown>) =>
    apiFetch<ConsignmentMovement>('/inventory/consignment/movements/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approve: (id: string) =>
    apiFetch<ConsignmentMovement>(`/inventory/consignment/movements/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  cancel: (id: string) =>
    apiFetch<ConsignmentMovement>(`/inventory/consignment/movements/${id}/cancel/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  customerBalance: (customerId: string) =>
    apiFetch<{
      formula: string;
      totals: { qty_sent: string; qty_on_hand: string; qty_sold: string };
      lines: Record<string, string>[];
    }>(`/inventory/consignment/customers/${customerId}/balance/`),
  realtimeSales: (customerId: string) =>
    apiFetch<{ actual_sales_qty: string; updated_at: string; lines: Record<string, string>[] }>(
      `/inventory/consignment/customers/${customerId}/realtime-sales/`,
    ),
  reports: () =>
    apiFetch<{
      formula: string;
      customers: {
        customer_code: string;
        customer_name: string;
        qty_sent: string;
        qty_on_hand: string;
        qty_sold: string;
        actual_sales_qty: string;
        balance_due: string;
      }[];
    }>('/inventory/consignment/reports/'),

  countSheet: (customerId: string, warehouseId?: string) => {
    const sp = warehouseId ? `?warehouse=${warehouseId}` : '';
    return apiFetch<ConsignmentCountSheet>(`/inventory/consignment/customers/${customerId}/count-sheet/${sp}`);
  },

  previewCountResult: (customerId: string, lines: { variant_id: string; counted_qty: string }[]) =>
    apiFetch<ConsignmentCountResult>(`/inventory/consignment/customers/${customerId}/count-sheet/`, {
      method: 'POST',
      body: JSON.stringify({ lines }),
    }),
};

export type ConsignmentCountLine = {
  variant_id: string;
  product_code: string;
  product_name: string;
  size: string;
  color: string;
  barcode: string;
  brand_name?: string;
  section_name?: string;
  supplier_name?: string;
  warehouse_id: string;
  warehouse: string;
  qty_sent: string;
  qty_on_hand: string;
  qty_returned: string;
  qty_sold: string;
  unit_price: string;
  value_on_hand: string;
  value_sold: string;
  counted_qty: string;
};

export type ConsignmentCountSheet = {
  customer_id: string;
  customer_code: string;
  customer_name: string;
  formula: string;
  totals: {
    qty_sent: string;
    qty_on_hand: string;
    qty_sold: string;
    value_on_hand: string;
    value_sold: string;
    balance_due: string;
  };
  lines: ConsignmentCountLine[];
};

export type ConsignmentCountResult = ConsignmentCountSheet & {
  lines: (ConsignmentCountLine & {
    system_qty: string;
    variance_qty: string;
    qty_sold_after_count: string;
    value_sold_after_count: string;
  })[];
};
