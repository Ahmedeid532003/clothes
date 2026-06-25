import { apiFetch } from './client';
import type { SaleDto } from './pos';

export type SalesInvoiceDto = Omit<SaleDto, 'lines'> & {
  customer?: string | null;
  customer_name?: string | null;
  customer_tax_registration_number?: string;
  company_name?: string;
  company_phone?: string;
  branch_address?: string;
  subtotal: string;
  discount_amount: string;
  tax_percent: string;
  tax_amount: string;
  commission_amount: string;
  cashier_points: number;
  is_tax_invoice: boolean;
  tax_registration_number: string;
  qr_payload: string;
  payments?: Array<{ id: string; payment_method: string; amount: string; reference: string }>;
  lines: Array<{
    id: string;
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
  }>;
};

export type SaleReturnDto = {
  id: string;
  code: string;
  sale: string;
  sale_code: string;
  branch_name: string;
  customer_name: string | null;
  status: string;
  refund_method: string;
  subtotal: string;
  tax_amount: string;
  total: string;
  reason: string;
  notes: string;
  lines: Array<{
    id: string;
    product_code: string;
    product_name: string;
    size_name: string;
    color_name: string;
    quantity: string;
    line_total: string;
  }>;
  created_at: string;
};

export type DraftSalesLineDto = {
  id: string;
  variant?: string | null;
  composite?: string | null;
  product_code: string;
  product_name: string;
  size_name: string;
  color_name: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  line_total: string;
};

export type SalesQuotationDto = {
  id: string;
  code: string;
  branch_name?: string;
  customer: string | null;
  customer_name: string | null;
  status: string;
  subtotal: string;
  discount_amount: string;
  tax_percent: string;
  tax_amount: string;
  total: string;
  valid_until: string | null;
  notes: string;
  converted_sale: string | null;
  converted_sale_code: string | null;
  lines: DraftSalesLineDto[];
  created_at: string;
};

export type CustomerReservationDto = {
  id: string;
  code: string;
  customer: string;
  customer_name: string;
  status: string;
  subtotal: string;
  discount_amount: string;
  total: string;
  deposit_amount: string;
  deposit_method: string;
  notes: string;
  converted_sale: string | null;
  converted_sale_code: string | null;
  lines: DraftSalesLineDto[];
  created_at: string;
};

export const salesInvoicesApi = {
  list: () => apiFetch<SalesInvoiceDto[]>('/sales/invoices/'),
  get: (id: string) => apiFetch<SalesInvoiceDto>(`/sales/invoices/${id}/`),
  create: (payload: Record<string, unknown>) =>
    apiFetch<SalesInvoiceDto>('/sales/invoices/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const salesReturnsApi = {
  list: () => apiFetch<SaleReturnDto[]>('/sales/returns/'),
  create: (payload: Record<string, unknown>) =>
    apiFetch<SaleReturnDto>('/sales/returns/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const taxInvoicesApi = {
  list: () => apiFetch<SalesInvoiceDto[]>('/sales/tax-invoices/'),
};

export const salesQuotationsApi = {
  list: () => apiFetch<SalesQuotationDto[]>('/sales/quotations/'),
  lookup: (code: string) =>
    apiFetch<SalesQuotationDto>(`/sales/quotations/lookup/?code=${encodeURIComponent(code)}`),
  create: (payload: Record<string, unknown>) =>
    apiFetch<SalesQuotationDto>('/sales/quotations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approve: (id: string) =>
    apiFetch<SalesQuotationDto>(`/sales/quotations/${id}/approve/`, { method: 'POST' }),
  convert: (id: string) =>
    apiFetch<SalesInvoiceDto>(`/sales/quotations/${id}/convert/`, { method: 'POST' }),
};

export const customerReservationsApi = {
  list: () => apiFetch<CustomerReservationDto[]>('/sales/reservations/'),
  lookup: (code: string) =>
    apiFetch<CustomerReservationDto>(`/sales/reservations/lookup/?code=${encodeURIComponent(code)}`),
  create: (payload: Record<string, unknown>) =>
    apiFetch<CustomerReservationDto>('/sales/reservations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  convert: (id: string) =>
    apiFetch<SalesInvoiceDto>(`/sales/reservations/${id}/convert/`, { method: 'POST' }),
};

