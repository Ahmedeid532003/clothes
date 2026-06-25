import { apiFetch } from './client';
import type { CatalogItem } from './inventory';

export type SupplierMetaType = CatalogItem & {
  entity_kind: string;
  entity_kind_label: string;
  description: string;
  is_system: boolean;
};

export type SupplierMetaGroup = CatalogItem & {
  settlement_mode: string;
  settlement_mode_label: string;
  description: string;
  is_system: boolean;
};

export type SupplierMetaCategory = CatalogItem & {
  category_kind: string;
  category_kind_label: string;
  description: string;
  is_system: boolean;
};

export type SupplierMetaDepartment = CatalogItem & {
  dept_kind: string;
  dept_kind_label: string;
  description: string;
  is_system: boolean;
};

export type SupplierMeta = {
  entity_kinds: Array<{ key: string; label: string }>;
  settlement_modes: Array<{ key: string; label: string }>;
  types: SupplierMetaType[];
  groups: SupplierMetaGroup[];
  categories: SupplierMetaCategory[];
  departments: SupplierMetaDepartment[];
};

export async function fetchSupplierMeta(): Promise<SupplierMeta> {
  return apiFetch<SupplierMeta>('/inventory/suppliers/meta/');
}

export type SupplierPaymentMethod =
  | 'cash'
  | 'cheque'
  | 'promissory_note'
  | 'other_papers'
  | 'bank'
  | 'bank_account'
  | 'wallet';

export type SupplierPaymentDto = {
  id: string;
  code: string;
  supplier: string;
  supplier_name: string;
  amount: string;
  payment_date: string;
  payment_method: SupplierPaymentMethod | string;
  status: string;
  notes: string;
  paper_cheque_number?: string;
  paper_bank_account?: string | null;
  paper_due_date?: string | null;
  payment_paper_id?: string | null;
  payment_paper_status?: string | null;
  payment_paper_number?: string | null;
  season?: string | null;
  season_name?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  approved_at: string | null;
};

export async function fetchSupplierPayments(supplierId?: string): Promise<SupplierPaymentDto[]> {
  const url = supplierId
    ? `/inventory/supplier-payments/?supplier=${supplierId}`
    : '/inventory/supplier-payments/';
  return apiFetch<SupplierPaymentDto[]>(url);
}

export type CreateSupplierPaymentPayload = {
  supplier: string;
  amount: string | number;
  payment_date: string;
  payment_method?: SupplierPaymentMethod;
  notes?: string;
  approve?: boolean;
  paper_cheque_number?: string;
  paper_bank_account?: string;
  paper_due_date?: string;
};

function normalizePaymentMethodForApi(method: SupplierPaymentMethod): SupplierPaymentMethod {
  const legacyMap: Partial<Record<SupplierPaymentMethod, SupplierPaymentMethod>> = {
    bank_account: 'bank_account',
    wallet: 'wallet',
  };
  return legacyMap[method] ?? method;
}

export async function createSupplierPayment(
  payload: CreateSupplierPaymentPayload,
): Promise<SupplierPaymentDto> {
  const payment_method = normalizePaymentMethodForApi(payload.payment_method ?? 'cash');
  const body: Record<string, unknown> = {
    supplier: payload.supplier,
    amount: payload.amount,
    payment_date: payload.payment_date,
    payment_method,
    notes: payload.notes ?? '',
  };
  if (payload.paper_cheque_number) body.paper_cheque_number = payload.paper_cheque_number;
  if (payload.paper_bank_account) body.paper_bank_account = payload.paper_bank_account;
  if (payload.paper_due_date) body.paper_due_date = payload.paper_due_date;
  if (payload.approve) body.approve = true;
  return apiFetch<SupplierPaymentDto>('/inventory/supplier-payments/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function approveSupplierPayment(id: string): Promise<SupplierPaymentDto> {
  return apiFetch<SupplierPaymentDto>(`/inventory/supplier-payments/${id}/approve/`, {
    method: 'POST',
  });
}

export async function cancelSupplierPayment(id: string): Promise<SupplierPaymentDto> {
  return apiFetch<SupplierPaymentDto>(`/inventory/supplier-payments/${id}/cancel/`, {
    method: 'POST',
  });
}

export type SupplierWeeklyReportItem = {
  product_id: string;
  product_code: string;
  product_name: string;
  sold_qty: string;
  remaining_qty: string;
  min_threshold: string;
  reorder_percent?: string;
};

export type SupplierWeeklyReportPayload = {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  supplier_whatsapp?: string;
  report_date: string;
  week_start: string;
  week_end: string;
  items: SupplierWeeklyReportItem[];
  indicators: {
    top_sellers: SupplierWeeklyReportItem[];
    near_depletion: SupplierWeeklyReportItem[];
    stagnant: SupplierWeeklyReportItem[];
  };
  totals: {
    sold_qty: string;
    remaining_qty: string;
    item_count: number;
  };
};

export type SupplierWeeklyReportDto = {
  id: string;
  code: string;
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  report_date: string;
  week_start: string;
  week_end: string;
  status: string;
  whatsapp_sent_at: string | null;
  whatsapp_url: string | null;
  payload: SupplierWeeklyReportPayload;
  created_at: string;
};

export async function fetchSupplierWeeklyReports(filters?: {
  supplier?: string;
  report_date?: string;
}): Promise<SupplierWeeklyReportDto[]> {
  const params = new URLSearchParams();
  if (filters?.supplier) params.set('supplier', filters.supplier);
  if (filters?.report_date) params.set('report_date', filters.report_date);
  const q = params.toString();
  return apiFetch<SupplierWeeklyReportDto[]>(
    `/inventory/supplier-weekly-reports/${q ? `?${q}` : ''}`,
  );
}

export async function createSupplierWeeklyReport(supplierId: string): Promise<SupplierWeeklyReportDto> {
  return apiFetch<SupplierWeeklyReportDto>('/inventory/supplier-weekly-reports/', {
    method: 'POST',
    body: JSON.stringify({ supplier: supplierId }),
  });
}

export async function runDailySupplierInventory(): Promise<{
  report_date: string;
  created: number;
  skipped: number;
  errors: string[];
}> {
  return apiFetch('/inventory/supplier-weekly-reports/run-daily/', { method: 'POST' });
}

export async function markSupplierWeeklyReportSent(id: string): Promise<SupplierWeeklyReportDto> {
  return apiFetch<SupplierWeeklyReportDto>(
    `/inventory/supplier-weekly-reports/${id}/mark-sent/`,
    { method: 'POST' },
  );
}
