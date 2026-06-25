import { apiFetch } from './client';

export type PosContext = {
  branch: { id: string; code: string; name_ar: string; name_en: string };
  warehouse: { id: string; code: string; name_ar: string };
  is_pos: boolean;
  message_ar: string;
  message_en: string;
};

export type PosVariantHit = {
  variant_id: string;
  size_name: string;
  color_name: string;
  barcode: string;
  quantity_available: string;
  branch_quantity_available?: string;
  unit_price: string;
  sale_price?: string;
  offer_price?: string | null;
  offer_discount_per_unit?: string;
  discount_percent?: string;
};

export type PosProductHit = {
  id: string;
  code: string;
  name_ar: string;
  barcode: string;
  sale_price: string;
  season?: string;
  season_name?: string;
  is_current_season?: boolean;
  variants: PosVariantHit[];
};

export type PosCompositeComponent = {
  variant_id: string;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  quantity_per_set: string;
  quantity_available: string;
};

export type PosCompositeHit = {
  id: string;
  code: string;
  name_ar: string;
  barcode: string;
  sale_price: string;
  offer_price: string | null;
  unit_price: string;
  max_sets_available: string;
  components: PosCompositeComponent[];
};

export type PosSearchResult = {
  products: PosProductHit[];
  composites: PosCompositeHit[];
};

export type PosCartLine = {
  key: string;
  kind: 'variant' | 'composite';
  variant?: string;
  composite?: string;
  label: string;
  product_code?: string;
  product_name?: string;
  size_name?: string;
  color_name?: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  discount_amount?: string;
  offer_discount_per_unit?: string;
  available: string;
  seller_id?: string;
  seller_name?: string;
};

export type PosExchangeResult = {
  return_codes: string[];
  sale_code: string | null;
  return_total: string;
  new_total: string;
  difference: string;
  settlement_ar: string;
  settlement_en: string;
  original_payment_method: string;
  customer_id: string | null;
};

export type SaleDto = {
  id: string;
  code: string;
  branch: string;
  branch_name: string;
  customer?: string;
  customer_name?: string;
  customer_phone?: string;
  total: string;
  payment_method: string;
  subtotal?: string;
  discount_amount?: string;
  is_delivery?: boolean;
  delivery_fee?: string;
  delivery_fee_effective?: string;
  delivery_agent?: string | null;
  delivery_agent_name?: string;
  delivery_status?: string;
  notes?: string;
  lines: Array<{
    id?: string;
    product_name: string;
    product_code?: string;
    size_name: string;
    color_name: string;
    quantity: string;
    unit_price?: string;
    line_total: string;
    seller_name?: string;
  }>;
  installment_receipt?: import('./receivables').InstallmentReceipt;
  created_at: string;
};

export type DeliveryOrderDto = SaleDto;

export type DeliveryOrdersResponse = {
  count: number;
  total_delivery_fees: string;
  orders: DeliveryOrderDto[];
};

export async function fetchPosContext(): Promise<PosContext> {
  return apiFetch<PosContext>('/pos/context/');
}

export async function searchPosProducts(params: {
  q?: string;
  barcode?: string;
  inStock?: boolean;
}): Promise<PosSearchResult> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.barcode) sp.set('barcode', params.barcode);
  if (params.inStock) sp.set('in_stock', '1');
  const qs = sp.toString();
  return apiFetch<PosSearchResult>(qs ? `/pos/products/?${qs}` : '/pos/products/');
}

export async function createPosSale(payload: Record<string, unknown>): Promise<SaleDto> {
  return apiFetch<SaleDto>('/pos/sales/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPosSales(code?: string): Promise<SaleDto[]> {
  const qs = code ? `?code=${encodeURIComponent(code)}` : '';
  return apiFetch<SaleDto[]>(`/pos/sales/${qs}`);
}

export async function createPosExchange(payload: Record<string, unknown>): Promise<PosExchangeResult> {
  return apiFetch<PosExchangeResult>('/pos/exchanges/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type PosCustomerReviewRow = {
  id: string;
  code: string;
  name_ar: string;
  phone: string;
  whatsapp: string;
  notes: string;
  balance_due: string;
  customer_group: string;
  customer_group_name: string;
  customer_group_color?: string;
  customer_type_slug: string;
  profile_data: Record<string, string | number | boolean>;
  tier: 'normal' | 'excellent' | 'black' | 'lawyer';
  tier_label: string;
  tier_color: string;
  tier_source: 'auto' | 'manual' | 'group';
  spouse_name: string;
  guarantor_summary: string;
  guarantor_name: string;
  compliance_percent?: string;
  max_days_overdue?: number;
  overdue_total?: string;
  late_installment_count?: number;
  workflow_status: string;
  form_schema: import('./customers').CustomerDto['form_schema'];
  workflow_steps: import('./customers').CustomerDto['workflow_steps'];
  mandatory_fields: string[];
};

export async function fetchPosCustomerReview(search?: string): Promise<PosCustomerReviewRow[]> {
  const base = '/pos/customers/review/';
  return apiFetch<PosCustomerReviewRow[]>(
    search?.trim() ? `${base}?q=${encodeURIComponent(search.trim())}` : base,
  );
}

export type PosSellerDto = {
  id: string;
  employee_code: string;
  full_name: string;
  username?: string;
};

export async function fetchPosSellers(): Promise<PosSellerDto[]> {
  return apiFetch<PosSellerDto[]>('/pos/sellers/');
}

export type PosCustomerSaleDto = {
  id: string;
  code: string;
  customer?: string;
  total: string;
  discount_amount?: string;
  created_at: string;
  lines: Array<{
    variant?: string | null;
    composite_product?: string | null;
    is_composite?: boolean;
    product_code: string;
    product_name: string;
    size_name: string;
    color_name: string;
    quantity: string;
    unit_price: string;
    discount_percent: string;
    line_total: string;
    seller?: string | null;
    seller_name?: string;
  }>;
};

export async function fetchPosCustomerOpenDocs(customerId: string): Promise<{
  reservations: import('./sales').CustomerReservationDto[];
  quotations: import('./sales').SalesQuotationDto[];
  sales: PosCustomerSaleDto[];
}> {
  return apiFetch(`/pos/customers/${customerId}/open-docs/`);
}

export async function lookupPosSeller(code: string): Promise<PosSellerDto> {
  return apiFetch<PosSellerDto>(`/pos/sellers/lookup/?code=${encodeURIComponent(code)}`);
}

export async function fetchDeliveryOrders(params?: {
  q?: string;
  from?: string;
  to?: string;
  agent?: string;
  status?: string;
}): Promise<DeliveryOrdersResponse> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.agent) sp.set('agent', params.agent);
  if (params?.status) sp.set('status', params.status);
  const qs = sp.toString();
  return apiFetch<DeliveryOrdersResponse>(qs ? `/pos/delivery-orders/?${qs}` : '/pos/delivery-orders/');
}

export async function fetchDeliveryOrder(id: string): Promise<DeliveryOrderDto> {
  return apiFetch<DeliveryOrderDto>(`/pos/delivery-orders/${id}/`);
}

export async function updateDeliveryOrder(
  id: string,
  payload: { delivery_agent?: string | null; delivery_status?: string },
): Promise<DeliveryOrderDto> {
  return apiFetch<DeliveryOrderDto>(`/pos/delivery-orders/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
