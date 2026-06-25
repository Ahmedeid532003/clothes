import { apiFetch } from './client';
import type { ProductDto } from './inventory';

export type PurchaseLineDto = {
  id: string;
  variant: string;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  quantity: string;
  unit_cost: string;
  discount_percent: string;
  tax_percent: string;
  line_total: string;
};

export type PurchaseInvoiceDto = {
  id: string;
  code: string;
  invoice_type: 'purchase' | 'return';
  supplier: string;
  supplier_name: string;
  season: string;
  season_name: string;
  brand: string | null;
  brand_name?: string;
  warehouse: string;
  warehouse_name: string;
  branch: string | null;
  branch_name?: string;
  status: 'draft' | 'received' | 'cancelled';
  invoice_date: string;
  notes: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  payment_method: 'cash' | 'credit';
  return_reason?: string;
  return_reason_label?: string;
  source_invoice?: string | null;
  source_invoice_code?: string | null;
  lines: PurchaseLineDto[];
  created_by_name?: string;
  received_at: string | null;
  created_at: string;
};

const invoiceBase = (type: 'purchase' | 'return') =>
  type === 'return' ? '/purchases/returns/' : '/purchases/invoices/';

export async function fetchPurchaseInvoices(
  type: 'purchase' | 'return' = 'purchase',
): Promise<PurchaseInvoiceDto[]> {
  return apiFetch<PurchaseInvoiceDto[]>(invoiceBase(type));
}

export async function fetchPurchaseInvoice(id: string): Promise<PurchaseInvoiceDto> {
  return apiFetch<PurchaseInvoiceDto>(`/purchases/invoices/${id}/`);
}

export async function createPurchaseInvoice(
  type: 'purchase' | 'return',
  payload: Record<string, unknown>,
): Promise<PurchaseInvoiceDto> {
  return apiFetch<PurchaseInvoiceDto>(invoiceBase(type), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePurchaseInvoice(
  id: string,
  payload: Record<string, unknown>,
): Promise<PurchaseInvoiceDto> {
  return apiFetch<PurchaseInvoiceDto>(`/purchases/invoices/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePurchaseInvoice(id: string): Promise<void> {
  await apiFetch<void>(`/purchases/invoices/${id}/`, { method: 'DELETE' });
}

export async function receivePurchaseInvoice(id: string): Promise<PurchaseInvoiceDto> {
  return apiFetch<PurchaseInvoiceDto>(`/purchases/invoices/${id}/receive/`, {
    method: 'POST',
  });
}

export async function cancelPurchaseInvoice(id: string): Promise<PurchaseInvoiceDto> {
  return apiFetch<PurchaseInvoiceDto>(`/purchases/invoices/${id}/cancel/`, {
    method: 'POST',
  });
}

export type PurchaseProductSearchRow = ProductDto & {
  matches_supplier?: boolean;
  matches_season?: boolean;
  matches_invoice?: boolean;
  purchase_count?: number;
  total_stock_qty?: string;
};

export async function fetchPurchaseProducts(params: {
  supplier?: string;
  season?: string;
  brand?: string;
  section?: string;
  classification?: string;
  warehouse?: string;
  q?: string;
  compare?: boolean;
}): Promise<PurchaseProductSearchRow[]> {
  const q = new URLSearchParams();
  if (params.supplier) q.set('supplier', params.supplier);
  if (params.season) q.set('season', params.season);
  if (params.brand) q.set('brand', params.brand);
  if (params.section) q.set('section', params.section);
  if (params.classification) q.set('classification', params.classification);
  if (params.warehouse) q.set('warehouse', params.warehouse);
  if (params.q) q.set('q', params.q);
  if (params.compare) q.set('compare', '1');
  const qs = q.toString();
  return apiFetch<PurchaseProductSearchRow[]>(
    qs ? `/purchases/products/?${qs}` : '/purchases/products/',
  );
}

export async function quickCreatePurchaseProduct(
  payload: Record<string, unknown>,
): Promise<ProductDto> {
  return apiFetch<ProductDto>('/purchases/products/quick-create/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
