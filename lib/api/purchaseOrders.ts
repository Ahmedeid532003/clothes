import { apiFetch } from './client';

export type PurchaseOrderLineDto = {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_description: string;
  brand_name: string;
  quantity_ordered: string;
  quantity_received: string;
  quantity_pending: string;
  unit_price: string;
  notes: string;
  is_fully_received: boolean;
};

export type PurchaseOrderDto = {
  id: string;
  code: string;
  supplier_id: string;
  supplier_name: string;
  supplier_whatsapp: string;
  season_id: string;
  season_name: string;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  status_label: string;
  notes: string;
  whatsapp_sent_at: string | null;
  whatsapp_url: string | null;
  created_at: string;
  updated_at: string;
  lines: PurchaseOrderLineDto[];
  totals: {
    quantity_ordered: string;
    quantity_received: string;
    line_count: number;
  };
};

export async function fetchPurchaseOrders(filters?: {
  status?: string;
  supplier?: string;
}): Promise<PurchaseOrderDto[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.supplier) params.set('supplier', filters.supplier);
  const q = params.toString();
  return apiFetch<PurchaseOrderDto[]>(`/purchases/orders/${q ? `?${q}` : ''}`);
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrderDto> {
  return apiFetch<PurchaseOrderDto>(`/purchases/orders/${id}/`);
}

export async function createOrdersFromReorder(
  lines: Array<{ product_id: string; quantity_ordered?: string | null }>,
): Promise<{ orders: PurchaseOrderDto[]; count: number }> {
  return apiFetch('/purchases/orders/from-reorder/', {
    method: 'POST',
    body: JSON.stringify({ lines }),
  });
}

export async function receivePurchaseOrderLines(
  orderId: string,
  lines: Array<{ line_id: string; quantity_received: string }>,
): Promise<PurchaseOrderDto> {
  return apiFetch(`/purchases/orders/${orderId}/receive/`, {
    method: 'POST',
    body: JSON.stringify({ lines }),
  });
}
